import { NewsTerminal } from '../components/NewsTerminal';
import { PageHeader } from './PageShell';

export function NewsIntelligencePage() {
  return (
    <div>
      <PageHeader
        title="News Intelligence"
        description="Curated, gold-relevant headlines with AI summaries and an assessed impact on XAU/USD."
      />
      <div className="rule my-8" />
      <div className="max-w-4xl"><NewsTerminal /></div>
    </div>
  );
}
