import { useState } from 'react';
import { useAuthContext } from '../lib/AuthContext';
import { resolveDisplayName } from '../lib/userName';
import { AuthModal } from './AuthModal';

/**
 * Account / auth control. `sidebar` is the full stacked layout used in the
 * desktop Sidebar; `compact` is an inline layout for the mobile top bar so the
 * Sign in / Sign out control is always visible on narrow viewports.
 */
export function AccountWidget({ variant = 'sidebar' }: { variant?: 'sidebar' | 'compact' }) {
  const { user, loading, logout } = useAuthContext();
  const [open, setOpen] = useState(false);
  const compact = variant === 'compact';

  if (loading) {
    return <div className="text-[11px] text-muted/60 px-1">{compact ? '…' : 'Checking session…'}</div>;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={`font-sora font-700 text-[12px] tracking-wide text-bg bg-gradient-to-r from-goldBright to-gold rounded-lg transition-all hover:opacity-90
            ${compact ? 'px-3.5 py-1.5' : 'w-full py-2'}`}
        >
          Sign in
        </button>
        <AuthModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const label = resolveDisplayName(user);
  const initial = label.slice(0, 1).toUpperCase();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-[11px] font-700 text-gold shrink-0">
          {initial}
        </span>
        <button
          onClick={logout}
          className="text-[11px] text-muted hover:text-txt border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-[11px] font-700 text-gold">
          {initial}
        </span>
        <span className="text-[11px] text-txt2 truncate flex-1">{label}</span>
      </div>
      <button onClick={logout}
        className="w-full text-[11px] text-muted hover:text-txt border border-white/10 rounded-lg py-1.5 transition-colors">
        Sign out
      </button>
    </div>
  );
}
