import { HEART_PATH, iconMarkup, type IconName } from './iconShapes';

type Props = {
  name: IconName;
  size?: number;
  stroke?: string;
  accent?: string;
  weight?: number;
};

/** Eigenes Icon aus dem Couple-App-Set (Line-Art mit Herz-Detail). */
export function Icon({ name, size = 24, stroke = 'currentColor', accent = '#FF8E85', weight = 1.8 }: Props) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Inhalt stammt ausschließlich aus dem statischen Icon-Set
      dangerouslySetInnerHTML={{ __html: iconMarkup(name, stroke, accent) }}
    />
  );
}

/** Herz als Fläche oder Line-Art. */
export function Heart({ size = 18, color = '#FF6B6B', outline = false, weight = 1.6 }: { size?: number; color?: string; outline?: boolean; weight?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      <path
        d={HEART_PATH}
        fill={outline ? 'none' : color}
        stroke={outline ? color : 'none'}
        strokeWidth={weight}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
