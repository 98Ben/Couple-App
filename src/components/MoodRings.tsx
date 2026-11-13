import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import HeartBurst from './HeartBurst';
import Sheet from './Sheet';
import { useAuth } from '../lib/auth';
import { berlinToday, relativeTime } from '../lib/dates';
import { notifyPartner } from '../lib/push';
import { supabase } from '../lib/supabase';
import type { Mood, MoodKey } from '../lib/types';

export const MOODS: Record<MoodKey, { label: string; emoji: string; from: string; to: string }> = {
  energie: { label: 'Voller Energie', emoji: '⚡', from: '#FFD166', to: '#FFB347' },
  gluecklich: { label: 'Richtig glücklich', emoji: '😊', from: '#FFB38A', to: '#FFD6B8' },
  kuschelig: { label: 'Kuschelig & anhänglich', emoji: '🥰', from: '#FF9AA2', to: '#FFC6D0' },
  entspannt: { label: 'Entspannt', emoji: '😌', from: '#9AD0EC', to: '#C9E8F7' },
  nachdenklich: { label: 'Nachdenklich', emoji: '💭', from: '#B8C4D9', to: '#DCE3EE' },
  muede: { label: 'Übermüdet, braucht Kaffee', emoji: '☕', from: '#E3BF94', to: '#F3DEC4' },
  gestresst: { label: 'Gestresst', emoji: '😵‍💫', from: '#C9A7EB', to: '#E4D0F7' },
  krank: { label: 'Nicht so fit', emoji: '🤒', from: '#A8DDC0', to: '#D4F0E0' },
  aufgeregt: { label: 'Aufgeregt & voller Vorfreude', emoji: '🤩', from: '#FF8E85', to: '#FFD166' },
  sehnsucht: { label: 'Vermisst dich', emoji: '🥺', from: '#FFC6FF', to: '#FFE0F0' },
  traurig: { label: 'Ein bisschen traurig', emoji: '😢', from: '#8FB3E0', to: '#C7DAF2' },
  genervt: { label: 'Genervt', emoji: '😤', from: '#F28B82', to: '#F9C3BE' },
  dankbar: { label: 'Dankbar', emoji: '🙏', from: '#F6C77B', to: '#FBE5BF' },
  albern: { label: 'Albern & verspielt', emoji: '🤪', from: '#9EE09E', to: '#FFE58A' },
};

function Ring({ mood, size = 92 }: { mood: MoodKey | null; size?: number }) {
  const m = mood ? MOODS[mood] : null;
  const style = (m
    ? { width: size, height: size, ['--from' as string]: m.from, ['--to' as string]: m.to }
    : { width: size, height: size }) as CSSProperties;
  return (
    <span className={`mood-ring${m ? '' : ' empty'}`} style={style} aria-hidden="true">
      <span className="mood-ring-inner">{m ? m.emoji : <Plus size={26} />}</span>
    </span>
  );
}

