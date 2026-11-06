import { useState, type FormEvent } from 'react';
import { deutscherFehler } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Heart } from '../icons/Icon';

/**
 * Anmeldung mit E-Mail und Passwort. Es werden keine Mails verschickt
 * (in Supabase ist „Confirm email" ausgeschaltet). Danach bleibt man dauerhaft angemeldet.
 */
export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = mode === 'register';
  const mismatch = register && password2.length > 0 && password !== password2;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (register && password !== password2) return;
    setBusy(true);
    setError(null);
    const creds = { email: email.trim(), password };
    const { data, error } = register
      ? await supabase.auth.signUp(creds)
      : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (error) setError(deutscherFehler(error.message));
    else if (register && !data.session)
      setError('Konto angelegt, aber Supabase verlangt noch eine Bestätigungsmail. Bitte „Confirm email" in Supabase ausschalten.');
    // Erfolg: AuthProvider bekommt die neue Session automatisch
  };

  const switchMode = () => {
    setMode(register ? 'login' : 'register');
    setError(null);
    setPassword2('');
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
        <form className="form" onSubmit={submit}>
          <h2 className="card-title">{register ? 'Konto erstellen' : 'Anmelden'}</h2>
          <p className="form-hint">
            {register ? 'Einmal anlegen, danach bleibst du auf diesem Gerät angemeldet.' : 'Schön, dass du da bist.'}
          </p>
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
          <label className="field">
            <span>Passwort</span>
            <input
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={register ? 'Mindestens 6 Zeichen' : 'Dein Passwort'}
            />
          </label>
          {register && (
            <label className="field">
              <span>Passwort wiederholen</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </label>
          )}
          {mismatch && <p className="form-error" role="alert">Die Passwörter stimmen nicht überein.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-btn press" disabled={busy || !email.trim() || password.length < 6 || mismatch}>
            {busy ? 'Einen Moment …' : register ? 'Konto erstellen' : 'Anmelden'}
          </button>
        </form>
      </section>

      <p className="switch-line">
        {register ? 'Du hast schon ein Konto?' : 'Noch kein Konto?'}{' '}
        <button className="link-btn" onClick={switchMode}>
          {register ? 'Anmelden' : 'Konto erstellen'}
        </button>
      </p>
    </main>
  );
}
