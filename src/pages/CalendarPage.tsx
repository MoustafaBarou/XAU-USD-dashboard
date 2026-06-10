import { PagePlaceholder } from './PageShell';

export function CalendarPage() {
  return (
    <PagePlaceholder
      title="Calendar"
      description="A unified view of market sessions, your scheduled reviews, and gold-relevant events in one timeline."
      features={[
        { label: 'Session Timeline', note: 'Sydney, Tokyo, London and New York hours mapped against the live clock.' },
        { label: 'Personal Reminders', note: 'Schedule your own review checkpoints and trade-management windows.' },
        { label: 'Event Overlay', note: 'Overlay gold-moving events onto the session timeline for context.' },
        { label: 'Time-zone Aware', note: 'Everything anchored to UTC with local-time display.' },
      ]}
    />
  );
}
