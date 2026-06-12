import { GoldBar } from '../components/Brand';
import { SessionRail } from '../components/SessionRail';
import { MacroDeskGrid } from '../components/MacroDeskGrid';
import { ForYouPanel } from '../components/ForYouPanel';
import { BiasEngine } from '../components/BiasEngine';
import { Chart } from '../components/Chart';
import { DriverMatrix } from '../components/DriverMatrix';
import { AiOverview } from '../components/Intelligence';
import { DashboardMood } from '../components/DashboardMood';
import { LiveGoldWidget } from '../components/LiveGoldWidget';
import { useAuthContext } from '../lib/AuthContext';
import { resolveDisplayName, timeGreeting } from '../lib/userName';
import type { GoldState } from '../hooks/useGoldFeed';
import type { Quote, InstrumentMap } from '../services/priceService';

function Rule() { return <div className="rule my-12" />; }

export function DashboardPage({ g, dxy, us10y, instruments }: { g: GoldState; dxy?: Quote | null; us10y?: Quote | null; instruments?: InstrumentMap | null }) {
  const { user } = useAuthContext();
  const name = resolveDisplayName(user);
  const live = g.status === 'connected' && g.price !== null;
  return (
    <div className="pb-6">
      {/* greeting header */}
      <div className="flex items-start justify-between flex-wrap gap-4 pt-6 pb-6">
        <div className="flex items-center gap-4">
          <GoldBar size={56} />
          <div>
            <h1 className="font-sora font-800 green-text leading-none" style={{ fontSize: 'clamp(30px,4vw,46px)' }}>
              {timeGreeting()}, {name}
            </h1>
            <p className="text-txt2 mt-2.5 flex items-center gap-2 text-[14px]">
              <span className="text-greenBright">✦</span> Welcome back to AURUM.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {live && (
            <span className="card px-3 py-2 flex items-center gap-2 text-[12px]">
              <span className="h-2 w-2 rounded-full bg-greenBright animate-pulse" style={{ boxShadow: '0 0 8px #4ADE80' }} />
              <span className="tnum text-txt">{g.price!.toFixed(2)}</span>
              <span className="text-muted">XAU/USD</span>
            </span>
          )}
          <button className="card card-hover px-4 py-2 text-[13px] font-600 text-txt2 flex items-center gap-2 transition-colors">
            <span className="text-greenBright">⚙</span> Personalize
          </button>
        </div>
      </div>

      {/* live XAU/USD price engine */}
      <div className="mb-5"><LiveGoldWidget /></div>

      {/* market bias + next high-impact event */}
      <div className="mb-5"><DashboardMood /></div>

      {/* session rail */}
      <div className="mb-5"><SessionRail /></div>

      {/* dense two-column desk */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <MacroDeskGrid g={g} instruments={instruments} />
        <ForYouPanel />
      </div>

      <Rule />
      <BiasEngine g={g} dxy={dxy} us10y={us10y} />

      <Rule />
      <Chart height={560} />

      <Rule />
      <DriverMatrix />

      <Rule />
      <AiOverview g={g} />
    </div>
  );
}
