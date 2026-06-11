import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { supabase, type JournalEntry } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';

// ── Per-trade computed P/L from raw fields (client-side) ──────────────────
interface TradePL {
  netPl: number;
  grossPl: number;
  rrr: number | null;
  returnPct: number | null;
}
function tradePL(r: JournalEntry): TradePL | null {
  const entry = r.entry_price ?? r.entry;
  const exit = r.exit_price ?? r.exit;
  const qty = r.quantity;
  const dir = (r.direction ?? r.bias) === 'Long' ? 1 : (r.direction ?? r.bias) === 'Short' ? -1 : 0;
  if (entry == null || exit == null || qty == null || dir === 0) return null;

  const grossPl = (exit - entry) * qty * dir;
  const netPl = grossPl - (r.fees ?? 0);

  let rrr: number | null = null;
  if (r.stop_loss != null && r.take_profit != null) {
    const risk = Math.abs(entry - r.stop_loss);
    const reward = Math.abs(r.take_profit - entry);
    if (risk > 0) rrr = reward / risk;
  }
  let returnPct: number | null = null;
  if (entry * qty !== 0) returnPct = (netPl / Math.abs(entry * qty)) * 100;

  return { netPl, grossPl, rrr, returnPct };
}

interface Stats {
  totalTrades: number;
  closedTrades: number;
  winRate: number | null;
  netReturnDollar: number;
  netReturnPct: number | null;
  avgPl: number | null;
  avgR: number | null;
  profitFactor: number | null;
}
interface CurvePoint { i: number; cum: number; }

function round(x: number, p = 2) { return Math.round(x * 10 ** p) / 10 ** p; }

