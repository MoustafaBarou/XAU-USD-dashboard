import { useState } from 'react';
import { useGoldFeed } from './hooks/useGoldFeed';
import { useMacroData } from './hooks/useMacroData';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { TerminalBar } from './components/TerminalBar';
import { AlertWatcher } from './components/AlertWatcher';
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
  const macro = useMacroData();
  const [active, setActive] = useState<NavItem>('Dashboard');
  // Render switch — each sidebar selection shows a distinct page.
  function renderPage() {
    switch (active) {
      case 'Dashboard':         return <DashboardPage g={g} dxy={macro.dxy} us10y={macro.us10y} instruments={macro.instruments} />;
      case 'Reports':           return <ReportsPage />;
      case 'Calendar':          return <CalendarPage />;
      case 'Macro Desk':        return <MacroDeskPage />;
      case 'News Intelligence': return <NewsIntelligencePage />;
      case 'Economic Calendar': return <EconomicCalendarPage />;
      case 'Market Mood':       return <MarketMoodPage />;
      case 'Journal':           return <JournalPage />;
      case 'Settings':          return <SettingsPage />;
      default:                  return <DashboardPage g={g} dxy={macro.dxy} us10y={macro.us10y} instruments={macro.instruments} />;
    }
  }
  return (
    <div className="min-h-screen relative font-inter text-txt">
      <div className="stage">
        <div className="aur a1" /><div className="aur a2" /><div className="aur a3" />
        <div className="vignette" /><div className="grain" />
      </div>
      {/* Safe-area insets keep the tape and content clear of the notch on phones. */}
      <div
        className="relative z-10"
        style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        {/* In-app alert engine — fires toasts while the app is open. Renders nothing. */}
        <AlertWatcher g={g} />
        <TerminalBar g={g} instruments={macro.instruments} />
        {/* Mobile / narrow-viewport navigation (sidebar is hidden below lg) */}
        <MobileNav active={active} onSelect={setActive} />
        {/* Sidebar + content are centred together as one block, so wide/ultrawide
            screens don't strand the content in a narrow column with a black void
            on the left. The generous cap lets the layout use the width. */}
        <div className="flex max-w-[2400px] mx-auto w-full">
          <Sidebar active={active} onSelect={setActive} />
          <main className="flex-1 min-w-0 px-5 sm:px-10 xl:px-14 py-4 w-full">
            {renderPage()}
            <footer className="text-[11px] text-muted/50 text-center py-16 leading-relaxed max-w-2xl mx-auto">
              AURUM · Gold Intelligence Terminal<br />
              © {new Date().getFullYear()} AURUM. All rights reserved.
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
