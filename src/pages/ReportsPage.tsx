import { PagePlaceholder } from './PageShell';

export function ReportsPage() {
  return (
    <PagePlaceholder
      title="Reports"
      description="Scheduled and on-demand gold research: daily macro briefings, weekly positioning reviews and exportable PDF summaries."
      features={[
        { label: 'Daily Gold Briefing', note: 'An automated morning note summarising overnight drivers, the live bias, and levels to watch.' },
        { label: 'Weekly Positioning Review', note: 'A retrospective on how the Driver Matrix and bias evolved across the week.' },
        { label: 'PDF Export', note: 'One-click export of any report, branded for sharing with a desk or client.' },
        { label: 'Custom Snapshots', note: 'Pin a moment in the market and generate a timestamped research snapshot.' },
      ]}
    />
  );
}
