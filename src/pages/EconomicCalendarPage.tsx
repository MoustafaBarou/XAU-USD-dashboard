import { EconomicCalendar } from '../components/EconomicCalendar';
import { PageHeader } from './PageShell';

export function EconomicCalendarPage() {
  return (
    <div>
      <PageHeader
        title="Economic Calendar"
        description="Macro releases · CPI / FOMC / NFP · prev / fcst / act · filter by day, currency, impact"
      />
      <div className="rule my-8" />
      <EconomicCalendar />
    </div>
  );
}
