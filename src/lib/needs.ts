/** Vorlagen für „Wünsche“ – was man sich gerade vom anderen wünscht. */
export const NEED_KINDS = [
  { id: 'umarmungen', label: 'Mehr Umarmungen', emoji: '🤗' },
  { id: 'zeit', label: 'Gemeinsame Zeit', emoji: '⏳' },
  { id: 'ueberraschungen', label: 'Kleine Überraschungen', emoji: '🎁' },
  { id: 'komplimente', label: 'Komplimente', emoji: '💬' },
  { id: 'unterstuetzung', label: 'Unterstützung im Alltag', emoji: '🧺' },
  { id: 'zuhoeren', label: 'Zuhören', emoji: '👂' },
  { id: 'zaertlichkeit', label: 'Zärtlichkeit', emoji: '💞' },
  { id: 'date', label: 'Ein Date-Abend', emoji: '🍷' },
  { id: 'ruhe', label: 'Etwas Ruhe für mich', emoji: '🛋️' },
  { id: 'eigen', label: 'Eigener Wunsch', emoji: '✨' },
] as const;

export type NeedKind = (typeof NEED_KINDS)[number]['id'];

export const needKind = (id: string) => NEED_KINDS.find((k) => k.id === id) ?? NEED_KINDS[NEED_KINDS.length - 1];

/** Kurztext für Anzeige und Push: Vorlage, bei „eigen“ der eigene Text. */
export function needTitle(n: { kind: string; text: string | null }) {
  const k = needKind(n.kind);
  return k.id === 'eigen' ? (n.text ?? k.label) : k.label;
}
