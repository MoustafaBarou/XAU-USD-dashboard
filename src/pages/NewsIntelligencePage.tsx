import { LiveNewsFeed } from '../components/LiveNewsFeed';
import { PageHeader } from './PageShell';

export function NewsIntelligencePage() {
  return (
    <div>
      <PageHeader
        title="News Intelligence"
        description="Macro & gold headlines · sentiment · assessed XAU/USD impact · refresh 60s"
      />
      <div className="rule my-8" />
      <div className="max-w-4xl">
        <LiveNewsFeed />
      </div>
    </div>
  );
}
