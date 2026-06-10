import { GoldBar } from './Brand';
import { NAV_ITEMS, type NavItem } from '../nav';

export function Sidebar({ active, onSelect }: { active: NavItem; onSelect: (s: NavItem) => void }) {
  return (
    <aside className="w-[230px] shrink-0 h-screen sticky top-0 hidden lg:flex flex-col border-r border-white/[0.06] bg-black/20 backdrop-blur-xl z-20">
      <div className="px-6 py-7 flex items-center gap-3">
        <GoldBar size={40} />
        <div>
          <div className="font-sora font-800 text-[20px] gold-text leading-none tracking-wide">AURUM</div>
          <div className="text-[9px] text-muted tracking-[0.2em] uppercase mt-1.5">Intelligence Terminal</div>
        </div>
      </div>

      <nav className="flex-1 px-3.5 mt-2 space-y-0.5">
        {NAV_ITEMS.map((n) => {
          const on = n === active;
          return (
            <button key={n} onClick={() => onSelect(n)} aria-current={on ? 'page' : undefined}
              className={`relative w-full text-left pl-4 pr-3 py-2.5 rounded-lg text-[13px] transition-all font-inter
                ${on ? 'text-gold font-600 bg-gold/[0.07]' : 'text-txt2 hover:text-txt hover:bg-white/[0.03]'}`}>
              {on && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gold" />}
              {n}
            </button>
          );
        })}
      </nav>

      <div className="px-6 py-5 border-t border-white/[0.06] text-[10px] text-muted space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-bull" style={{ boxShadow: '0 0 8px #00D98B' }} />
          <span className="tracking-wide">FEED · gold-api.com</span>
        </div>
        <div className="text-muted/50 tracking-wide pl-3.5">MT5 bridge · standby</div>
      </div>
    </aside>
  );
}
