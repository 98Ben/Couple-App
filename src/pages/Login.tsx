import { useState, type FormEvent } from 'react';
import { deutscherFehler } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Heart } from '../icons/Icon';

/**
 * Anmeldung ohne Passwort: E-Mail eingeben → Mail mit Code (und Link) → Code hier eintippen.
 * Der Code ist wichtig für die installierte iPhone-App: Ein Link aus der Mail öffnet Safari,
 * nicht die App vom Home-Bildschirm, und die beiden teilen keine Anmeldung.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMail = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setError(deutscherFehler(error.message));
    else setStep('code');
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError(deutscherFehler(error.message));
    // Erfolg: AuthProvider bekommt die neue Session automatisch
  };

  return (
    <main className="page auth-page">
      <span className="glow g1" aria-hidden="true" />
      <span className="glow g2" aria-hidden="true" />

      <header className="auth-head appear">
        <span className="beat">
          <Heart size={56} outline color="#FF6B6B" weight={1.8} />
        </span>
        <h1 className="top-title">Couple App</h1>
        <p className="top-small">Nur für uns zwei ✨</p>
      </header>

      <section className="card appear" style={{ animationDelay: '0.08s' }}>
        {step === 'email' ? (
          <form className="form" onSubmit={sendMail}>
            <h2 className="card-title">Anmelden</h2>
            <p className="form-hint">Kein Passwort nötig. Wir schicken dir einen Code per E-Mail.</p>
            <label className="field">
              <span>E-Mail</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@beispiel.de"
              />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-btn press" disabled={busy || !email.trim()}>
              {busy ? 'Wird gesendet …' : 'Code schicken'}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={verify}>
            <h2 className="card-title">Code eingeben</h2>
            <p className="form-hint">
              Wir haben dir eine Mail an <strong>{email}</strong> geschickt. Tipp den Code daraus hier ein.
            </p>
            <label className="field">
              <span>Code aus der Mail</span>
              <input
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={8}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-btn press" disabled={busy || code.length < 6}>
              {busy ? 'Wird geprüft …' : 'Anmelden'}
            </button>
            <div className="form-links">
              <button type="button" className="link-btn" onClick={() => sendMail()} disabled={busy}>
                Neuen Code schicken
              </button>
              <button type="button" className="link-btn" onClick={() => { setStep('email'); setCode(''); setError(null); }}>
                Andere E-Mail
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
