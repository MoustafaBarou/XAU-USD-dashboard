import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, type JournalEntry } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';

const INSTRUMENTS = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'US30', 'NAS100'];
const SETUPS = ['Intraday', 'Scalp', 'Swing'];

interface Draft {
  date: string;          // entry datetime-local
  instrument: string;
  setup: string;
  direction: string;     // 'Long' | 'Short'
  entry_price: string;
  quantity: string;
  stop_loss: string;
  take_profit: string;
  exit_date: string;     // datetime-local
  exit_price: string;
  fees: string;
  notes: string;
}

const blank: Draft = {
  date: '', instrument: '', setup: '', direction: '',
  entry_price: '', quantity: '', stop_loss: '', take_profit: '',
  exit_date: '', exit_price: '', fees: '', notes: '',
};

const numOrNull = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? null : Number(s));
const num = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? NaN : Number(s));

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (x: number) => x.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ── Auto-calculations (client-side only; not stored as columns) ───────────
interface Calcs { grossPl: number | null; netPl: number | null; rrr: number | null; returnPct: number | null; }
function computeCalcs(d: Draft): Calcs {
  const entry = num(d.entry_price), exit = num(d.exit_price), qty = num(d.quantity);
  const sl = num(d.stop_loss), tp = num(d.take_profit), fees = num(d.fees);
  const dir = d.direction === 'Long' ? 1 : d.direction === 'Short' ? -1 : 0;

  let grossPl: number | null = null;
  if (!isNaN(entry) && !isNaN(exit) && !isNaN(qty) && dir !== 0) grossPl = (exit - entry) * qty * dir;

  let netPl: number | null = null;
  if (grossPl !== null) netPl = grossPl - (isNaN(fees) ? 0 : fees);

  let rrr: number | null = null;
  if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp) && dir !== 0) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk > 0) rrr = reward / risk;
  }

  let returnPct: number | null = null;
  if (netPl !== null && !isNaN(entry) && !isNaN(qty) && entry * qty !== 0) {
    returnPct = (netPl / Math.abs(entry * qty)) * 100;
  }

  const r = (x: number | null, p = 2) => (x === null ? null : Math.round(x * 10 ** p) / 10 ** p);
  return { grossPl: r(grossPl), netPl: r(netPl), rrr: r(rrr), returnPct: r(returnPct) };
}

function toDraft(row: JournalEntry): Draft {
  return {
    date: toLocalInput(row.date),
    instrument: row.instrument ?? '',
    setup: row.setup ?? '',
    direction: row.direction ?? row.bias ?? '',
    entry_price: (row.entry_price ?? row.entry)?.toString() ?? '',
    quantity: row.quantity?.toString() ?? '',
    stop_loss: row.stop_loss?.toString() ?? '',
    take_profit: row.take_profit?.toString() ?? '',
    exit_date: toLocalInput(row.exit_date),
    exit_price: (row.exit_price ?? row.exit)?.toString() ?? '',
    fees: row.fees?.toString() ?? '',
    notes: row.notes ?? row.lessons ?? '',
  };
}

const FIELD =
  'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-[14px] text-txt placeholder:text-muted/50 focus:border-gold/50 outline-none transition-colors [color-scheme:dark]';
const LABEL = 'text-[10px] uppercase tracking-[0.16em] text-muted mb-1.5 block';

