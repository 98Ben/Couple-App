import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Letter } from '../lib/types';
import { Heart } from '../icons/Icon';
import { LetterPaper } from './Letter';

type Phase = 'arrive' | 'open' | 'read';

/**
 * Angekommene, ungelesene Briefe: Beim Öffnen der App fliegt ein Umschlag herein,
 * öffnet sich, und danach steht der Brief groß da.
 */
export default function LetterArrival() {
  const { session, partner } = useAuth();
  const myId = session?.user.id;
  const [queue, setQueue] = useState<Letter[]>([]);
  const [phase, setPhase] = useState<Phase>('arrive');

  const load = useCallback(async () => {
    if (!myId) return;
    const { data } = await supabase
      .from('letters')
      .select('*')
      .eq('recipient', myId)
      .is('opened_at', null)
      .lte('deliver_at', new Date().toISOString())
      .order('deliver_at');
    setQueue((q) => (q.length ? q : ((data as Letter[] | null) ?? [])));
  }, [myId]);

  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    const t = window.setInterval(load, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(t);
    };
  }, [load]);

  const letter = queue[0];

  // Ablauf: Umschlag kommt (1,1 s) → Klappe öffnet sich, Brief gleitet heraus (1,6 s) → Lesen
  useEffect(() => {
    if (!letter) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPhase('read');
      return;
    }
    setPhase('arrive');
    const a = window.setTimeout(() => setPhase('open'), 1100);
    const b = window.setTimeout(() => setPhase('read'), 2700);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [letter]);

  if (!letter) return null;

  const close = async () => {
    await supabase.rpc('open_letter', { l: letter.id });
    setQueue((q) => q.slice(1));
  };

  const from = partner?.display_name ?? 'deinem Schatz';

  return createPortal(
    <div className={`letter-overlay phase-${phase}`} role="dialog" aria-modal="true" aria-label={`Brief von ${from}`}>
      {phase !== 'read' ? (
        <div className="env-stage" onClick={() => setPhase('read')}>
          <p className="env-title">Ein Brief von {from} ist angekommen</p>
          <div className="envelope">
            <div className="env-back" />
            <div className="env-letter">
              <span />
              <span />
              <span />
            </div>
            <div className="env-front" />
            <div className="env-flap" />
            <span className="env-seal">
              <Heart size={26} color="#FFFFFF" />
            </span>
          </div>
          <p className="env-skip">Antippen zum Öffnen</p>
        </div>
      ) : (
        <div className="letter-read">
          <p className="env-title small">Ein Brief von {from} 💌</p>
          <LetterPaper letter={letter} from={from} />
          <button className="primary-btn press" onClick={close}>
            {queue.length > 1 ? 'Nächster Brief ✉️' : 'Schließen 💕'}
          </button>
          <p className="env-skip">Du findest ihn später bei den Liebesnotizen.</p>
        </div>
      )}
    </div>,
    document.body,
  );
}
