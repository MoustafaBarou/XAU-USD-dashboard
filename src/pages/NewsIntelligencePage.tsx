import { LiveNewsFeed } from '../components/LiveNewsFeed';
import { PageHeader } from './PageShell';

export function NewsIntelligencePage() {
  return (
    <div>
      <PageHeader
        title="News Intelligence"
        description="Live macro and gold-relevant headlines with sentiment and an assessed impact on XAU/USD. Auto-refreshing every 60 seconds from a real news source."
      />
      <div className="rule my-8" />
      <div className="max-w-4xl">
        <LiveNewsFeed />
      </div>
    </div>
  );
}
