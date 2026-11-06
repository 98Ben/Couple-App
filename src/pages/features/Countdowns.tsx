import { useEffect, useMemo, useState, type FormEvent } from 'react';
import BottomNav from '../../components/BottomNav';
import ConfirmButton from '../../components/ConfirmButton';
import Empty from '../../components/Empty';
import Sheet from '../../components/Sheet';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { formatDate, parseDate, toIso, todayIso } from '../../lib/dates';
import type { Countdown } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';
import { tones } from '../../theme';

const tone = tones.lav;
const EMOJIS = ['🎉', '✈️', '🏖️', '🎂', '💍', '🎄', '🎁', '❤️', '🏠', '🎫', '⛷️', '🌸'];

type Entry = {
  id: string;
  title: string;
  emoji: string;
  target: Date; // nächstes Eintreten
  from: Date; // Start für den Fortschrittsbalken
  yearly: boolean;
  auto?: boolean; // Jahrestag aus dem Startdatum
  source?: Countdown;
};

function at(dateIso: string, time: string | null) {
  const d = parseDate(dateIso);
  if (time) {
    const [h, m] = time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

/** Für jährliche Termine das nächste Vorkommen (heute zählt noch) und das vorige als Start. */
function nextOccurrence(dateIso: string, time: string | null, now: Date) {
  const base = at(dateIso, time);
  const make = (y: number) => {
    const d = new Date(base);
    d.setFullYear(y);
    return d;
  };
  let target = make(now.getFullYear());
  const endOfTarget = time ? target : new Date(target.getFullYear(), target.getMonth(), target.getDate() + 1);
  if (endOfTarget <= now) target = make(now.getFullYear() + 1);
  return { target, from: make(target.getFullYear() - 1) };
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60) };
}

