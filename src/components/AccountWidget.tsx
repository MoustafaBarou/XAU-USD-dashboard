import { useState } from 'react';
import { useAuthContext } from '../lib/AuthContext';
import { AuthModal } from './AuthModal';

export function AccountWidget() {
  const { user, loading, logout } = useAuthContext();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="text-[11px] text-muted/60 px-1">Checking session…</div>;
  }

  if (!user) {
    return (
      <>
        <button onClick={() => setOpen(true)}
          className="w-full font-sora font-700 text-[12px] tracking-wide text-bg bg-gradient-to-r from-goldBright to-gold rounded-lg py-2 transition-all hover:opacity-90">
          Sign in
        </button>
        <AuthModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const label = (user.user_metadata?.username as string) || user.email || 'Account';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-[11px] font-700 text-gold">
          {label.slice(0, 1).toUpperCase()}
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
