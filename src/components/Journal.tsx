import { useEffect, useState, useCallback } from 'react';
import { Eyebrow } from './ui';
import { supabase, type JournalEntry } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';

// Draft uses strings for the inputs; numeric fields are parsed on save.
interface Draft { date: string; bias: string; setup: string; entry: string; exit: string; result: string; lessons: string; }

// 'select' fields render a dropdown; everything else is a text/date input.
type FieldKind = 'text' | 'date' | 'select';
const FIELDS: { key: keyof Draft; label: string; wide?: boolean; kind?: FieldKind; options?: string[]; placeholder?: string }[] = [
  { key: 'date', label: 'Date', kind: 'date' },
  { key: 'bias', label: 'Bias', kind: 'select', options: ['Long', 'Short'], placeholder: 'Select Bias' },
  { key: 'setup', label: 'Setup', wide: true, kind: 'select', options: ['Intraday', 'Scalp', 'Swing'], placeholder: 'Select Setup' },
  { key: 'entry', label: 'Entry' },
  { key: 'exit', label: 'Exit' },
  { key: 'result', label: 'Result' },
  { key: 'lessons', label: 'Lessons Learned', wide: true },
];
const blank: Draft = { date: '', bias: '', setup: '', entry: '', exit: '', result: '', lessons: '' };

// Shared field styling — identical for inputs and selects.
const FIELD_CLASS =
  'w-full mt-2 bg-transparent border-b border-white/15 px-1 py-1.5 text-[14px] text-txt focus:border-gold/60 outline-none transition-colors [color-scheme:dark]';

function toDraft(row: JournalEntry): Draft {
  return {
    date: row.date ?? '',
    bias: row.bias ?? '',
    setup: row.setup ?? '',
    entry: row.entry?.toString() ?? '',
    exit: row.exit?.toString() ?? '',
    result: row.result ?? '',
    lessons: row.lessons ?? '',
  };
}
const numOrNull = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? null : Number(s));

export function Journal() {
  const { user, loading: authLoading } = useAuthContext();
  const [draft, setDraft] = useState<Draft>(blank);
  const [rows, setRows] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // READ — fetch this user's entries (RLS guarantees only their own rows)
  const load = useCallback(async () => {
    if (!user) { setRows([]); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRows((data as JournalEntry[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // CREATE / UPDATE
  async function save() {
    if (!user) { setError('Sign in to save journal entries.'); return; }
    if (!draft.date && !draft.setup) return;
    setBusy(true); setError(null);

    const payload = {
      user_id: user.id,
      date: draft.date || new Date().toISOString().slice(0, 10),
      bias: draft.bias || null,
      setup: draft.setup || null,
      entry: numOrNull(draft.entry),
      exit: numOrNull(draft.exit),
      result: draft.result || null,
      lessons: draft.lessons || null,
    };

    if (editingId) {
      const { error } = await supabase.from('journal_entries').update(payload).eq('id', editingId);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('journal_entries').insert(payload);
      if (error) setError(error.message);
    }

    setBusy(false);
    if (!error) { setDraft(blank); setEditingId(null); load(); }
  }

  // DELETE
  async function remove(id: string) {
    setError(null);
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) setError(error.message);
    else load();
  }

  function edit(row: JournalEntry) {
    setEditingId(row.id);
    setDraft(toDraft(row));
  }
  function cancelEdit() { setEditingId(null); setDraft(blank); }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">Trade Journal</h3>
        <Eyebrow>{editingId ? 'Editing' : 'Record'}</Eyebrow>
      </div>

      {/* Not signed in: clear gate, no fake data */}
      {!authLoading && !user && (
        <div className="card p-6 text-[13px] text-txt2/85 leading-relaxed">
          Sign in to create and view your trade journal. Your entries are private to your account.
        </div>
      )}

      {user && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.wide ? 'col-span-2 md:col-span-3' : ''}>
                <label className="text-[10px] uppercase tracking-[0.16em] text-muted">{f.label}</label>
                {f.kind === 'select' ? (
                  <select
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    className={FIELD_CLASS}
                  >
                    <option value="" disabled className="bg-bg text-muted">{f.placeholder}</option>
                    {f.options!.map((opt) => (
                      <option key={opt} value={opt} className="bg-bg text-txt">{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.kind ?? 'text'}
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    className={FIELD_CLASS}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={busy}
              className="font-sora font-700 text-[12px] tracking-wide text-bg bg-gradient-to-r from-goldBright to-gold rounded-lg px-5 py-2.5 transition-all hover:opacity-90 disabled:opacity-50">
              {busy ? 'Saving…' : editingId ? 'Update Entry' : 'Add Entry'}
            </button>
            {editingId && (
              <button onClick={cancelEdit}
                className="text-[12px] text-muted hover:text-txt border border-white/10 rounded-lg px-4 py-2.5 transition-colors">
                Cancel
              </button>
            )}
          </div>

          {error && <div className="mt-3 text-[12px] text-bear">{error}</div>}

          {loading ? (
            <div className="mt-6 text-[12px] text-muted">Loading entries…</div>
          ) : rows.length > 0 ? (
            <div className="mt-6">
              {rows.map((e) => (
                <div key={e.id} className="py-4 border-b border-white/[0.04] text-[13px] group">
                  <div className="flex gap-3 flex-wrap text-txt2 items-center">
                    <span className="text-gold font-600">{e.date || '—'}</span>
                    <span>{e.bias}</span>
                    <span className="text-muted">{e.setup}</span>
                    <span className="tnum">In {e.entry ?? '—'} → Out {e.exit ?? '—'}</span>
                    <span className="ml-auto font-600" style={{ color: (e.result ?? '').includes('-') ? '#FF4D6D' : '#00D98B' }}>{e.result}</span>
                    <span className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => edit(e)} className="text-[11px] text-greenSoft hover:underline">Edit</button>
                      <button onClick={() => remove(e.id)} className="text-[11px] text-bear hover:underline">Delete</button>
                    </span>
                  </div>
                  {e.lessons && <div className="text-muted mt-1.5">{e.lessons}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 text-[12px] text-muted/60">No entries yet. Add your first trade above.</div>
          )}

          <div className="text-[10px] text-muted/55 mt-4">Saved securely to your account via Supabase. Only you can see these entries.</div>
        </>
      )}
    </section>
  );
}
