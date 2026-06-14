import { Reports } from '../components/Reports';
import { PageHeader } from './PageShell';

export function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Performance · returns · win rate · profit factor · equity curve · from your private journal"
      />
      <div className="rule my-8" />
      <Reports />
    </div>
  );
}
