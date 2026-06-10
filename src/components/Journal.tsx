import { useState } from 'react';
import { Eyebrow } from './ui';

interface Entry { date: string; bias: string; setup: string; entry: string; exit: string; result: string; lessons: string; }
const FIELDS: { key: keyof Entry; label: string; wide?: boolean }[] = [
  { key: 'date', label: 'Date' }, { key: 'bias', label: 'Bias' },
  { key: 'setup', label: 'Setup', wide: true }, { key: 'entry', label: 'Entry' },
  { key: 'exit', label: 'Exit' }, { key: 'result', label: 'Result' },
  { key: 'lessons', label: 'Lessons Learned', wide: true },
];
const blank: Entry = { date: '', bias: '', setup: '', entry: '', exit: '', result: '', lessons: '' };

export function Journal() {
  const [draft, setDraft] = useState<Entry>(blank);
  const [entries, setEntries] = useState<Entry[]>([]);
  const add = () => { if (!draft.date && !draft.setup) return; setEntries([draft, ...entries]); setDraft(blank); };
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">Trade Journal</h3>
        <Eyebrow>Record</Eyebrow>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.wide ? 'col-span-2 md:col-span-3' : ''}>
            <label className="text-[10px] uppercase tracking-[0.16em] text-muted">{f.label}</label>
            <input value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              className="w-full mt-2 bg-transparent border-b border-white/15 px-1 py-1.5 text-[14px] text-txt focus:border-gold/60 outline-none transition-colors" />
          </div>
        ))}
      </div>
      <button onClick={add}
        className="font-sora font-700 text-[12px] tracking-wide text-bg bg-gradient-to-r from-goldBright to-gold rounded-lg px-5 py-2.5 transition-all hover:opacity-90">
        Add Entry
      </button>
      {entries.length > 0 && (
        <div className="mt-6">
          {entries.map((e, i) => (
            <div key={i} className="py-4 border-b border-white/[0.04] text-[13px]">
              <div className="flex gap-3 flex-wrap text-txt2 items-center">
                <span className="text-gold font-600">{e.date || '—'}</span>
                <span>{e.bias}</span><span className="text-muted">{e.setup}</span>
                <span className="tnum">In {e.entry} → Out {e.exit}</span>
                <span className="ml-auto font-600" style={{ color: e.result.includes('-') ? '#FF4D6D' : '#00D98B' }}>{e.result}</span>
              </div>
              {e.lessons && <div className="text-muted mt-1.5">{e.lessons}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="text-[10px] text-muted/55 mt-4">Session-only entries. Connect storage later for persistence.</div>
    </section>
  );
}
