import { EconomicCalendar } from '../components/EconomicCalendar';
import { PageHeader } from './PageShell';

export function EconomicCalendarPage() {
  return (
    <div>
      <PageHeader
        title="Economic Calendar"
        description="Live macro releases that move the market — CPI, FOMC, NFP and more — with previous, forecast and actual. Filter by day, currency and impact."
      />
      <div className="rule my-8" />
      <EconomicCalendar />
    </div>
  );
}