export function Reports() {
  const { user, loading: authLoading } = useAuthContext();
  const [rows, setRows] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setRows([]); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('date', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true });
    if (error) setError(error.message);
    else setRows((data as JournalEntry[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const { stats, curve } = useMemo(() => {
    const pls = rows.map(tradePL).filter((x): x is TradePL => x !== null);
    const closed = pls.length;
    const wins = pls.filter((p) => p.netPl > 0);
    const losses = pls.filter((p) => p.netPl < 0);

    const grossWin = wins.reduce((a, p) => a + p.netPl, 0);
    const grossLoss = Math.abs(losses.reduce((a, p) => a + p.netPl, 0));
    const netReturnDollar = pls.reduce((a, p) => a + p.netPl, 0);

    const returnPcts = pls.map((p) => p.returnPct).filter((x): x is number => x !== null);
    const netReturnPct = returnPcts.length ? returnPcts.reduce((a, b) => a + b, 0) : null;

    const rrrs = rows.map(tradePL).filter((x): x is TradePL => x !== null && x.rrr !== null).map((p) => p.rrr as number);
    const avgR = rrrs.length ? rrrs.reduce((a, b) => a + b, 0) / rrrs.length : null;

    const s: Stats = {
      totalTrades: rows.length,
      closedTrades: closed,
      winRate: closed > 0 ? (wins.length / closed) * 100 : null,
      netReturnDollar: round(netReturnDollar),
      netReturnPct: netReturnPct === null ? null : round(netReturnPct),
      avgPl: closed > 0 ? round(netReturnDollar / closed) : null,
      avgR: avgR === null ? null : round(avgR),
      profitFactor: grossLoss > 0 ? round(grossWin / grossLoss) : (grossWin > 0 ? null : null),
    };

    let cum = 0;
    const c: CurvePoint[] = pls.map((p, i) => { cum += p.netPl; return { i: i + 1, cum: round(cum) }; });

    return { stats: s, curve: c };
  }, [rows]);

  if (authLoading) return <div className="text-[12px] text-muted">Checking session…</div>;
  if (!user) {
    return (
      <div className="card p-6 text-[13px] text-txt2/85 leading-relaxed">
        Sign in to view your performance reports. Reports are generated from your private trade journal.
      </div>
    );
  }
  if (loading) return <div className="text-[12px] text-muted">Loading reports…</div>;
  if (error) return <div className="text-[12px] text-bear">{error}</div>;

  const plColor = (v: number | null) => (v === null ? '#C5CCD8' : v >= 0 ? '#00D98B' : '#FF4D6D');
  const fmtUsd = (v: number | null) => (v === null ? '–n/a–' : `${v >= 0 ? '' : '-'}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const fmtPct = (v: number | null) => (v === null ? '–n/a–' : `${round(v)}%`);

  return (
    <div className="space-y-8">
      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Net Return %" value={fmtPct(stats.netReturnPct)} color={plColor(stats.netReturnPct)} />
        <Kpi label="Win Rate" value={stats.winRate === null ? '–n/a–' : `${round(stats.winRate, 1)}%`}
          color={stats.winRate === null ? undefined : stats.winRate >= 50 ? '#00D98B' : '#FF4D6D'} />
        <Kpi label="Avg P/L" value={fmtUsd(stats.avgPl)} color={plColor(stats.avgPl)} />
        <Kpi label="Profit Factor" value={stats.profitFactor === null ? '–n/a–' : stats.profitFactor.toFixed(2)}
          color={stats.profitFactor === null ? undefined : stats.profitFactor >= 1 ? '#00D98B' : '#FF4D6D'} />
        <Kpi label="Total Trades" value={stats.totalTrades.toString()} />
      </div>

      {/* ── Equity Curve (recharts) ── */}
      <div className="surface surface-lit p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="eyebrow">Equity Curve</div>
            <div className="text-[11px] text-muted mt-1">Cumulative Net P/L across {stats.closedTrades} closed trades</div>
          </div>
          <span className="font-sora font-800 text-[18px] tnum" style={{ color: plColor(stats.netReturnDollar) }}>
            {fmtUsd(stats.netReturnDollar)}
          </span>
        </div>
        {curve.length < 2 ? (
          <div className="text-[12px] text-muted/60 py-12 text-center">Add at least two closed trades to render the equity curve.</div>
        ) : (
          <EquityCurveChart data={curve} />
        )}
      </div>

      {/* ── Journal Summary table ── */}
      <div className="surface surface-lit p-5 md:p-6">
        <div className="eyebrow mb-4">Journal Summary</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.14em] text-muted/70 border-b border-white/[0.08]">
                <Th>Return %</Th><Th>Return $</Th><Th>Avg P/L</Th><Th>Avg R</Th>
                <Th>Profit Factor</Th><Th>Winrate</Th><Th>Trades #</Th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.04]">
                <Td color={plColor(stats.netReturnPct)}>{fmtPct(stats.netReturnPct)}</Td>
                <Td color={plColor(stats.netReturnDollar)}>{fmtUsd(stats.netReturnDollar)}</Td>
                <Td color={plColor(stats.avgPl)}>{fmtUsd(stats.avgPl)}</Td>
                <Td>{stats.avgR === null ? '–n/a–' : `${stats.avgR}:1`}</Td>
                <Td color={stats.profitFactor === null ? undefined : stats.profitFactor >= 1 ? '#00D98B' : '#FF4D6D'}>
                  {stats.profitFactor === null ? '–n/a–' : stats.profitFactor.toFixed(2)}
                </Td>
                <Td>{stats.winRate === null ? '–n/a–' : `${round(stats.winRate, 1)}%`}</Td>
                <Td>{stats.closedTrades} / {stats.totalTrades}</Td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-muted/55 mt-4">All figures computed client-side from your journal. “Trades #” shows closed / total.</div>
      </div>
    </div>
  );
}

function EquityCurveChart({ data }: { data: CurvePoint[] }) {
  const last = data[data.length - 1]?.cum ?? 0;
  const positive = last >= 0;
  const stroke = positive ? '#00D98B' : '#FF4D6D';
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eqPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D98B" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#00D98B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="eqNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4D6D" stopOpacity={0} />
              <stop offset="100%" stopColor="#FF4D6D" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="i" stroke="#8A93A6" tick={{ fontSize: 11, fill: '#8A93A6' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
          <YAxis stroke="#8A93A6" tick={{ fontSize: 11, fill: '#8A93A6' }} tickLine={false} axisLine={false}
            tickFormatter={(v) => `$${v}`} width={64} />
          <Tooltip
            contentStyle={{ background: '#0D1218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: '#8A93A6' }}
            itemStyle={{ color: stroke }}
            formatter={(v) => [`$${v}`, 'Cumulative']}
            labelFormatter={(l) => `Trade ${l}`}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="cum" stroke={stroke} strokeWidth={2}
            fill={positive ? 'url(#eqPos)' : 'url(#eqNeg)'} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1.5">{label}</div>
      <div className="font-sora font-800 text-[22px] tnum" style={{ color: color ?? '#FFFFFF' }}>{value}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-500 py-2 pr-4 whitespace-nowrap">{children}</th>;
}
function Td({ children, color }: { children: React.ReactNode; color?: string }) {
  return <td className="py-3 pr-4 font-sora font-700 tnum whitespace-nowrap" style={{ color: color ?? '#FFFFFF' }}>{children}</td>;
}