/** Stimmungs-Ringe auf der Startseite: deiner und der deines Schatzes. Gilt nur für heute. */
export default function MoodRings() {
  const { session, partner, me, couple } = useAuth();
  const myId = session?.user.id;
  const [moods, setMoods] = useState<Mood[]>([]);
  const [pick, setPick] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('moods').select('user_id, mood, day, updated_at');
    setMoods((data as Mood[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    if (!couple) return;
    const ch = supabase
      .channel(`moods-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moods', filter: `couple_id=eq.${couple.id}` }, () => load())
      .subscribe();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(ch);
    };
  }, [load, couple]);

  const today = berlinToday();
  const current = (uid?: string) => {
    const m = moods.find((x) => x.user_id === uid);
    return m && m.day === today ? m : null; // um Mitternacht „zurückgesetzt“
  };
  const mine = current(myId);
  const theirs = current(partner?.id);
  const partnerName = partner?.display_name ?? 'Dein Schatz';

  const choose = async (key: MoodKey) => {
    setMoods((ms) => [...ms.filter((x) => x.user_id !== myId), { user_id: myId!, mood: key, day: today, updated_at: new Date().toISOString() }]);
    setPick(false);
    await supabase.rpc('set_mood', { m: key });
    load();
  };

  return (
    <section className="moods appear" aria-label="Stimmung heute">
      <h2 className="moods-title">Wie geht&apos;s euch heute?</h2>
      <div className="moods-row">
        <button className="mood-person press" onClick={() => setPick(true)} aria-label={mine ? `Deine Stimmung: ${MOODS[mine.mood].label}. Ändern` : 'Deine Stimmung wählen'}>
          <Ring mood={mine?.mood ?? null} />
          <span className="mood-name">{me?.display_name ?? 'Du'}</span>
          <span className="mood-label">{mine ? MOODS[mine.mood].label : 'Tippen zum Wählen'}</span>
        </button>
        <button className="mood-person press" onClick={() => setPartnerOpen(true)} aria-label={`${partnerName}: ${theirs ? MOODS[theirs.mood].label : 'noch keine Stimmung'}`}>
          <Ring mood={theirs?.mood ?? null} />
          <span className="mood-name">{partnerName}</span>
          <span className="mood-label">{theirs ? MOODS[theirs.mood].label : 'Noch nichts verraten'}</span>
        </button>
      </div>

      <Sheet open={pick} onClose={() => setPick(false)} title="Wie fühlst du dich heute?">
        <div className="mood-grid">
          {(Object.keys(MOODS) as MoodKey[]).map((k) => (
            <button key={k} className={`mood-option press${mine?.mood === k ? ' on' : ''}`} onClick={() => choose(k)} aria-pressed={mine?.mood === k}>
              <Ring mood={k} size={46} />
              <span>{MOODS[k].label}</span>
            </button>
          ))}
        </div>
        <p className="form-hint center">Gilt bis Mitternacht. Morgen fragen wir dich wieder.</p>
      </Sheet>

      <Sheet open={partnerOpen} onClose={() => setPartnerOpen(false)} title={partnerName}>
        {partnerOpen && <PartnerMood mood={theirs} partnerName={partnerName} onDone={() => setPartnerOpen(false)} />}
      </Sheet>
    </section>
  );
}

function PartnerMood({ mood, partnerName, onDone }: { mood: Mood | null; partnerName: string; onDone: () => void }) {
  const [hugged, setHugged] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const hug = () => {
    notifyPartner('hug');
    setHugged((n) => n + 1);
    setMsg(`Umarmung ist unterwegs zu ${partnerName} 🤗`);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('love_notes').insert({ text: text.trim(), color: 'rose' });
    setBusy(false);
    if (error) {
      setMsg('Hat nicht geklappt. Bist du online?');
      return;
    }
    notifyPartner('note', text.trim());
    setText('');
    setMsg('Nachricht hängt jetzt an eurer Pinnwand 💌');
    timer.current = window.setTimeout(onDone, 1400);
  };

  return (
    <div className="detail partner-mood">
      <div className="partner-mood-head">
        <Ring mood={mood?.mood ?? null} size={84} />
        <div>
          <p className="detail-note">
            {mood ? (
              <>
                Stimmung heute: <strong>{MOODS[mood.mood].label}</strong>
              </>
            ) : (
              'hat heute noch keine Stimmung gewählt.'
            )}
          </p>
          {mood && <p className="form-hint">{relativeTime(mood.updated_at)}</p>}
        </div>
      </div>
      <button className="primary-btn press send-btn" onClick={hug}>
        Umarmung senden 🤗
        {hugged > 0 && <HeartBurst key={hugged} />}
      </button>
      <form className="form" onSubmit={send}>
        <label className="field">
          <span>Oder ein paar liebe Worte</span>
          <textarea rows={2} maxLength={280} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ich bin für dich da …" />
        </label>
        <button className="secondary-btn press" disabled={busy || !text.trim()}>
          Nachricht schicken
        </button>
      </form>
      {msg && <p className="toast">{msg}</p>}
    </div>
  );
}
