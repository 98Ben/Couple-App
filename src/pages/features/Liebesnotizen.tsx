import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ConfirmButton from '../../components/ConfirmButton';
import Empty from '../../components/Empty';
import HeartBurst from '../../components/HeartBurst';
import NoteCard, { NOTE_COLORS } from '../../components/NoteCard';
import { Photo } from '../../components/Photo';
import Sheet from '../../components/Sheet';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { relativeTime, plural } from '../../lib/dates';
import { removePhoto } from '../../lib/photos';
import { supabase } from '../../lib/supabase';
import type { LoveNote, NoteColor } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';
import { Heart, Icon } from '../../icons/Icon';
import { tones } from '../../theme';

const tone = tones.rose;
const SUGGESTIONS = ['Ich vermisse dich 💕', 'Du bist toll, weil …', 'Danke für …', 'Ich freu mich auf heute Abend', 'Guten Morgen, Schatz ☀️'];

export default function Liebesnotizen() {
  const { session, partner, me } = useAuth();
  const myId = session?.user.id;
  const partnerName = partner?.display_name ?? 'dein Schatz';
  const notes = useCoupleTable<LoveNote>('love_notes', { column: 'created_at', ascending: false });

  const [text, setText] = useState('');
  const [color, setColor] = useState<NoteColor>('rose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(0);
  const [viewing, setViewing] = useState<LoveNote | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.replace(/…\s*$/, '').trim();
    if (!t) return;
    setBusy(true);
    setError(null);
    const res = await notes.insert({ text: t, color });
    if (res.error) setError(res.error);
    else {
      setText('');
      setSent((n) => n + 1);
    }
    setBusy(false);
  };

  const heart = async (n: LoveNote) => {
    // Herz setzt die Datenbank-Funktion (nur der Partner darf das)
    await supabase.rpc('toggle_note_heart', { note: n.id });
    notes.reload();
  };

  const del = async (n: LoveNote) => {
    setViewing(null);
    await notes.remove(n.id);
    await removePhoto(n.doodle_path);
  };

  const nameOf = (n: LoveNote) => (n.created_by === myId ? me?.display_name ?? 'dir' : partnerName);
  const c = NOTE_COLORS[color];

  return (
    <>
      <main className="page">
        <span className="glow g1" aria-hidden="true" />
        <SubHeader
          title="Liebesnotizen"
          back="/nachrichten"
          sub={notes.rows.length ? plural(notes.rows.length, 'Notiz', 'Notizen') : 'Kleine Botschaften'}
        />

        <form className="compose appear" onSubmit={send} style={{ background: c.bg }}>
          <span className="note-pin" aria-hidden="true">
            <Heart size={18} color={c.pin} />
          </span>
          <label className="sr-only" htmlFor="note-text">
            Deine Notiz an {partnerName}
          </label>
          <textarea
            id="note-text"
            className="compose-text"
            rows={3}
            maxLength={280}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Schreib ${partnerName} etwas Liebes …`}
          />
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button type="button" key={s} className="chip-btn small press" onClick={() => setText(s.replace('…', '').trimEnd() + (s.includes('…') ? ' ' : ''))}>
                {s}
              </button>
            ))}
          </div>
          <div className="compose-row">
            <div className="color-dots" role="radiogroup" aria-label="Zettelfarbe">
              {(Object.keys(NOTE_COLORS) as NoteColor[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  role="radio"
                  aria-checked={color === k}
                  aria-label={NOTE_COLORS[k].label}
                  className={`color-dot press${color === k ? ' on' : ''}`}
                  style={{ background: NOTE_COLORS[k].pin }}
                  onClick={() => setColor(k)}
                />
              ))}
            </div>
            <span className="compose-count">{text.length}/280</span>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="compose-actions">
            <Link to="/f/doodle" className="secondary-btn press doodle-link">
              <Icon name="doodle" size={20} stroke={tone.icon} accent={tone.main} /> Zeichnen
            </Link>
            <button className="primary-btn press send-btn" disabled={busy || !text.trim()}>
              {busy ? 'Wird gesendet …' : 'Senden 💌'}
              {sent > 0 && <HeartBurst key={sent} />}
            </button>
          </div>
        </form>

        {notes.error && <p className="form-error">{notes.error}</p>}
        {!notes.loading && notes.rows.length === 0 && (
          <Empty
            icon="letter"
            toneKey="rose"
            title="Noch keine Notizen"
            text={`Schreib ${partnerName} die erste kleine Botschaft. Sie erscheint sofort auf eurer Pinnwand.`}
          />
        )}

        <section className="pinboard" aria-label="Pinnwand">
          {notes.rows.map((n, i) => (
            <NoteCard
              key={n.id}
              note={n}
              index={i}
              author={nameOf(n)}
              mine={n.created_by === myId}
              onOpen={() => setViewing(n)}
              onHeart={() => heart(n)}
            />
          ))}
        </section>
      </main>
      <BottomNav active="nachrichten" />

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing ? (viewing.created_by === myId ? 'Deine Notiz' : `Von ${partnerName}`) : ''}>
        {viewing && (
          <div className="detail">
            <div className="note big" style={{ background: NOTE_COLORS[viewing.color]?.bg }}>
              {viewing.doodle_path && <Photo path={viewing.doodle_path} alt="Zeichnung" className="note-doodle" />}
              {viewing.text && <p className="note-text">{viewing.text}</p>}
            </div>
            <p className="detail-date">{relativeTime(viewing.created_at)}</p>
            {viewing.created_by === myId ? (
              <div className="detail-actions">
                <ConfirmButton onConfirm={() => del(viewing)} />
              </div>
            ) : (
              <button
                className="primary-btn press"
                onClick={() => {
                  heart(viewing);
                  setViewing(null);
                }}
              >
                {viewing.heart_at ? 'Herz zurücknehmen' : 'Mit Herz antworten 💕'}
              </button>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
