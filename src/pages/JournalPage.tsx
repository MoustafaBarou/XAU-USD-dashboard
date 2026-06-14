import { Journal } from '../components/Journal';
import { PageHeader } from './PageShell';

export function JournalPage() {
  return (
    <div>
      <PageHeader
        title="Trade Journal"
        description="Trade log · setups · entries · exits · notes · disciplined record-keeping compounds"
      />
      <div className="rule my-8" />
      <div className="max-w-4xl"><Journal /></div>
    </div>
  );
}
