import type { ReactNode } from 'react';
import { Eyebrow } from '../components/ui';

/** Shared page header: title + description, AURUM styling. */
export function PageHeader({ title, description, badge }: { title: string; description: string; badge?: ReactNode }) {
  return (
    <header className="pt-8 pb-10">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="font-sora font-800 gold-text tracking-tight leading-none" style={{ fontSize: 'clamp(36px,5vw,64px)' }}>{title}</h1>
        {badge}
      </div>
      <p className="text-txt2 mt-5 max-w-2xl leading-relaxed" style={{ fontSize: 'clamp(15px,1.5vw,18px)' }}>{description}</p>
    </header>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="font-sora font-700 text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full"
      style={{ color: '#00E5FF', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.3)' }}>
      Coming Soon
    </span>
  );
}

/**
 * Professional placeholder page in AURUM styling: title, description,
 * Coming Soon badge, and a quiet preview of what the module will contain.
 */
export function PagePlaceholder({
  title, description, features,
}: { title: string; description: string; features: { label: string; note: string }[] }) {
  return (
    <div>
      <PageHeader title={title} description={description} badge={<ComingSoonBadge />} />
      <div className="rule my-10" />
      <Eyebrow>Planned in this module</Eyebrow>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-8 mt-6 max-w-4xl">
        {features.map((f) => (
          <div key={f.label} className="flex gap-4">
            <span className="h-full w-px bg-gradient-to-b from-gold/60 to-transparent shrink-0" />
            <div>
              <div className="font-sora font-700 text-[15px] text-txt">{f.label}</div>
              <div className="text-[13px] text-txt2/80 mt-1.5 leading-relaxed">{f.note}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-14 flex items-center gap-3 text-[12px] text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" style={{ boxShadow: '0 0 8px #00E5FF' }} />
        This module is on the AURUM roadmap. The Dashboard, News Intelligence and Journal are fully live today.
      </div>
    </div>
  );
}
