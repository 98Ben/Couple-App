import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const BUCKET = 'memories';

/** Verkleinert ein Foto auf max. 1600 px und speichert es als JPEG (spart Speicher und Datenvolumen). */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht umgewandelt werden'))), 'image/jpeg', quality),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Lädt ein Foto in den Ordner des Paares hoch und gibt den Speicherpfad zurück. */
export async function uploadPhoto(coupleId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `${coupleId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error('Foto-Upload hat nicht geklappt. Bist du online?');
  cache.delete(path);
  return path;
}

export async function removePhoto(path: string | null | undefined) {
  if (!path) return;
  cache.delete(path);
  await supabase.storage.from(BUCKET).remove([path]);
}

// Signierte Links (privater Speicher) – 1 Stunde gültig, im Speicher zwischengemerkt
const cache = new Map<string, { url: string; expires: number }>();
const pending = new Map<string, Promise<string | null>>();

async function signedUrl(path: string): Promise<string | null> {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now() + 60_000) return hit.url;
  if (pending.has(path)) return pending.get(path)!;
  const p = supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)
    .then(({ data }) => {
      pending.delete(path);
      if (!data?.signedUrl) return null;
      cache.set(path, { url: data.signedUrl, expires: Date.now() + 3600_000 });
      return data.signedUrl;
    });
  pending.set(path, p);
  return p;
}

export function usePhotoUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() => (path ? cache.get(path)?.url ?? null : null));
  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      return;
    }
    signedUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}
