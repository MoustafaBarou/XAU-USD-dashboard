import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoldBar } from './Brand';
import { useAuthContext } from '../lib/AuthContext';

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, login, configured } = useAuthContext();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    setError(null); setNotice(null);
    if (!email || !password) { setError('Email and password are required.'); return; }
    setBusy(true);
    const res = mode === 'login'
      ? await login(email, password)
      : await register(email, password, username || undefined);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    if (mode === 'register') {
      setNotice('Account created. Check your email if confirmation is required, then sign in.');
      setMode('login');
    } else {
      onClose();
    }
  }

  // Rendered via a portal to <body> so it escapes every ancestor stacking
  // context (the mobile header uses backdrop-blur, which traps z-index) and
  // truly sits above the sticky top-tape (z-40) and everything else.
  return createPortal(
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] overflow-y-auto"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {/* Fully opaque overlay — solid AURUM-dark so nothing behind it shows through. */}
        <div className="fixed inset-0 bg-[#04060A] backdrop-blur-md" onClick={onClose} />
        {/* Centering wrapper that scrolls on short viewports without clipping the
            card; safe-area insets keep the header/email field clear of the notch. */}
        <div
          className="relative z-10 flex min-h-full items-center justify-center"
          style={{
            paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
        <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }}
          style={{ backgroundColor: '#0B1016' }}
          className="relative w-full max-w-[400px] my-auto surface surface-lit p-7">
          <div className="flex items-center gap-3 mb-6">
            <GoldBar size={40} />
            <div>
              <div className="font-sora font-800 text-[18px] gold-text tracking-wide leading-none">AURUM</div>
              <div className="eyebrow mt-1.5">{mode === 'login' ? 'Sign in' : 'Create account'}</div>
            </div>
          </div>

          {!configured && (
            <div className="mb-4 text-[12px] text-warn leading-relaxed">
              Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
            </div>
          )}

          <div className="space-y-3">
            {mode === 'register' && (
              <Field label="Username (optional)" value={username} onChange={setUsername} placeholder="goldtrader" />
            )}
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@desk.com" type="email" />
            <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          </div>

          {error && <div className="mt-3 text-[12px] text-bear">{error}</div>}
          {notice && <div className="mt-3 text-[12px] text-greenSoft">{notice}</div>}

          <button onClick={submit} disabled={busy}
            className="w-full mt-5 font-sora font-700 text-[14px] tracking-wide text-bg bg-gradient-to-r from-goldBright to-gold rounded-xl py-3 transition-all hover:opacity-90 disabled:opacity-50">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <div className="mt-4 text-center text-[12px] text-muted">
            {mode === 'login' ? "No account?" : 'Already have one?'}{' '}
            <button className="text-greenSoft hover:underline"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setNotice(null); }}>
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-txt text-[18px] leading-none">×</button>
        </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full mt-1.5 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-txt placeholder:text-muted/50 focus:border-gold/50 outline-none transition-colors" />
    </div>
  );
}
