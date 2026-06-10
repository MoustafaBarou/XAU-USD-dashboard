import { useState } from 'react';
import { GoldBar } from './Brand';
import { NAV_ITEMS, type NavItem } from '../nav';

/**
 * Mobile / narrow-viewport navigation. The desktop Sidebar is hidden below the
 * `lg` breakpoint, so without this the menu is unreachable on laptops, tablets
 * and phones. This renders a top bar with a toggle that opens a full menu.
 */
export function MobileNav({ active, onSelect }: { active: NavItem; onSelect: (s: NavItem) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <GoldBar size={30} />
          <div className="font-sora font-800 text-[16px] gold-text tracking-wide leading-none">AURUM</div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle navigation"
          className="flex flex-col gap-[5px] p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
        >
          <span className={`h-[2px] w-5 bg-gold transition-transform ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
          <span className={`h-[2px] w-5 bg-gold transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`h-[2px] w-5 bg-gold transition-transform ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
        </button>
      </div>

      {open && (
        <nav className="border-b border-white/[0.06] bg-black/40 backdrop-blur-xl px-3 py-2">
          {NAV_ITEMS.map((n) => {
            const on = n === active;
            return (
              <button
                key={n}
                onClick={() => { onSelect(n); setOpen(false); }}
                aria-current={on ? 'page' : undefined}
                className={`block w-full text-left px-4 py-3 rounded-lg text-[14px] transition-colors
                  ${on ? 'text-gold font-600 bg-gold/[0.08]' : 'text-txt2 hover:text-txt hover:bg-white/[0.04]'}`}
              >
                {n}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
