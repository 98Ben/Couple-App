/**
 * Design-Tokens „Modern Romantic & Playful Minimal".
 * Jede Bereichsfarbe hat eine kräftige Hauptfarbe (Überschrift) und hellere Töne für die Kacheln.
 */
export const colors = {
  base: '#FFF9F5',
  coral: '#FF6B6B',
  coral2: '#FF8E85',
  coralText: '#C93F45',
  sun: '#FFD166',
  lavender: '#FFC6FF',
  text: '#3A2E39',
  muted: '#7A6874',
};

export type ToneKey = 'peach' | 'rose' | 'lav' | 'sun';

export type Tone = {
  main: string; // Bereichsfarbe (Icon-Chip der Überschrift, Akzent-Herzen)
  icon: string; // Icon-Strich in Kacheln
  tileBg: string; // Kachel-Hintergrund (hell)
  blob: string; // Blob hinter dem Kachel-Icon (etwas kräftiger)
  shadow: string; // farbiger Schatten
};

export const tones: Record<ToneKey, Tone> = {
  peach: { main: '#FF9F5A', icon: '#D0621F', tileBg: '#FFF4EC', blob: '#FFE2CC', shadow: 'rgba(255, 159, 90, 0.20)' },
  rose: { main: '#FF7B86', icon: '#DC4553', tileBg: '#FFF1F2', blob: '#FFDCE0', shadow: 'rgba(255, 107, 120, 0.18)' },
  lav: { main: '#C98BEA', icon: '#9E4FC9', tileBg: '#FBF2FF', blob: '#F1DCFB', shadow: 'rgba(200, 130, 235, 0.20)' },
  sun: { main: '#FFC23D', icon: '#A87300', tileBg: '#FFF9E6', blob: '#FFECB3', shadow: 'rgba(255, 194, 61, 0.24)' },
};
