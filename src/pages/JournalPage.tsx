import { Journal } from '../components/Journal';
import { PageHeader } from './PageShell';

export function JournalPage() {
  return (
    <div>
      <PageHeader
        title="Trade Journal"
        description="Log your XAU/USD setups, entries, exits and lessons. Disciplined record-keeping is the edge that compounds."
      />
      <div className="rule my-8" />
      <div className="max-w-4xl"><Journal /></div>
    </div>
  );
}
