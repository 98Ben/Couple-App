import { useEffect, useState, type CSSProperties } from 'react';
import { ImagePlus } from 'lucide-react';
import { usePhotoUrl } from '../lib/photos';
import { Icon } from '../icons/Icon';
import { tones } from '../theme';

/** Zeigt ein Foto aus dem privaten Speicher; solange es lädt, ein weicher Platzhalter. */
export function Photo({ path, alt, className, style }: { path: string | null | undefined; alt: string; className?: string; style?: CSSProperties }) {
  const url = usePhotoUrl(path);
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={`photo ${className ?? ''}`} style={style}>
      {url ? (
        <img src={url} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} className={loaded ? 'in' : ''} />
      ) : (
        <span className="photo-empty" aria-hidden="true">
          <Icon name="photos" size={30} stroke={tones.lav.icon} accent={tones.lav.main} />
        </span>
      )}
    </span>
  );
}

/** Foto auswählen (Kamera oder Mediathek) mit Vorschau. */
export function PhotoField({
  file,
  existingPath,
  onChange,
}: {
  file: File | null;
  existingPath?: string | null;
  onChange: (f: File | null) => void;
}) {
  const existingUrl = usePhotoUrl(file ? null : existingPath);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const shown = preview ?? existingUrl;
  return (
    <label className="photo-field press">
      {shown ? (
        <img src={shown} alt="Ausgewähltes Foto" />
      ) : (
        <span className="photo-field-empty">
          <ImagePlus size={28} />
          <span>Foto auswählen</span>
        </span>
      )}
      {shown && <span className="photo-field-change">Foto ändern</span>}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
