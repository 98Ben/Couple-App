// Eigenes Couple-App-Icon-Set: runde Line-Art (24er Raster), Duotone mit Herz-/Akzent-Detail.
// iconMarkup(name, stroke, accent) → innerer SVG-Inhalt (statisch, ohne Nutzereingaben)
const HEART_D = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';

// gefülltes Mini-Herz, (cx, cy) = Mitte, w = Breite
const heart = (cx: number, cy: number, w: number, fill: string, stroke: string | null = null) => {
  const s = w / 20;
  const x = cx - 12 * s;
  const y = cy - 12 * s;
  const st = stroke ? ` stroke="${stroke}" stroke-width="${(1.8 / s).toFixed(2)}"` : ' stroke="none"';
  return `<path d="${HEART_D}" fill="${fill}"${st} transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(3)})"></path>`;
};
const dot = (cx: number, cy: number, r: number, fill: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="none"></circle>`;
const p = (d: string) => `<path d="${d}"></path>`;

const shapes: Record<string, (c: string, a: string) => string> = {
  home: (c, a) =>
    p('M3.5 11.2 12 4.3l8.5 6.9') +
    p('M6 9.6V19a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V9.6') +
    heart(12, 14.6, 6.4, a),

  plane: (c, a) =>
    p('M20.5 3.5 3.5 10.3l6.4 2.9 2.9 6.9Z') +
    p('M9.9 13.2 20.5 3.5') +
    heart(5.2, 18.6, 4.6, a),

  polaroid: (c, a) =>
    `<g transform="rotate(-6 12 12)">` +
    `<rect x="4.5" y="3" width="15" height="18" rx="2.6"></rect>` +
    `<rect x="7" y="5.6" width="10" height="9.4" rx="1.6"></rect>` +
    `</g>` +
    heart(12, 10.4, 5, a),

  balloon: (c, a) =>
    heart(12, 9, 13.5, a, c) +
    p('M12 15.6c-1.3 1.3 1.3 2.3 0 3.7s0 2.6 0 2.6') +
    p('M11 15.6h2'),

  bag: (c, a) =>
    p('M5.2 8.5h13.6l-1 10.9a1.6 1.6 0 0 1-1.6 1.4H7.8a1.6 1.6 0 0 1-1.6-1.4Z') +
    p('M9 8.5V7a3 3 0 0 1 6 0v1.5') +
    heart(12, 14.6, 5.6, a),

  checklist: (c, a) =>
    `<rect x="4" y="3.5" width="16" height="17" rx="3.2"></rect>` +
    p('M7.2 9.1 8.5 10.4l2.4-2.6') +
    p('M13 9.3h4') +
    p('M13 15.2h4') +
    heart(9, 15.2, 4, a),

  calendar: (c, a) =>
    `<rect x="3.5" y="5" width="17" height="15.5" rx="3.2"></rect>` +
    p('M3.5 10h17') +
    p('M8 3.2v3.6') +
    p('M16 3.2v3.6') +
    heart(12, 15.4, 5.4, a),

  chat: (c, a) =>
    p('M6.5 4.5h9a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5l-4 3.5v-3.5a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z') +
    heart(11, 10.2, 6, a) +
    dot(20.6, 5.2, 1.1, a),

  letter: (c, a) =>
    `<rect x="3" y="6" width="18" height="13" rx="3"></rect>` +
    p('M3.6 7.6 12 13.4l8.4-5.8') +
    heart(12, 13.2, 6, a, c),

  question: (c, a) =>
    p('M12 3.8a8 7.6 0 1 1-3.9 14.3L4 19.6l1.3-3.7A8 7.6 0 0 1 12 3.8Z') +
    p('M9.8 9.6a2.3 2.3 0 1 1 3.3 2.1c-.7.3-1.1.8-1.1 1.6') +
    dot(12, 15.9, 0.95, c) +
    heart(19.6, 4.4, 4, a),

  doodle: (c, a) =>
    p('M14.6 4.4a2 2 0 0 1 2.9 0l2.1 2.1a2 2 0 0 1 0 2.9L9.4 19.6l-4.6.9.9-4.6Z') +
    p('M13 6l5 5') +
    `<path d="M3.6 22.2c1.8-1.3 3.3.9 5.1 0s3.3-1.3 5.1 0" stroke="${a}"></path>`,

  mic: (c, a) =>
    `<rect x="9" y="3" width="6" height="11" rx="3"></rect>` +
    p('M6 11a6 6 0 0 0 12 0') +
    p('M12 17v3.5') +
    p('M9 20.5h6') +
    `<path d="M3.2 8.6c-.9 1.6-.9 3.2 0 4.8" stroke="${a}"></path>` +
    `<path d="M20.8 8.6c.9 1.6.9 3.2 0 4.8" stroke="${a}"></path>`,

  globe: (c, a) =>
    `<circle cx="11" cy="13" r="7.6"></circle>` +
    p('M3.6 13h14.8') +
    p('M11 5.4c-2.9 3.6-2.9 11.6 0 15.2') +
    p('M11 5.4c2.9 3.6 2.9 11.6 0 15.2') +
    heart(18.2, 5.6, 6.4, a, c),

  photos: (c, a) =>
    p('M5.6 18.2 3.9 7.6a2.2 2.2 0 0 1 1.8-2.5l8-1.3') +
    `<rect x="7.5" y="5.5" width="13.5" height="15" rx="2.4"></rect>` +
    `<rect x="9.7" y="7.7" width="9.1" height="8" rx="1.4"></rect>` +
    heart(14.25, 11.7, 4.6, a),

  hourglass: (c, a) =>
    p('M6.5 3.5h11') +
    p('M6.5 20.5h11') +
    p('M8 3.5V5c0 3 4 4.6 4 7 0-2.4 4-4 4-7V3.5') +
    p('M8 20.5V19c0-3 4-4.6 4-7 0 2.4 4 4 4 7v1.5') +
    heart(12, 17.6, 4.4, a),

  sparkle: (c, a) =>
    p('M11 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z') +
    heart(18.6, 18.6, 5, a) +
    dot(4.6, 19.2, 1.2, a),

  dice: (c, a) =>
    `<rect x="4" y="4" width="16" height="16" rx="4.2" transform="rotate(8 12 12)"></rect>` +
    dot(8.6, 8.4, 1.15, c) +
    dot(15.6, 15.8, 1.15, c) +
    heart(12.1, 12.1, 5.6, a),

  gamepad: (c, a) =>
    p('M7 7.5h10a4.5 4.5 0 0 1 4.3 5.8l-1 3.4a2.6 2.6 0 0 1-4.4 1L14.3 16H9.7l-1.6 1.7a2.6 2.6 0 0 1-4.4-1l-1-3.4A4.5 4.5 0 0 1 7 7.5Z') +
    p('M7.6 10.4v3.2') +
    p('M6 12h3.2') +
    heart(16.2, 12, 4.8, a),
};

export type IconName =
  | 'home' | 'plane' | 'polaroid' | 'balloon' | 'bag' | 'checklist' | 'calendar' | 'chat' | 'letter'
  | 'question' | 'doodle' | 'mic' | 'globe' | 'photos' | 'hourglass' | 'sparkle' | 'dice' | 'gamepad';

export const HEART_PATH = HEART_D;

export function iconMarkup(name: IconName, stroke: string, accent: string): string {
  return shapes[name](stroke, accent);
}
