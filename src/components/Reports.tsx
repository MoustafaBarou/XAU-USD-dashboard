import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { supabase, type JournalEntry } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';

// ── Per-trade metrics computed from raw fields (client-side only) ──────────
interface TradeMetrics {
  grossPl: number;
  netPl: number;
  rMultiple: number | null;
  returnPct: number | null;
}

function computeTrade(r: JournalEntry): TradeMetrics | null {
  const entry = r.entry_price ?? r.entry;
  const exit = r.exit_price ?? r.exit;
  const qty = r.quantity;
  const dir = (r.direction ?? r.bias) === 'Long' ? 'Long' : (r.direction ?? r.bias) === 'Short' ? 'Short' : null;
  if (entry == null || exit == null || qty == null || dir == null) return null;

  // Gross P/L per spec
  const grossPl = dir === 'Long'
    ? (exit - entry) * qty
    : (entry - exit) * qty;

  // Net P/L = gross - fees
  const netPl = grossPl - (r.fees ?? 0);

  // R-Multiple per spec: risk from stop_loss, reward = |exit - entry|.
  // Signed so losing trades read negative.
  let rMultiple: number | null = null;
  if (r.stop_loss != null) {
    const risk = Math.abs(entry - r.stop_loss);
    if (risk > 0) {
      const reward = Math.abs(exit - entry);
      const sign = grossPl >= 0 ? 1 : -1;
      rMultiple = (reward / risk) * sign;
    }
  }

  // Return % on notional
  let returnPct: number | null = null;
  if (entry * qty !== 0) returnPct = (netPl / Math.abs(entry * qty)) * 100;

  return { grossPl, netPl, rMultiple, returnPct };
}

interface Stats {
  totalTrades: number;
  closedTrades: number;
  winRate: number | null;
  netPl: number;
  grossPl: number;
  profitFactor: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  avgPl: number | null;
  avgR: number | null;
  totalReturnPct: number | null;
}
interface CurvePoint { i: number; cum: number; }

const round = (x: number, p = 2) => Math.round(x * 10 ** p) / 10 ** p;

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
    const m = rows.map(computeTrade).filter((x): x is TradeMetrics => x !== null);
    const closed = m.length;
    const wins = m.filter((t) => t.netPl > 0);
    const losses = m.filter((t) => t.netPl < 0);

    const netPl = m.reduce((a, t) => a + t.netPl, 0);
    const grossPl = m.reduce((a, t) => a + t.grossPl, 0);
    const grossWin = wins.reduce((a, t) => a + t.netPl, 0);
    const grossLossAbs = Math.abs(losses.reduce((a, t) => a + t.netPl, 0));

    const rPcts = m.map((t) => t.returnPct).filter((x): x is number => x !== null);
    const rMs = m.map((t) => t.rMultiple).filter((x): x is number => x !== null);

    const s: Stats = {
      totalTrades: rows.length,
      closedTrades: closed,
      winRate: closed > 0 ? (wins.length / closed) * 100 : null,
      netPl: round(netPl),
      grossPl: round(grossPl),
      profitFactor: grossLossAbs > 0 ? round(grossWin / grossLossAbs) : null,
      avgWin: wins.length ? round(grossWin / wins.length) : null,
      avgLoss: losses.length ? round(-grossLossAbs / losses.length) : null,
      avgPl: closed > 0 ? round(netPl / closed) : null,
      avgR: rMs.length ? round(rMs.reduce((a, b) => a + b, 0) / rMs.length) : null,
      totalReturnPct: rPcts.length ? round(rPcts.reduce((a, b) => a + b, 0)) : null,
    };

    let cum = 0;
    const c: CurvePoint[] = m.map((t, i) => { cum += t.netPl; return { i: i + 1, cum: round(cum) }; });
    return { stats: s, curve: c };
  }, [rows]);

  if (authLoading) return <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Checking session…</div>;
  if (!user) {
    return (
      <div className="card p-6 text-[13px] text-txt2/85 leading-relaxed">
        Sign in to view performance reports generated from your private trade journal.
      </div>
    );
  }
  if (loading) return <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Loading reports…</div>;
  if (error) return <div className="text-[11px] uppercase tracking-[0.14em] text-bear">{error}</div>;

  const plColor = (v: number | null) => (v === null ? '#C5CCD8' : v >= 0 ? '#00D98B' : '#FF4D6D');
  const fmtUsd = (v: number | null) => (v === null ? '–n/a–' : `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const fmtPct = (v: number | null) => (v === null ? '–n/a–' : `${round(v)}%`);

  return (
    <div className="space-y-8">
      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Net Return" value={fmtUsd(stats.netPl)} color={plColor(stats.netPl)} />
        <Kpi label="Win Rate" value={stats.winRate === null ? '–n/a–' : `${round(stats.winRate, 1)}%`}
          color={stats.winRate === null ? undefined : stats.winRate >= 50 ? '#00D98B' : '#FF4D6D'} />
        <Kpi label="Avg P/L" value={fmtUsd(stats.avgPl)} color={plColor(stats.avgPl)} />
        <Kpi label="Profit Factor" value={stats.profitFactor === null ? '–n/a–' : stats.profitFactor.toFixed(2)}
          color={stats.profitFactor === null ? undefined : stats.profitFactor >= 1 ? '#00D98B' : '#FF4D6D'} />
        <Kpi label="Total Trades" value={stats.totalTrades.toString()} />
      </div>

      {/* ── Equity Curve ── */}
      <div className="surface surface-lit p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="eyebrow">Equity Curve</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted mt-1">Cumulative Net P/L · <span className="tnum">{stats.closedTrades}</span> closed</div>
          </div>
          <span className="font-sora font-800 text-[18px] tnum" style={{ color: plColor(stats.netPl) }}>
            {fmtUsd(stats.netPl)}
          </span>
        </div>
        {curve.length < 2 ? (
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted/60 py-12 text-center">Add ≥2 closed trades to render the curve</div>
        ) : (
          <EquityCurveChart data={curve} />
        )}
      </div>

      {/* ── Extended performance grid ── */}
      <div className="surface surface-lit p-5 md:p-6">
        <div className="eyebrow mb-4">Performance Snapshot</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Gross P/L" value={fmtUsd(stats.grossPl)} color={plColor(stats.grossPl)} />
          <Metric label="Net P/L" value={fmtUsd(stats.netPl)} color={plColor(stats.netPl)} />
          <Metric label="Average Win" value={fmtUsd(stats.avgWin)} color="#00D98B" />
          <Metric label="Average Loss" value={fmtUsd(stats.avgLoss)} color="#FF4D6D" />
          <Metric label="Average R" value={stats.avgR === null ? '–n/a–' : `${stats.avgR}R`} color={plColor(stats.avgR)} />
          <Metric label="Total Return %" value={fmtPct(stats.totalReturnPct)} color={plColor(stats.totalReturnPct)} />
          <Metric label="Win Rate" value={stats.winRate === null ? '–n/a–' : `${round(stats.winRate, 1)}%`} />
          <Metric label="Trades · Closed / Total" value={`${stats.closedTrades} / ${stats.totalTrades}`} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted/55 mt-4">Computed client-side from your journal · no data leaves your account</div>
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
function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1.5">{label}</div>
      <div className="font-sora font-700 text-[17px] tnum" style={{ color: color ?? '#FFFFFF' }}>{value}</div>
    </div>
  );
}
