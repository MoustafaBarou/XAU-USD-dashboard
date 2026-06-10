@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body, #root { height: 100%; }

body {
  margin: 0;
  background: #04060A;
  color: #fff;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.font-sora { font-family: 'Sora', sans-serif; }
.tnum { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }

/* ── Cinematic ambient field ─────────────────────────────────────────── */
/* Layered, blurred aurora + a vignette that darkens the edges of the frame
   so the eye is drawn to the centre — the "lit set" feel of a research desk. */
.stage { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.stage .aur {
  position: absolute; border-radius: 50%; filter: blur(140px); will-change: transform;
}
.stage .a1 {
  width: 820px; height: 820px; top: -280px; left: -180px;
  background: radial-gradient(circle, rgba(34,197,94,0.22), transparent 66%);
  animation: drift1 26s ease-in-out infinite;
}
.stage .a2 {
  width: 720px; height: 720px; bottom: -300px; right: -160px;
  background: radial-gradient(circle, rgba(34,197,94,0.12), transparent 68%);
  animation: drift2 32s ease-in-out infinite;
}
.stage .a3 {
  width: 560px; height: 560px; top: 30%; left: 45%;
  background: radial-gradient(circle, rgba(16,128,61,0.18), transparent 70%);
  animation: drift3 38s ease-in-out infinite;
}
.stage .vignette {
  position: absolute; inset: 0;
  background:
    radial-gradient(120% 90% at 50% 35%, transparent 40%, rgba(0,0,0,0.55) 100%),
    linear-gradient(180deg, rgba(0,0,0,0.35), transparent 25%, transparent 75%, rgba(0,0,0,0.45));
}
.stage .grain {
  position: absolute; inset: 0; opacity: 0.025; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
@keyframes drift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(90px,70px)} }
@keyframes drift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-80px,-60px)} }
@keyframes drift3 { 0%,100%{transform:translate(-50%,0)} 50%{transform:translate(-45%,-40px)} }

/* ── Surfaces: panels, not cards ─────────────────────────────────────── */
/* A "surface" is a large open region defined by a soft top-lit gradient and a
   single hairline, not a hard bordered box. This reduces card-iness. */
.surface {
  position: relative;
  background:
    radial-gradient(140% 100% at 50% 0%, rgba(255,255,255,0.035), transparent 60%),
    linear-gradient(180deg, rgba(13,18,24,0.55), rgba(8,11,16,0.35));
  border: 1px solid rgba(255,255,255,0.045);
  border-radius: 22px;
}
.surface-lit::before {
  /* a thin top edge "light" — cinematic rim lighting */
  content: ''; position: absolute; inset: 0 0 auto 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(34,197,94,0.45), transparent);
  border-radius: 22px 22px 0 0;
}
.glass {
  background: rgba(14,20,28,0.5);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.05);
}

/* a faint hairline divider for separating panel regions without boxing them */
.rule { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); }

.gold-text {
  background: linear-gradient(135deg, #FFE9A0, #FFD700 30%, #D4AF37 65%, #A77A00);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

.flash-up { animation: flashUp 0.7s ease-out; }
.flash-down { animation: flashDown 0.7s ease-out; }
@keyframes flashUp { 0%{background-color: rgba(0,217,139,0.18)} 100%{background-color: transparent} }
@keyframes flashDown { 0%{background-color: rgba(255,77,109,0.18)} 100%{background-color: transparent} }

.scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.25); border-radius: 3px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }

/* eyebrow label — the small uppercase analyst section tag */
.eyebrow {
  font-family: 'Sora', sans-serif; font-weight: 700; font-size: 11px;
  letter-spacing: 0.22em; text-transform: uppercase; color: #8A93A6;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
}
button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid #D4AF37; outline-offset: 2px;
}


/* ── HybridTrader-style helpers (green) ─────────────────────────────── */
.green-text {
  background: linear-gradient(135deg, #86EFAC, #4ADE80 40%, #22C55E);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
/* dense card — used by Macro Desk grid and side panels */
.card {
  background: linear-gradient(165deg, rgba(16,26,20,0.72), rgba(9,14,11,0.72));
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
}
.card-hover:hover { border-color: rgba(34,197,94,0.35); }
.flash-up { animation: flashUp 0.7s ease-out; }
.flash-down { animation: flashDown 0.7s ease-out; }
