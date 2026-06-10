import type { ReactNode } from 'react';
import type { Bias } from '../data/intel';

export function biasColor(b: Bias): string {
  if (b === 'Strong Bullish' || b === 'Bullish') return '#00D98B';
  if (b === 'Strong Bearish' || b === 'Bearish') return '#FF4D6D';
  return '#FFC857';
}

/** A large open intelligence surface — top-lit, hairline-bordered, not a card. */
export function Surface({ children, className = '', lit = true }: { children: ReactNode; className?: string; lit?: boolean }) {
  return <section className={`surface ${lit ? 'surface-lit' : ''} ${className}`}>{children}</section>;
}

/** Backwards-compat alias so existing components keep working. */
export const Panel = ({ children, className = '', glow }: { children: ReactNode; className?: string; glow?: boolean }) => (
  <Surface lit={!!glow} className={className}>{children}</Surface>
);

/** Analyst section header: eyebrow + optional right-side accent. */
export function SectionLabel({ children, accent }: { children: ReactNode; accent?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">{children}</h3>
      {accent}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

export function BiasPill({ bias }: { bias: Bias }) {
  const c = biasColor(bias);
  return (
    <span className="text-[10px] font-700 px-2.5 py-[3px] rounded-full tracking-wide uppercase"
      style={{ color: c, background: `${c}14`, border: `1px solid ${c}33` }}>
      {bias}
    </span>
  );
}

export function Confidence({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-20 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: 'linear-gradient(90deg,#A77A00,#FFD700)' }} />
      </div>
      <span className="text-[11px] tnum text-muted">{value}%</span>
    </div>
  );
}
