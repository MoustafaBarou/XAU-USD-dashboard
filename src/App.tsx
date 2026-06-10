import { useState } from 'react';
import { useGoldFeed } from './hooks/useGoldFeed';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { TerminalBar } from './components/TerminalBar';
import type { NavItem } from './nav';

import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { CalendarPage } from './pages/CalendarPage';
import { MacroDeskPage } from './pages/MacroDeskPage';
import { NewsIntelligencePage } from './pages/NewsIntelligencePage';
import { EconomicCalendarPage } from './pages/EconomicCalendarPage';
import { MarketMoodPage } from './pages/MarketMoodPage';
import { JournalPage } from './pages/JournalPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const g = useGoldFeed();
  const [active, setActive] = useState<NavItem>('Dashboard');

  // Render switch — each sidebar selection shows a distinct page.
  function renderPage() {
    switch (active) {
      case 'Dashboard':         return <DashboardPage g={g} />;
      case 'Reports':           return <ReportsPage />;
      case 'Calendar':          return <CalendarPage />;
      case 'Macro Desk':        return <MacroDeskPage />;
      case 'News Intelligence': return <NewsIntelligencePage />;
      case 'Economic Calendar': return <EconomicCalendarPage />;
      case 'Market Mood':       return <MarketMoodPage />;
      case 'Journal':           return <JournalPage />;
      case 'Settings':          return <SettingsPage />;
      default:                  return <DashboardPage g={g} />;
    }
  }

  return (
    <div className="min-h-screen relative font-inter text-txt">
      <div className="stage">
        <div className="aur a1" /><div className="aur a2" /><div className="aur a3" />
        <div className="vignette" /><div className="grain" />
      </div>

      <div className="relative z-10">
        <TerminalBar g={g} />

        {/* Mobile / narrow-viewport navigation (sidebar is hidden below lg) */}
        <MobileNav active={active} onSelect={setActive} />

        <div className="flex">
          <Sidebar active={active} onSelect={setActive} />

          <main className="flex-1 min-w-0 px-6 sm:px-12 xl:px-20 py-4 max-w-[1600px] mx-auto w-full">
            {renderPage()}

            <footer className="text-[11px] text-muted/50 text-center py-16 leading-relaxed max-w-2xl mx-auto">
              AURUM · Gold Intelligence Terminal · Live XAU/USD via gold-api.com · architecture ready for VT Markets MT5 bridge.<br />
              The Bias Engine and AI Overview update live from price action; macro drivers and the top tape show "no feed" until a live source is connected — values are never fabricated.
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
