import { Heart } from '../icons/Icon';

const PIECES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  return {
    x: Math.round(Math.cos(angle) * (38 + (i % 3) * 14)),
    y: Math.round(Math.sin(angle) * (30 + (i % 4) * 10) - 26),
    size: 10 + (i % 3) * 4,
    delay: (i % 4) * 0.03,
  };
});

const COLORS = ['#FF6B6B', '#FF8E85', '#FFD166', '#C98BEA', '#FF9F5A'];

/** Kleine Herz-Konfetti-Explosion; mit neuem `key` erneut abspielen. */
export default function HeartBurst() {
  return (
    <span className="heart-burst" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          style={{ ['--x' as string]: `${p.x}px`, ['--y' as string]: `${p.y}px`, animationDelay: `${p.delay}s` }}
        >
          <Heart size={p.size} color={COLORS[i % COLORS.length]} />
        </span>
      ))}
    </span>
  );
}
