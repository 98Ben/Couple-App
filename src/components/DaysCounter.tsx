import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Heart } from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
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

export default function DaysCounter() {
  const { couple, refresh } = useAuth();
  const start = couple?.start_date ?? null; // gemeinsam in Supabase gespeichert
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0); // Zähler: jeder Klick startet die Animation neu
  const timer = useRef<number>();
  const s = useMemo(() => (start ? stats(start) : null), [start]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onPick = async (value: string) => {
    if (!value || !couple) return;
    setError(null);
    const { error } = await supabase.from('couples').update({ start_date: value }).eq('id', couple.id);
    if (error) {
      setError('Konnte nicht gespeichert werden. Bist du online?');
      return;
    }
    await refresh();
    setEditing(false);
  };

  const sendHeart = () => {
    // Später: Push an den Partner. Jetzt erstmal die Herz-Animation.
    window.clearTimeout(timer.current);
    setBurst((n) => n + 1);
    timer.current = window.setTimeout(() => setBurst(0), 1800);
  };

  return (
    <section className="hero appear">
      <span className="hero-heart" aria-hidden="true">
        <Heart size={56} outline color="rgba(255,255,255,0.85)" weight={1.3} />
      </span>

      {s && !editing ? (
        <>
          <span className="chip">💞 Zusammen seit {s.since}</span>
          <p className="hero-number">
            {s.days.toLocaleString('de-DE')}
            <span>{s.days === 1 ? 'Tag' : 'Tage'}</span>
          </p>
          <span className="sun-pill">
            {s.untilAnniversary === 0
              ? `🎉 Heute ist euer ${s.years}. Jahrestag!`
              : `🎉 Noch ${s.untilAnniversary} ${s.untilAnniversary === 1 ? 'Tag' : 'Tage'} bis zum ${s.years}. Jahrestag`}
          </span>
        </>
      ) : (
        <>
          <span className="chip">💞 Seit wann seid ihr zusammen?</span>
          <label className="date-label">
            <span className="sr-only">Startdatum</span>
            <input
              className="date-input"
              type="date"
              defaultValue={start ?? ''}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => onPick(e.target.value)}
            />
          </label>
          <span className="hero-hint">{error ?? 'Gilt für euch beide.'}</span>
        </>
      )}

      <div className="hero-actions">
        <button className="love-btn press" onClick={sendHeart}>
          <Heart size={18} color="#FF6B6B" />
          {burst ? 'Herz gesendet!' : 'Ich denk an dich'}
        </button>
        <button className="round-btn press" onClick={() => setEditing((v) => !v)} aria-label="Startdatum ändern">
          <Pencil size={18} />
        </button>
      </div>

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
  );
}
