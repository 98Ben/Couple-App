import type { CSSProperties } from 'react';
import { Photo } from './Photo';
import { Heart } from '../icons/Icon';
import { relativeTime } from '../lib/dates';
import type { LoveNote, NoteColor } from '../lib/types';

export const NOTE_COLORS: Record<NoteColor, { bg: string; pin: string; label: string }> = {
  rose: { bg: '#FFE1E4', pin: '#FF7B86', label: 'Rosé' },
  peach: { bg: '#FFE6D2', pin: '#FF9F5A', label: 'Pfirsich' },
  lav: { bg: '#F3E1FC', pin: '#C98BEA', label: 'Lavendel' },
  sun: { bg: '#FFF0BF', pin: '#FFC23D', label: 'Sonnengelb' },
};

/** Post-it-Karte für Text-Notizen und Doodles. */
export default function NoteCard({
  note,
  author,
  mine,
  index,
  onOpen,
  onHeart,
}: {
  note: LoveNote;
  author: string;
  mine: boolean;
  index: number;
  onOpen: () => void;
  onHeart: () => void;
}) {
  const c = NOTE_COLORS[note.color] ?? NOTE_COLORS.rose;
  const tilt = [-2, 1.5, -1, 2, 0.5, -1.5][index % 6];
  const style = { background: c.bg, ['--tilt' as string]: `${tilt}deg` } as CSSProperties;
  return (
    <article className="note" style={style}>
      <span className="note-pin" aria-hidden="true">
        <Heart size={18} color={c.pin} />
      </span>
      <button className="note-body" onClick={onOpen} aria-label={`Notiz von ${author} öffnen`}>
        {note.doodle_path && <Photo path={note.doodle_path} alt={`Zeichnung von ${author}`} className="note-doodle" />}
        {note.text && <span className="note-text">{note.text}</span>}
      </button>
      <footer className="note-foot">
        <span>
          {mine ? 'von dir' : `von ${author}`} · {relativeTime(note.created_at)}
        </span>
        {mine ? (
          note.heart_at && (
            <span className="note-heart got" aria-label={`${author} hat ein Herz geschickt`}>
              <Heart size={18} color="#FF6B6B" />
            </span>
          )
        ) : (
          <button
            className={`note-heart press${note.heart_at ? ' on' : ''}`}
            onClick={onHeart}
            aria-pressed={!!note.heart_at}
            aria-label={note.heart_at ? 'Herz zurücknehmen' : 'Mit Herz antworten'}
          >
            <Heart size={20} color="#FF6B6B" outline={!note.heart_at} weight={2} />
          </button>
        )}
      </footer>
    </article>
  );
}
