/** Datums-Helfer. Datumswerte aus der Datenbank sind 'YYYY-MM-DD' und werden als lokales Datum gelesen. */

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const todayIso = () => toIso(new Date());

export function formatDate(iso: string | null | undefined, withWeekday = false): string {
  if (!iso) return '';
  return parseDate(iso).toLocaleDateString('de-DE', {
    weekday: withWeekday ? 'short' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '';
  return parseDate(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function yearsAgo(iso: string): number {
  return new Date().getFullYear() - parseDate(iso).getFullYear();
}

export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('de-DE')} ${n === 1 ? one : many}`;

/** „gerade eben“, „vor 5 Min.“, „vor 3 Std.“, „gestern“, sonst Datum */
export function relativeTime(ts: string): string {
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `vor ${Math.floor(diff / 3600)} Std.`;
  const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'gestern';
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}
