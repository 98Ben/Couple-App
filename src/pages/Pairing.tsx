import { useEffect, useState, type FormEvent } from 'react';
import { deutscherFehler, useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Heart, Icon } from '../icons/Icon';
import { tones } from '../theme';

/**
 * Nach dem Login: Namen festlegen, dann Paar anlegen (Code bekommen) oder mit Code beitreten.
 * Wer ein Paar angelegt hat, sieht hier den Code, bis der Partner beigetreten ist.
 */
export default function Pairing() {
  const { me, couple, partner, refresh, signOut } = useAuth();
  const [name, setName] = useState(me?.display_name ?? '');
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const waiting = !!couple && !partner;

  // Sobald der Partner beitritt, sofort weiter (Realtime + Sicherheitsnetz alle 10 s)
  useEffect(() => {
    if (!waiting || !couple) return;
    const channel = supabase
      .channel('pairing')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => refresh())
      .subscribe();
    const t = window.setInterval(() => refresh(), 10000);
    return () => {
      window.clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, [waiting, couple, refresh]);

  const saveName = async () => {
    if (!me || name.trim() === (me.display_name ?? '')) return true;
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', me.id);
    if (error) {
      setError(deutscherFehler(error.message));
      return false;
    }
    return true;
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    if (await saveName()) {
      const { error } = await supabase.rpc('create_couple');
      if (error) setError(deutscherFehler(error.message));
      await refresh();
    }
    setBusy(false);
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (await saveName()) {
      const { error } = await supabase.rpc('join_couple', { code: joinCode });
      if (error) setError(deutscherFehler(error.message));
      await refresh();
    }
    setBusy(false);
  };

  const copy = async () => {
    if (!couple?.invite_code) return;
    try {
      await navigator.clipboard.writeText(couple.invite_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Kopieren nicht erlaubt – Code steht ja groß da */
    }
  };

  const rose = tones.rose;

  return (
    <main className="page auth-page">
      <span className="glow g1" aria-hidden="true" />
      <span className="glow g2" aria-hidden="true" />

      <header className="auth-head appear">
        <span className="pair-hearts" aria-hidden="true">
          <Heart size={44} outline color="#FF6B6B" weight={1.8} />
          <span className="beat">
            <Heart size={44} color="#FF8E85" />
          </span>
        </span>
        <h1 className="top-title">{waiting ? 'Fast geschafft' : 'Willkommen'}</h1>
        <p className="top-small">{waiting ? 'Jetzt fehlt nur noch dein Schatz ✨' : 'Lass uns euch beide verbinden ✨'}</p>
      </header>

      {waiting ? (
        <section className="card appear" style={{ animationDelay: '0.08s' }}>
          <h2 className="card-title">
            <Icon name="letter" size={20} stroke={rose.icon} accent={rose.main} />
            Euer Einladungscode
          </h2>
          <p className="form-hint">Schick ihn deinem Schatz. Dein Schatz meldet sich an und tippt auf „Ich habe einen Code".</p>
          <button className="invite-code press" onClick={copy} aria-label={`Code ${couple?.invite_code} kopieren`}>
            {couple?.invite_code}
          </button>
          <p className="form-hint center">{copied ? 'Kopiert! 💕' : 'Antippen zum Kopieren'}</p>
          <p className="waiting">
            <span className="dot-pulse" aria-hidden="true" /> Warte auf deinen Schatz …
          </p>
        </section>
      ) : (
        <section className="card appear" style={{ animationDelay: '0.08s' }}>
          <label className="field">
            <span>Wie heißt du?</span>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Dein Vorname" autoComplete="given-name" />
          </label>

          {mode === 'choose' ? (
            <div className="choice">
              <button className="primary-btn press" onClick={create} disabled={busy || !name.trim()}>
                {busy ? 'Einen Moment …' : 'Neues Paar anlegen'}
              </button>
              <button className="secondary-btn press" onClick={() => setMode('join')} disabled={busy || !name.trim()}>
                Ich habe einen Code
              </button>
            </div>
          ) : (
            <form className="form" onSubmit={join}>
              <label className="field">
                <span>Einladungscode</span>
                <input
                  className="code-input"
                  value={joinCode}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoComplete="off"
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ABC234"
                  required
                />
              </label>
              <button className="primary-btn press" disabled={busy || joinCode.length !== 6 || !name.trim()}>
                {busy ? 'Einen Moment …' : 'Verbinden'}
              </button>
              <button type="button" className="link-btn" onClick={() => { setMode('choose'); setError(null); }}>
                Zurück
              </button>
            </form>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      )}

      <button className="link-btn center" onClick={signOut}>
        Abmelden
      </button>
    </main>
  );
}
