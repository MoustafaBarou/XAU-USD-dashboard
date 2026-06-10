export function Sparkline({ points, color = '#D4AF37', w = 120, h = 36 }: { points: number[]; color?: string; w?: number; h?: number }) {
  if (points.length < 2) return <div style={{ width: w, height: h }} className="text-[10px] text-muted flex items-center">awaiting ticks…</div>;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - ((p - min) / range) * h).toFixed(1)}`).join(' ');
  const up = points[points.length - 1] >= points[0];
  const stroke = color === 'auto' ? (up ? '#00D98B' : '#FF4D6D') : color;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
