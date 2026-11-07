import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Heart } from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { notifyPartner } from '../lib/push';
import { supabase } from '../lib/supabase';
import Sheet from './Sheet';

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function stats(startIso: string) {
  const [y, m, d] = startIso.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const today = startOfDay(new Date());
  const days = Math.max(0, Math.round((today.getTime() - start.getTime()) / DAY));

  let next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
  const untilAnniversary = Math.round((next.getTime() - today.getTime()) / DAY);
  const years = next.getFullYear() - start.getFullYear();
  const since = start.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  return { days, untilAnniversary, years, since };
}

const BURST = [
  { left: '18%', delay: '0s', size: 22 },
  { left: '34%', delay: '.12s', size: 16 },
  { left: '50%', delay: '.05s', size: 26 },
  { left: '66%', delay: '.2s', size: 18 },
  { left: '80%', delay: '.1s', size: 20 },
];

/**
 * Tage-Zähler: bewusst schlicht. Einziger Knopf ist „Ich denk an dich“.
 * Das Startdatum ändert man versteckt (lange auf die Karte drücken oder „Startdatum“ unten auf der Startseite).
 */
export default function DaysCounter({ editOpen, onEditOpenChange }: { editOpen: boolean; onEditOpenChange: (open: boolean) => void }) {
  const { couple } = useAuth();
  const start = couple?.start_date ?? null; // gemeinsam in Supabase gespeichert
  const [burst, setBurst] = useState(0); // Zähler: jeder Klick startet die Animation neu
  const timer = useRef<number>();
  const press = useRef<number>();
  const s = useMemo(() => (start ? stats(start) : null), [start]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(press.current);
    },
    [],
  );

  const sendHeart = () => {
    window.clearTimeout(timer.current);
    notifyPartner('heart');
    setBurst((n) => n + 1);
    timer.current = window.setTimeout(() => setBurst(0), 1800);
  };

  // Langes Drücken (0,7 s) auf die Zahl öffnet das Startdatum
  const pressStart = () => {
    window.clearTimeout(press.current);
    press.current = window.setTimeout(() => onEditOpenChange(true), 700);
  };
  const pressEnd = () => window.clearTimeout(press.current);

  return (
    <>
      <section className="hero appear">
        <span className="hero-heart" aria-hidden="true">
          <Heart size={56} outline color="rgba(255,255,255,0.85)" weight={1.3} />
        </span>

        {s ? (
          <div
            className="hero-main"
            onPointerDown={pressStart}
            onPointerUp={pressEnd}
            onPointerLeave={pressEnd}
            onPointerCancel={pressEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            <p className="hero-label">Zusammen seit {s.since}</p>
            <p className="hero-number">
              {s.days.toLocaleString('de-DE')}
              <span>{s.days === 1 ? 'Tag' : 'Tage'}</span>
            </p>
            <p className="hero-sub">
              {s.untilAnniversary === 0
                ? `Heute ist euer ${s.years}. Jahrestag 🎉`
                : `Noch ${s.untilAnniversary} ${s.untilAnniversary === 1 ? 'Tag' : 'Tage'} bis zum ${s.years}. Jahrestag`}
            </p>
          </div>
        ) : (
          <div className="hero-main">
            <p className="hero-label">Willkommen ihr zwei</p>
            <p className="hero-sub big">Seit wann seid ihr zusammen?</p>
            <button className="hero-set press" onClick={() => onEditOpenChange(true)}>
              Datum festlegen
            </button>
          </div>
        )}

        <button className="love-btn press" onClick={sendHeart}>
          <Heart size={18} color="#FF6B6B" />
          {burst ? 'Herz gesendet!' : 'Ich denk an dich'}
        </button>

        {burst > 0 && (
          <div className="burst" aria-hidden="true" key={burst}>
            {BURST.map((b, i) => (
              <span key={i} style={{ left: b.left, animationDelay: b.delay }}>
                <Heart size={b.size} color="#FFFFFF" />
              </span>
            ))}
          </div>
        )}
      </section>

      <Sheet open={editOpen} onClose={() => onEditOpenChange(false)} title="Zusammen seit">
        {editOpen && <StartDateForm onDone={() => onEditOpenChange(false)} />}
      </Sheet>
    </>
  );
}

export function StartDateForm({ onDone }: { onDone: () => void }) {
  const { couple, refresh } = useAuth();
  const [value, setValue] = useState(couple?.start_date ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!value || !couple) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('couples').update({ start_date: value }).eq('id', couple.id);
    if (error) {
      setError('Konnte nicht gespeichert werden. Bist du online?');
      setBusy(false);
      return;
    }
    await refresh();
    setBusy(false);
    onDone();
  };

  return (
    <form className="form" onSubmit={save}>
      <p className="form-hint">Der Tag, an dem alles angefangen hat. Gilt für euch beide.</p>
      <label className="field">
        <span>Datum</span>
        <input type="date" required value={value} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setValue(e.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-btn press" disabled={busy || !value}>
        {busy ? 'Wird gespeichert …' : 'Speichern'}
      </button>
    </form>
  );
}
