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
import { Eyebrow } from '../components/ui';
import { useAuthContext } from '../lib/AuthContext';
import { usePreferences } from '../lib/PreferencesContext';
import { resolveDisplayName, timeGreeting } from '../lib/userName';
import type { GoldState } from '../hooks/useGoldFeed';
import type { Quote, InstrumentMap } from '../services/priceService';

function Rule() { return <div className="rule my-12" />; }

const DESK_DATE = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long',
}).format(new Date());

export function DashboardPage({ g, dxy, us10y, instruments }: { g: GoldState; dxy?: Quote | null; us10y?: Quote | null; instruments?: InstrumentMap | null }) {
  const { user } = useAuthContext();
  const { formatPrice } = usePreferences();
  const name = resolveDisplayName(user);
  const live = g.status === 'connected' && g.price !== null;
  return (
    <div className="pb-6">
      {/* greeting header */}
      <div className="flex items-end justify-between flex-wrap gap-5 pt-8 pb-7">
        <div className="flex items-center gap-4 min-w-0">
          <GoldBar size={56} />
          <div className="min-w-0">
            <Eyebrow>Trading Desk · {DESK_DATE}</Eyebrow>
            <h1 className="font-sora font-800 green-text leading-[1.05] mt-2" style={{ fontSize: 'clamp(28px,4vw,46px)' }}>
              {timeGreeting()}, {name}
            </h1>
            <p className="text-txt2/80 mt-2.5 text-[14px]">Live gold intelligence, mechanical bias and the macro tape — at a glance.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {live && (
            <span className="card px-3.5 py-2 flex items-center gap-2 text-[12px]">
              <span className="h-2 w-2 rounded-full bg-greenBright animate-pulse" style={{ boxShadow: '0 0 8px #4ADE80' }} />
              <span className="tnum font-700 text-txt">{formatPrice(g.price)}</span>
              <span className="text-muted tracking-wide">XAU/USD</span>
            </span>
          )}
          <button className="card card-hover px-4 py-2 text-[13px] font-600 text-txt2 transition-colors">
            Personalize
          </button>
        </div>
      </div>

      {/* primary desk stack — even vertical rhythm */}
      <div className="space-y-6">
        {/* live XAU/USD price engine */}
        <LiveGoldWidget />

        {/* market bias + next high-impact event */}
        <DashboardMood />

        {/* session rail */}
        <SessionRail />

        {/* dense two-column desk */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <MacroDeskGrid g={g} instruments={instruments} />
          <ForYouPanel />
        </div>
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
