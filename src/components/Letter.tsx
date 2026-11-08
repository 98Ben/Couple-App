import { useState, type FormEvent } from 'react';
import { Photo, PhotoField } from './Photo';
import { useAuth } from '../lib/auth';
import { formatDateTime, toIso } from '../lib/dates';
import { uploadPhoto } from '../lib/photos';
import { supabase } from '../lib/supabase';
import type { Letter } from '../lib/types';
import { Heart } from '../icons/Icon';

/** Briefpapier zum Lesen. */
export function LetterPaper({ letter, from }: { letter: Letter; from: string }) {
  return (
    <article className="letter-paper">
      <span className="letter-stamp" aria-hidden="true">
        <Heart size={22} color="#FF6B6B" />
      </span>
      <p className="letter-date">{formatDateTime(letter.deliver_at)}</p>
      {letter.photo_path && <Photo path={letter.photo_path} alt="Foto im Brief" className="letter-photo" />}
      <p className="letter-text">{letter.message}</p>
      <p className="letter-sign">
        Von {from} <Heart size={14} color="#FF6B6B" />
      </p>
    </article>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Brief schreiben, der erst zu einer bestimmten Zeit ankommt. */
export function LetterForm({ onSent }: { onSent: (deliverAt: string) => void }) {
  const { couple, partner } = useAuth();
  const name = partner?.display_name ?? 'Dein Schatz';
  const tomorrow = new Date(Date.now() + 86400000);
  const [message, setMessage] = useState('');
  const [date, setDate] = useState(toIso(tomorrow));
  const [time, setTime] = useState('08:00');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const when = date && time ? new Date(`${date}T${time}`) : null;
  const inPast = !!when && when.getTime() <= Date.now() + 60000;

  const quick = (d: Date, t: string) => {
    setDate(toIso(d));
    setTime(t);
  };
  const now = new Date();

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!couple || !when || inPast || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const photo = file ? await uploadPhoto(couple.id, file) : null;
      const { error } = await supabase.rpc('send_letter', {
        l_message: message.trim(),
        l_photo_path: photo,
        l_deliver_at: when.toISOString(),
      });
      if (error) throw new Error(error.message);
      onSent(when.toISOString());
    } catch (err) {
      const m = (err as Error).message;
      setError(m.includes('Zukunft') || m.includes('verbunden') ? m : 'Senden hat nicht geklappt. Bist du online?');
    }
    setBusy(false);
  };

  return (
    <form className="form" onSubmit={send}>
      <p className="form-hint">{name} merkt nichts davon, bis der Brief ankommt – dann gibt es eine Benachrichtigung und er öffnet sich in der App. 🤫</p>
      <label className="field">
        <span>Dein Brief</span>
        <textarea
          className="letter-input"
          rows={7}
          maxLength={5000}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Mein Schatz, …"
        />
      </label>
      <PhotoField file={file} onChange={setFile} />
      <p className="field-label">Wann soll er ankommen?</p>
      <div className="chips">
        <button type="button" className="chip-btn small press" onClick={() => quick(new Date(now.getTime() + 86400000), '08:00')}>
          🌅 Morgen früh
        </button>
        <button type="button" className="chip-btn small press" onClick={() => quick(now.getHours() < 19 ? now : new Date(now.getTime() + 86400000), '20:00')}>
          🌙 {now.getHours() < 19 ? 'Heute' : 'Morgen'} Abend
        </button>
        <button type="button" className="chip-btn small press" onClick={() => quick(new Date(now.getTime() + 7 * 86400000), `${pad(now.getHours())}:00`)}>
          📅 In einer Woche
        </button>
      </div>
      <div className="field-row">
        <label className="field">
          <span>Datum</span>
          <input type="date" required value={date} min={toIso(now)} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Uhrzeit</span>
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      {when && !inPast && <p className="form-hint">Kommt an: {formatDateTime(when.toISOString())} (auf etwa 5 Minuten genau)</p>}
      {inPast && <p className="form-error">Dieser Zeitpunkt liegt schon in der Vergangenheit.</p>}
      {error && <p className="form-error">{error}</p>}
      <button className="primary-btn press" disabled={busy || !message.trim() || !when || inPast}>
        {busy ? 'Wird versiegelt …' : 'Brief abschicken ✉️'}
      </button>
    </form>
  );
}