export function Journal() {
  const { user, loading: authLoading } = useAuthContext();
  const [draft, setDraft] = useState<Draft>(blank);
  const [rows, setRows] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const calcs = useMemo(() => computeCalcs(draft), [draft]);
  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  // READ — RLS guarantees only the signed-in user's rows
  const load = useCallback(async () => {
    if (!user) { setRows([]); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRows((data as JournalEntry[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // CREATE / UPDATE
  async function save() {
    if (!user) { setError('Sign in to save trades.'); return; }
    if (!draft.instrument && !draft.entry_price) { setError('Add at least an instrument or entry price.'); return; }
    setBusy(true); setError(null);

    const payload = {
      user_id: user.id,
      date: toIso(draft.date) ?? new Date().toISOString(),
      bias: draft.direction || null,          // legacy mirror
      setup: draft.setup || null,
      entry: numOrNull(draft.entry_price),     // legacy mirror
      exit: numOrNull(draft.exit_price),       // legacy mirror
      result: calcs.netPl !== null ? calcs.netPl.toString() : null,
      lessons: draft.notes || null,            // legacy mirror
      instrument: draft.instrument || null,
      direction: draft.direction || null,
      entry_price: numOrNull(draft.entry_price),
      exit_price: numOrNull(draft.exit_price),
      quantity: numOrNull(draft.quantity),
      stop_loss: numOrNull(draft.stop_loss),
      take_profit: numOrNull(draft.take_profit),
      fees: numOrNull(draft.fees),
      exit_date: toIso(draft.exit_date),
      notes: draft.notes || null,
    };

    const res = editingId
      ? await supabase.from('journal_entries').update(payload).eq('id', editingId)
      : await supabase.from('journal_entries').insert(payload);
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    setDraft(blank); setEditingId(null); load();
  }

  // DELETE
  async function remove(id: string) {
    setError(null);
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) setError(error.message); else load();
  }

  function edit(row: JournalEntry) { setEditingId(row.id); setDraft(toDraft(row)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function cancel() { setEditingId(null); setDraft(blank); }

  if (authLoading) return <div className="text-[12px] text-muted">Checking session…</div>;
  if (!user) {
    return (
      <div className="card p-6 text-[13px] text-txt2/85 leading-relaxed">
        Sign in to create and view your trade journal. Your trades are private to your account.
      </div>
    );
  }

  const plColor = (v: number | null) => (v === null ? '#8A93A6' : v >= 0 ? '#00D98B' : '#FF4D6D');
  const fmt = (v: number | null, suffix = '') => (v === null ? '–n/a–' : `${v}${suffix}`);

  return (
    <div>
      {/* ── New / Edit Trade card ── */}
      <div className="surface surface-lit p-6 md:p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-gold">★</span>
            <h3 className="font-sora font-800 text-[18px] text-txt tracking-wide">{editingId ? 'Edit Trade' : 'New Trade'}</h3>
          </div>
          {editingId && <button onClick={cancel} className="text-muted hover:text-txt text-[18px] leading-none">×</button>}
        </div>

        {/* GENERAL TRADE DATA */}
        <SectionTitle>General Trade Data</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className={LABEL}>Entry Date</label>
            <input type="datetime-local" value={draft.date} onChange={(e) => set('date', e.target.value)} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Instrument</label>
            <select value={draft.instrument} onChange={(e) => set('instrument', e.target.value)} className={FIELD}>
              <option value="" disabled className="bg-bg">Select Instrument</option>
              {INSTRUMENTS.map((s) => <option key={s} value={s} className="bg-bg">{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Setup</label>
            <select value={draft.setup} onChange={(e) => set('setup', e.target.value)} className={FIELD}>
              <option value="" disabled className="bg-bg">Select Setup</option>
              {SETUPS.map((s) => <option key={s} value={s} className="bg-bg">{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Direction</label>
            <div className="grid grid-cols-2 rounded-lg overflow-hidden border border-white/10">
              {['Long', 'Short'].map((dir) => {
                const on = draft.direction === dir;
                const col = dir === 'Long' ? '#00D98B' : '#FF4D6D';
                return (
                  <button key={dir} type="button" onClick={() => set('direction', dir)}
                    className="py-2.5 text-[13px] font-700 font-sora tracking-wide transition-all"
                    style={on ? { background: `${col}1f`, color: col, boxShadow: `inset 0 0 0 1px ${col}55` } : { color: '#8A93A6' }}>
                    {dir}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* TRADE ENTRY + TRADE EXIT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <SectionTitle>Trade Entry</SectionTitle>
            <div className="grid grid-cols-1 gap-4 mb-6">
              <Num label="Entry Price" v={draft.entry_price} on={(v) => set('entry_price', v)} />
              <Num label="Quantity" v={draft.quantity} on={(v) => set('quantity', v)} />
              <Num label="Stop Loss" v={draft.stop_loss} on={(v) => set('stop_loss', v)} />
              <Num label="Take Profit" v={draft.take_profit} on={(v) => set('take_profit', v)} />
            </div>
          </div>
          <div>
            <SectionTitle>Trade Exit</SectionTitle>
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div>
                <label className={LABEL}>Exit Date</label>
                <input type="datetime-local" value={draft.exit_date} onChange={(e) => set('exit_date', e.target.value)} className={FIELD} />
              </div>
              <Num label="Exit Price" v={draft.exit_price} on={(v) => set('exit_price', v)} />
              <Num label="Fees" v={draft.fees} on={(v) => set('fees', v)} />
            </div>
          </div>
        </div>

        {/* RESULTS — auto-calculated */}
        <SectionTitle>Results</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Result label="Gross P/L" value={fmt(calcs.grossPl)} color={plColor(calcs.grossPl)} />
          <Result label="Net P/L" value={fmt(calcs.netPl)} color={plColor(calcs.netPl)} />
          <Result label="RRR" value={calcs.rrr === null ? '–n/a–' : `1:${calcs.rrr}`} />
          <Result label="Return" value={fmt(calcs.returnPct, '%')} color={plColor(calcs.returnPct)} />
        </div>

        {/* NOTES */}
        <SectionTitle>Personal Notes</SectionTitle>
        <textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} rows={4}
          placeholder="Thesis, execution quality, emotions, lessons…"
          className={`${FIELD} resize-y min-h-[110px] mb-5`} />

        {error && <div className="mb-4 text-[12px] text-bear">{error}</div>}

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy}
            className="font-sora font-700 text-[13px] tracking-wide text-bg bg-gradient-to-r from-goldBright to-gold rounded-lg px-6 py-2.5 transition-all hover:opacity-90 disabled:opacity-50">
            {busy ? 'Saving…' : editingId ? 'Update Trade' : 'Save Trade'}
          </button>
          {editingId && (
            <button onClick={cancel} className="text-[13px] text-muted hover:text-txt border border-white/10 rounded-lg px-5 py-2.5 transition-colors">Cancel</button>
          )}
        </div>
      </div>

      {/* ── Trade history ── */}
      <div className="mt-8">
        <div className="eyebrow mb-4">Trade History</div>
        {loading ? (
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Loading trades…</div>
        ) : rows.length === 0 ? (
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted/60">No trades yet · log your first above</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const net = r.result !== null && r.result !== '' && !isNaN(Number(r.result)) ? Number(r.result) : null;
              const dir = r.direction ?? r.bias;
              const dirCol = dir === 'Long' ? '#00D98B' : dir === 'Short' ? '#FF4D6D' : '#8A93A6';
              const when = r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
              return (
                <div key={r.id} className="card card-hover p-4 group transition-colors">
                  <div className="flex items-center gap-3 flex-wrap text-[13px]">
                    <span className="font-sora font-700 text-[14px] text-txt w-20">{r.instrument ?? '—'}</span>
                    {dir && <span className="text-[10px] font-700 px-2 py-[2px] rounded-full uppercase" style={{ color: dirCol, background: `${dirCol}1a`, border: `1px solid ${dirCol}40` }}>{dir}</span>}
                    {r.setup && <span className="text-[11px] text-muted">{r.setup}</span>}
                    <span className="text-[11px] text-muted tnum">{when}</span>
                    <span className="tnum text-txt2"><span className="text-[10px] uppercase tracking-[0.12em] text-muted/60">In</span> {r.entry_price ?? r.entry ?? '—'} → <span className="text-[10px] uppercase tracking-[0.12em] text-muted/60">Out</span> {r.exit_price ?? r.exit ?? '—'}</span>
                    <span className="ml-auto font-sora font-700 tnum" style={{ color: plColor(net) }}>
                      {net === null ? '—' : (net >= 0 ? '+' : '') + net}
                    </span>
                    <span className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => edit(r)} className="text-[11px] text-greenSoft hover:underline">Edit</button>
                      <button onClick={() => remove(r.id)} className="text-[11px] text-bear hover:underline">Delete</button>
                    </span>
                  </div>
                  {(r.notes ?? r.lessons) && <div className="text-muted text-[12px] mt-1.5">{r.notes ?? r.lessons}</div>}
                </div>
              );
            })}
          </div>
        )}
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted/55 mt-4">Saved securely to your account · only you can see these trades</div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="font-sora font-700 text-[11px] uppercase tracking-[0.16em] text-txt mb-3">{children}</div>;
}

function Num({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input type="number" inputMode="decimal" value={v} onChange={(e) => on(e.target.value)} className={FIELD} placeholder="0.00" />
    </div>
  );
}

function Result({ label, value, color = '#C5CCD8' }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-[9px] uppercase tracking-[0.14em] text-muted mb-1">{label}</div>
      <div className="font-sora font-700 text-[15px] tnum" style={{ color }}>{value}</div>
    </div>
  );
}
