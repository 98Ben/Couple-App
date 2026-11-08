import { supabase } from './supabase';

// Alle Tabellen mit euren gemeinsamen Daten (RLS liefert nur das eigene Paar)
const TABLES = [
  'profiles',
  'couples',
  'moments',
  'places',
  'countdowns',
  'bucket_items',
  'date_ideas',
  'wishes',
  'love_notes',
  'question_answers',
  'quiz_rounds',
  'quiz_entries',
  'moods',
  'capsules',
  'capsule_contents', // nur schon geöffnete Kapseln – versiegelte bleiben versiegelt
  'shopping_items',
  'shopping_memory',
  'tasks',
  'chores',
  'letters',
  'needs',
] as const;

type Progress = (text: string) => void;

/** Packt alle Daten als JSON und alle Fotos in eine ZIP-Datei. */
export async function buildExport(onProgress: Progress): Promise<File> {
  const { default: JSZip } = await import('jszip'); // erst bei Bedarf laden
  const zip = new JSZip();
  const data: Record<string, unknown[]> = {};

  onProgress('Daten werden gesammelt …');
  for (const t of TABLES) {
    const { data: rows, error } = await supabase.from(t).select('*');
    data[t] = error ? [] : (rows ?? []);
  }
  zip.file('daten.json', JSON.stringify({ exportiert_am: new Date().toISOString(), ...data }, null, 2));

  // Fotopfade einsammeln
  const paths = new Set<string>();
  const add = (p: unknown) => typeof p === 'string' && p && paths.add(p);
  for (const r of data.moments as { photo_path?: string }[]) add(r.photo_path);
  for (const r of data.places as { photo_path?: string }[]) add(r.photo_path);
  for (const r of data.love_notes as { doodle_path?: string }[]) add(r.doodle_path);
  for (const r of data.capsule_contents as { photo_paths?: string[] }[]) (r.photo_paths ?? []).forEach(add);
  for (const r of (data.letters ?? []) as { photo_path?: string }[]) add(r.photo_path);

  const list = [...paths];
  let i = 0;
  for (const p of list) {
    i++;
    onProgress(`Foto ${i} von ${list.length} …`);
    const { data: blob } = await supabase.storage.from('memories').download(p);
    if (blob) zip.file(`fotos/${p.split('/').pop()}`, blob);
  }

  onProgress('ZIP wird erstellt …');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  const date = new Date().toISOString().slice(0, 10);
  return new File([blob], `couple-app-${date}.zip`, { type: 'application/zip' });
}

/** Auf dem iPhone über „Teilen“ (→ „In Dateien sichern“), sonst als Download. */
export async function deliverFile(file: File) {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Couple App Sicherung' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Belegter Fotospeicher in Bytes und Anzahl Dateien (Ordner des Paares). */
export async function storageUsage(coupleId: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0;
  let files = 0;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from('memories').list(coupleId, { limit: 1000, offset });
    if (error || !data) break;
    for (const f of data) {
      const size = (f.metadata as { size?: number } | null)?.size ?? 0;
      bytes += size;
      files++;
    }
    if (data.length < 1000) break;
  }
  return { bytes, files };
}
