import { useRef, useState } from 'react';
import BottomNav from '../../components/BottomNav';
import ConfirmButton from '../../components/ConfirmButton';
import DoodlePad, { type DoodlePadHandle } from '../../components/DoodlePad';
import Empty from '../../components/Empty';
import HeartBurst from '../../components/HeartBurst';
import { Photo } from '../../components/Photo';
import Sheet from '../../components/Sheet';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { relativeTime } from '../../lib/dates';
import { removePhoto, uploadBlob } from '../../lib/photos';
import type { LoveNote } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';

export default function Doodle() {
  const { couple, session, partner } = useAuth();
  const myId = session?.user.id;
  const partnerName = partner?.display_name ?? 'deinem Schatz';
  const notes = useCoupleTable<LoveNote>('love_notes', { column: 'created_at', ascending: false });
  const doodles = notes.rows.filter((n) => n.doodle_path);

  const pad = useRef<DoodlePadHandle>(null);
  const [empty, setEmpty] = useState(true);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(0);
  const [viewing, setViewing] = useState<LoveNote | null>(null);

  const send = async () => {
    if (!couple || !pad.current || pad.current.isEmpty()) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await pad.current.toBlob();
      if (!blob) throw new Error('Zeichnung konnte nicht gespeichert werden');
      const path = await uploadBlob(couple.id, blob, 'png');
      const res = await notes.insert({ doodle_path: path, text: caption.trim() || null, color: 'lav' });
      if (res.error) {
        await removePhoto(path);
        throw new Error(res.error);
      }
      pad.current.clear();
      setCaption('');
      setSent((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const del = async (n: LoveNote) => {
    setViewing(null);
    await notes.remove(n.id);
    await removePhoto(n.doodle_path);
  };

  return (
    <>
      <main className="page">
        <span className="glow g3" aria-hidden="true" style={{ top: 420 }} />
        <SubHeader title="Doodle" back="/nachrichten" sub={`Zeichne etwas für ${partnerName}`} />

        <section className="card doodle-card appear">
          <DoodlePad ref={pad} onChange={setEmpty} />
          <label className="field">
            <span className="sr-only">Kleine Nachricht dazu</span>
            <input value={caption} maxLength={280} onChange={(e) => setCaption(e.target.value)} placeholder="Kleine Nachricht dazu (optional)" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-btn press send-btn" onClick={send} disabled={busy || empty}>
            {busy ? 'Wird gesendet …' : `An ${partnerName} schicken 💌`}
            {sent > 0 && <HeartBurst key={sent} />}
          </button>
          {sent > 0 && !busy && <p className="toast">Abgeschickt! Es hängt jetzt auch an eurer Pinnwand.</p>}
        </section>

        <h2 className="section-title">Eure Doodles</h2>
        {!notes.loading && doodles.length === 0 && (
          <Empty icon="doodle" toneKey="rose" title="Noch keine Zeichnungen" text="Ein Herz, ein Strichmännchen, ein Gruß: Hauptsache von dir." />
        )}
        <div className="doodle-grid">
          {doodles.map((n, i) => (
            <button key={n.id} className="doodle-thumb press appear" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }} onClick={() => setViewing(n)}>
              <Photo path={n.doodle_path} alt={n.text ?? 'Doodle'} className="doodle-img" />
              <span className="doodle-meta">
                {n.created_by === myId ? 'von dir' : `von ${partner?.display_name ?? 'deinem Schatz'}`} · {relativeTime(n.created_at)}
              </span>
            </button>
          ))}
        </div>
      </main>
      <BottomNav active="nachrichten" />

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.created_by === myId ? 'Dein Doodle' : `Doodle von ${partner?.display_name ?? 'deinem Schatz'}`}>
        {viewing && (
          <div className="detail">
            <Photo path={viewing.doodle_path} alt={viewing.text ?? 'Doodle'} className="detail-doodle" />
            {viewing.text && <p className="note-text">{viewing.text}</p>}
            <p className="detail-date">{relativeTime(viewing.created_at)}</p>
            {viewing.created_by === myId && (
              <div className="detail-actions">
                <ConfirmButton onConfirm={() => del(viewing)} />
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
