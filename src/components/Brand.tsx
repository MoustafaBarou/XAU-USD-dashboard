/**
 * AURUM brand mark — the official uploaded gold-bar badge.
 * File: public/aurum-logo.png  (circular amber badge, three gold bars).
 * Used in: sidebar, header XAUUSD lockup, login page, and as the favicon.
 */
const LOGO_SRC = `${import.meta.env.BASE_URL}aurum-logo.png`;

export function GoldBar({ size = 34, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <img
      src={LOGO_SRC}
      width={size}
      height={size}
      alt="AURUM"
      className="object-contain shrink-0 rounded-full select-none"
      draggable={false}
      style={{
        width: size,
        height: size,
        boxShadow: glow ? '0 0 22px rgba(212,175,55,0.45)' : 'none',
      }}
    />
  );
}
