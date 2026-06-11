import { LiveCalendar } from '../components/LiveCalendar';
import { PageHeader } from './PageShell';

export function EconomicCalendarPage() {
  return (
    <div>
      <PageHeader
        title="Economic Calendar"
        description="Live high-impact macro releases that move gold — CPI, FOMC, NFP, yields — with consensus, prior and actual. Auto-refreshing from a real data source."
      />
      <div className="rule my-8" />
      <div className="max-w-5xl">
        <LiveCalendar />
      </div>
    </div>
  );
}
