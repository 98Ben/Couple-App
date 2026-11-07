import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronRight, Download, KeyRound, LogOut, UserRound } from 'lucide-react';
import { StartDateForm } from '../components/DaysCounter';
import { PushPanel } from '../components/PushSettings';
import Sheet from '../components/Sheet';
import SubHeader from '../components/SubHeader';
import { deutscherFehler, useAuth } from '../lib/auth';
import { formatDate } from '../lib/dates';
import { buildExport, deliverFile, storageUsage } from '../lib/exportData';
import { supabase } from '../lib/supabase';
import { Heart } from '../icons/Icon';

const LIMIT = 1024 * 1024 * 1024; // 1 GB im kostenlosen Supabase-Plan

type Panel = 'name' | 'passwort' | 'datum' | 'push' | null;

function Row({ icon, title, value, onClick }: { icon: ReactNode; title: string; value?: string; onClick: () => void }) {
  return (
    <button className="set-row press" onClick={onClick}>
      <span className="set-icon">{icon}</span>
      <span className="set-text">
        <span className="set-title">{title}</span>
        {value && <span className="set-value">{value}</span>}
      </span>
      <ChevronRight size={18} className="set-chev" />
    </button>
  );
}

export default function Einstellungen() {
  const { me, partner, couple, session, signOut } = useAuth();
  const [panel, setPanel] = useState<Panel>(null);
  const [usage, setUsage] = useState<{ bytes: number; files: number } | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (couple) storageUsage(couple.id).then(setUsage);
  }, [couple]);

  const runExport = async () => {
    setExportError(null);
    try {
      const file = await buildExport(setExporting);
      setExporting('Fertig! Speichere die Datei z. B. in „Dateien“.');
      await deliverFile(file);
    } catch {
      setExportError('Export hat nicht geklappt. Bist du online?');
    }
    window.setTimeout(() => setExporting(null), 3000);
  };

  const mb = (b: number) => (b / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  const pct = usage ? Math.min(100, (usage.bytes / LIMIT) * 100) : 0;

  return (
    <>
      <main className="page">
        <span className="glow g1" aria-hidden="true" />
        <SubHeader title="Einstellungen" />

        <section className="set-card appear">
          <p className="set-section">Ihr zwei</p>
          <div className="couple-info">
            <Heart size={20} color="#FF6B6B" />
            <span>
              <strong>{me?.display_name ?? 'Du'}</strong> & <strong>{partner?.display_name ?? 'Partner'}</strong>
              {couple?.start_date && <span className="set-value"> · zusammen seit {formatDate(couple.start_date)}</span>}
            </span>
          </div>
          <Row icon={<UserRound size={18} />} title="Dein Name" value={me?.display_name ?? ''} onClick={() => setPanel('name')} />
          <Row icon={<span aria-hidden="true">💞</span>} title="Zusammen seit" value={couple?.start_date ? formatDate(couple.start_date) : 'noch nicht gesetzt'} onClick={() => setPanel('datum')} />
        </section>

        <section className="set-card appear" style={{ animationDelay: '0.05s' }}>
          <p className="set-section">Konto & Gerät</p>
          <Row icon={<span aria-hidden="true">🔔</span>} title="Benachrichtigungen" onClick={() => setPanel('push')} />
          <Row icon={<KeyRound size={18} />} title="Passwort ändern" value={session?.user.email ?? ''} onClick={() => setPanel('passwort')} />
        </section>

        <section className="set-card appear" style={{ animationDelay: '0.1s' }}>
          <p className="set-section">Speicher & Sicherung</p>
          <div className="usage">
            <div className="usage-head">
              <span>Fotospeicher</span>
              <span className="set-value">{usage ? `${mb(usage.bytes)} MB von 1.024 MB · ${usage.files} Dateien` : 'wird berechnet …'}</span>
            </div>
            <span className="cd-bar usage-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(pct, usage ? 1 : 0)}%` }} />
            </span>
          </div>
          <button className="secondary-btn press export-btn" onClick={runExport} disabled={!!exporting}>
            <Download size={18} style={{ verticalAlign: '-3px' }} /> {exporting ?? 'Alles exportieren'}
          </button>
          <p className="form-hint">Lädt alle Texte und Fotos als ZIP-Datei herunter. Versiegelte Zeitkapseln bleiben versiegelt. Zusätzlich sichert GitHub jeden Sonntag automatisch alles.</p>
          {exportError && <p className="form-error">{exportError}</p>}
        </section>

        <button className="danger-btn press signout" onClick={signOut}>
          <LogOut size={18} /> Abmelden
        </button>
        <p className="foot">Couple App · mit Liebe gemacht</p>
      </main>

      <Sheet open={panel === 'name'} onClose={() => setPanel(null)} title="Dein Name">
        {panel === 'name' && <NameForm onDone={() => setPanel(null)} />}
      </Sheet>
      <Sheet open={panel === 'passwort'} onClose={() => setPanel(null)} title="Passwort ändern">
        {panel === 'passwort' && <PasswordForm onDone={() => setPanel(null)} />}
      </Sheet>
      <Sheet open={panel === 'datum'} onClose={() => setPanel(null)} title="Zusammen seit">
        {panel === 'datum' && <StartDateForm onDone={() => setPanel(null)} />}
      </Sheet>
      <Sheet open={panel === 'push'} onClose={() => setPanel(null)} title="Benachrichtigungen">
        {panel === 'push' && <PushPanel />}
      </Sheet>
    </>
  );
}

function NameForm({ onDone }: { onDone: () => void }) {
  const { me, refresh } = useAuth();
  const [name, setName] = useState(me?.display_name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!me || !name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', me.id);
    if (error) setError('Konnte nicht gespeichert werden. Bist du online?');
    else {
      await refresh();
      onDone();
    }
    setBusy(false);
  };
  return (
    <form className="form" onSubmit={save}>
      <label className="field">
        <span>So sieht dich dein Schatz in der App</span>
        <input value={name} maxLength={40} required onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-btn press" disabled={busy || !name.trim()}>
        Speichern
      </button>
    </form>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const mismatch = pw2.length > 0 && pw !== pw2;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6 || pw !== pw2) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setError(deutscherFehler(error.message));
    else {
      setOk(true);
      window.setTimeout(onDone, 1400);
    }
  };
  return (
    <form className="form" onSubmit={save}>
      <p className="form-hint">Merk es dir gut: Es gibt keinen „Passwort vergessen“-Weg per Mail.</p>
      <label className="field">
        <span>Neues Passwort</span>
        <input type="password" autoComplete="new-password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Mindestens 6 Zeichen" />
      </label>
      <label className="field">
        <span>Wiederholen</span>
        <input type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </label>
      {mismatch && <p className="form-error">Die Passwörter stimmen nicht überein.</p>}
      {error && <p className="form-error">{error}</p>}
      {ok && <p className="toast">Passwort geändert 💕</p>}
      <button className="primary-btn press" disabled={busy || pw.length < 6 || pw !== pw2}>
        Passwort ändern
      </button>
    </form>
  );
}
