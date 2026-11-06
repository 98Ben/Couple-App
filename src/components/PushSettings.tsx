import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Share } from 'lucide-react';
import { disablePush, enablePush, getPushState, sendTestPush, type PushState } from '../lib/push';
import { load, save } from '../lib/storage';
import Sheet from './Sheet';

const DISMISS_KEY = 'couple.pushBannerDismissed';

/** Hinweis-Karte auf der Startseite, solange Push nicht aktiv ist. */
export function PushBanner({ onOpen }: { onOpen: () => void }) {
  const [state, setState] = useState<PushState | null>(null);
  const [hidden, setHidden] = useState(() => load(DISMISS_KEY) === '1');
  useEffect(() => {
    getPushState().then(setState);
  }, []);
  if (hidden || !state || state === 'on' || state === 'unsupported') return null;
  return (
    <section className="push-banner appear">
      <span className="push-banner-icon" aria-hidden="true">
        <Bell size={22} />
      </span>
      <div className="push-banner-text">
        <strong>Nichts mehr verpassen</strong>
        <span>{state === 'needs-install' ? 'Installiere die App, um Benachrichtigungen zu bekommen.' : 'Erfahre sofort, wenn dein Schatz an dich denkt.'}</span>
      </div>
      <div className="push-banner-actions">
        <button className="primary-btn small press" onClick={onOpen}>
          {state === 'needs-install' ? 'Wie?' : 'Aktivieren'}
        </button>
        <button
          className="link-btn"
          onClick={() => {
            save(DISMISS_KEY, '1');
            setHidden(true);
          }}
        >
          Später
        </button>
      </div>
    </section>
  );
}

/** Einstellungen für Benachrichtigungen auf diesem Gerät. */
export function PushSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => getPushState().then(setState), []);
  useEffect(() => {
    if (open) {
      setMsg(null);
      setError(null);
      refresh();
    }
  }, [open, refresh]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setError((e as Error).message);
    }
    await refresh();
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Benachrichtigungen">
      {state === 'needs-install' && (
        <div className="detail">
          <p className="detail-note">Auf dem iPhone gibt es Benachrichtigungen nur für installierte Apps. So geht&apos;s:</p>
          <ol className="steps">
            <li>
              Diese Seite in <strong>Safari</strong> öffnen.
            </li>
            <li>
              Unten auf <Share size={16} style={{ verticalAlign: '-3px' }} aria-label="Teilen" /> <strong>Teilen</strong> tippen.
            </li>
            <li>
              <strong>Zum Home-Bildschirm</strong> wählen.
            </li>
            <li>Die App vom Home-Bildschirm öffnen und hier „Aktivieren“ tippen.</li>
          </ol>
        </div>
      )}

      {state === 'unsupported' && <p className="detail-note">Dieser Browser unterstützt leider keine Benachrichtigungen.</p>}

      {state === 'denied' && (
        <p className="detail-note">
          Du hast Benachrichtigungen abgelehnt. Erlaube sie in den iPhone-Einstellungen unter <strong>Mitteilungen → Couple App</strong> und öffne die App neu.
        </p>
      )}

      {(state === 'off' || state === 'on') && (
        <div className="detail">
          <p className="detail-note">
            {state === 'on'
              ? 'Auf diesem Gerät bekommst du Benachrichtigungen, wenn dein Schatz an dich denkt, dir schreibt, zeichnet, die Tagesfrage beantwortet oder eine neue Erinnerung anlegt.'
              : 'Bekomme eine Benachrichtigung, wenn dein Schatz an dich denkt, dir schreibt, zeichnet, die Tagesfrage beantwortet oder eine neue Erinnerung anlegt.'}
          </p>
          {state === 'off' ? (
            <button className="primary-btn press" disabled={busy} onClick={() => run(enablePush, 'Aktiviert! 💕')}>
              <Bell size={18} style={{ verticalAlign: '-3px' }} /> {busy ? 'Einen Moment …' : 'Benachrichtigungen aktivieren'}
            </button>
          ) : (
            <>
              <button className="primary-btn press" disabled={busy} onClick={() => run(async () => {
                const n = await sendTestPush();
                if (n === 0) throw new Error('Kein Gerät gefunden. Deaktiviere und aktiviere die Benachrichtigungen bitte neu.');
              }, 'Test-Benachrichtigung ist unterwegs.')}>
                Test-Benachrichtigung senden
              </button>
              <button className="secondary-btn press" disabled={busy} onClick={() => run(disablePush, 'Auf diesem Gerät ausgeschaltet.')}>
                <BellOff size={18} style={{ verticalAlign: '-3px' }} /> Ausschalten
              </button>
            </>
          )}
        </div>
      )}

      {msg && <p className="toast">{msg}</p>}
      {error && <p className="form-error">{error}</p>}
    </Sheet>
  );
}
