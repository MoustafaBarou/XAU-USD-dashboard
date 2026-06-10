import { PagePlaceholder } from './PageShell';

export function EconomicCalendarPage() {
  return (
    <PagePlaceholder
      title="Economic Calendar"
      description="High-impact macro releases that move gold — CPI, FOMC, NFP, real-yield prints — with consensus, prior and actual."
      features={[
        { label: 'Gold-Filtered Events', note: 'Only the releases that historically move XAU/USD, ranked by impact.' },
        { label: 'Consensus vs Actual', note: 'Forecast, prior and actual side by side with a surprise indicator.' },
        { label: 'Bias Linkage', note: 'Connect each print to the relevant Driver Matrix row when a feed is live.' },
        { label: 'Countdown Alerts', note: 'See the next high-impact release and time remaining at a glance.' },
      ]}
    />
  );
}