export default function Countdowns() {
  const { couple } = useAuth();
  const { rows, loading, error, insert, remove } = useCoupleTable<Countdown>('countdowns', { column: 'target_date' });
  const [now, setNow] = useState(() => new Date());
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Entry | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const { upcoming, past } = useMemo(() => {
    const list: Entry[] = [];
    if (couple?.start_date) {
      const { target, from } = nextOccurrence(couple.start_date, null, now);
      const years = target.getFullYear() - parseDate(couple.start_date).getFullYear();
      list.push({ id: 'jahrestag', title: `${years}. Jahrestag`, emoji: '💞', target, from, yearly: true, auto: true });
    }
    const pastList: Entry[] = [];
    for (const c of rows) {
      if (c.yearly) {
        const { target, from } = nextOccurrence(c.target_date, c.target_time, now);
        list.push({ id: c.id, title: c.title, emoji: c.emoji ?? '🎉', target, from, yearly: true, source: c });
      } else {
        const target = at(c.target_date, c.target_time);
        const end = c.target_time ? target : new Date(target.getFullYear(), target.getMonth(), target.getDate() + 1);
        const e: Entry = { id: c.id, title: c.title, emoji: c.emoji ?? '🎉', target, from: new Date(c.created_at), yearly: false, source: c };
        (end <= now ? pastList : list).push(e);
      }
    }
    list.sort((a, b) => a.target.getTime() - b.target.getTime());
    pastList.sort((a, b) => b.target.getTime() - a.target.getTime());
    return { upcoming: list, past: pastList };
  }, [rows, couple?.start_date, now]);

  return (
    <>
      <main className="page">
        <span className="glow g1" aria-hidden="true" />
        <SubHeader title="Tage & Jahrestage" back="/erinnerungen" onAdd={() => setAdding(true)} addLabel="Countdown hinzufügen" sub="Worauf wir uns freuen" />

        {error && <p className="form-error">{error}</p>}
        {!loading && upcoming.length === 0 && (
          <Empty
            icon="hourglass"
            title="Noch nichts geplant"
            text="Legt Countdowns für Urlaub, Geburtstage oder das nächste Wiedersehen an. Euer Jahrestag erscheint automatisch, sobald das Startdatum gesetzt ist."
            action="Ersten Countdown anlegen"
            onAction={() => setAdding(true)}
          />
        )}

        <div className="bento">
          {upcoming.map((e, i) => (
            <CountdownCard key={e.id} entry={e} now={now} big={i === 0} onOpen={() => setViewing(e)} />
          ))}
        </div>

        {past.length > 0 && (
          <section className="past">
            <h2 className="section-title">Schon erlebt</h2>
            {past.map((e) => (
              <button key={e.id} className="past-row press" onClick={() => setViewing(e)}>
                <span className="past-emoji">{e.emoji}</span>
                <span>
                  <strong>{e.title}</strong>
                  <span>{formatDate(toIso(e.target))}</span>
                </span>
              </button>
            ))}
          </section>
        )}
      </main>
      <BottomNav active="erinnerungen" />

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.emoji} ${viewing.title}` : ''}>
        {viewing && (
          <div className="detail">
            <p className="detail-date">{formatDate(toIso(viewing.target), true)}{viewing.source?.target_time ? `, ${viewing.source.target_time.slice(0, 5)} Uhr` : ''}</p>
            <p className="detail-note">
              {viewing.auto
                ? 'Euer Jahrestag kommt automatisch aus dem Startdatum auf der Startseite.'
                : viewing.yearly
                  ? 'Wiederholt sich jedes Jahr.'
                  : 'Einmaliger Termin.'}
            </p>
            {viewing.source && (
              <div className="detail-actions">
                <ConfirmButton
                  onConfirm={async () => {
                    const id = viewing.source!.id;
                    setViewing(null);
                    await remove(id);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Neuer Countdown">
        {adding && (
          <CountdownForm
            onCancel={() => setAdding(false)}
            onSave={async (v) => {
              const res = await insert(v);
              if (res.error) return res.error;
              setAdding(false);
              return null;
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function CountdownCard({ entry, now, big, onOpen }: { entry: Entry; now: Date; big: boolean; onOpen: () => void }) {
  const ms = entry.target.getTime() - now.getTime();
  const isToday = toIso(entry.target) === todayIso() && ms <= 24 * 3600 * 1000;
  const p = parts(ms);
  const total = entry.target.getTime() - entry.from.getTime();
  const progress = total > 0 ? Math.min(1, Math.max(0.03, 1 - ms / total)) : 1;

  return (
    <button className={`cd-card press${big ? ' big' : ''}`} onClick={onOpen} style={big ? undefined : { background: tone.tileBg, boxShadow: `0 10px 24px ${tone.shadow}` }}>
      <span className="cd-head">
        <span className="cd-emoji" aria-hidden="true">{entry.emoji}</span>
        <span className="cd-title">{entry.title}</span>
      </span>
      {isToday && ms <= 0 ? (
        <span className="cd-today">Heute! 🎉</span>
      ) : (
        <span className="cd-nums" aria-label={`Noch ${p.d} Tage, ${p.h} Stunden, ${p.m} Minuten`}>
          <span><strong>{p.d}</strong><small>Tage</small></span>
          <span><strong>{p.h}</strong><small>Std</small></span>
          <span><strong>{p.m}</strong><small>Min</small></span>
        </span>
      )}
      <span className="cd-bar" aria-hidden="true">
        <span style={{ width: `${progress * 100}%` }} />
      </span>
      <span className="cd-date">
        {formatDate(toIso(entry.target))}
        {entry.yearly ? ' · jährlich' : ''}
      </span>
    </button>
  );
}

function CountdownForm({
  onSave,
  onCancel,
}: {
  onSave: (v: Pick<Countdown, 'title' | 'target_date' | 'target_time' | 'emoji' | 'yearly'>) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [emoji, setEmoji] = useState('🎉');
  const [yearly, setYearly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await onSave({ title: title.trim(), target_date: date, target_time: time || null, emoji, yearly });
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="emoji-row" role="radiogroup" aria-label="Symbol">
        {EMOJIS.map((em) => (
          <button
            type="button"
            key={em}
            role="radio"
            aria-checked={emoji === em}
            className={`emoji-chip press${emoji === em ? ' on' : ''}`}
            onClick={() => setEmoji(em)}
          >
            {em}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Worauf freut ihr euch?</span>
        <input value={title} maxLength={60} required onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Urlaub in Italien" />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Datum</span>
          <input type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Uhrzeit (optional)</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} />
        <span className="toggle-ui" aria-hidden="true" />
        <span>Jedes Jahr wiederholen (z. B. Geburtstag)</span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-btn press" disabled={busy || !title.trim() || !date}>
        {busy ? 'Wird gespeichert …' : 'Countdown starten'}
      </button>
      <button type="button" className="link-btn" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  );
}
