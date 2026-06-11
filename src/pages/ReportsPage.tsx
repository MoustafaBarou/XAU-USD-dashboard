import { Reports } from '../components/Reports';
import { PageHeader } from './PageShell';

export function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Performance analytics generated from your private trade journal — returns, win rate, profit factor and your equity curve."
      />
      <div className="rule my-8" />
      <Reports />
    </div>
  );
}
