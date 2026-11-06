import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import HeartBurst from '../../components/HeartBurst';
import SubHeader from '../../components/SubHeader';
import { deutscherFehler, useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/dates';
import { supabase } from '../../lib/supabase';
import type { Answer } from '../../lib/types';
import { Icon } from '../../icons/Icon';
import { tones } from '../../theme';

const tone = tones.rose;

type Today = { day: string; question_id: number; text: string; partner_answered: boolean; i_answered: boolean };

export default function FrageDesTages() {
  const { session, partner, couple } = useAuth();
  const myId = session?.user.id;
  const partnerName = partner?.display_name ?? 'Dein Schatz';

  const [today, setToday] = useState<Today | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questions, setQuestions] = useState<Map<number, string>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [t, a] = await Promise.all([
      supabase.rpc('today_question'),
      // RLS liefert die Partner-Antwort von heute erst, wenn man selbst geantwortet hat
      supabase.from('question_answers').select('id, user_id, day, question_id, answer, created_at').order('day', { ascending: false }).limit(200),
    ]);
    if (t.error || a.error) {
      setLoadError('Konnte nicht geladen werden. Bist du online?');
      return;
    }
    setLoadError(null);
    setToday(((t.data as Today[]) ?? [])[0] ?? null);
    setAnswers((a.data as Answer[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    supabase
      .from('daily_questions')
      .select('id, text')
      .then(({ data }) => setQuestions(new Map((data ?? []).map((q) => [q.id as number, q.text as string]))));
    // Partner-Antworten kommen wegen der Sperre nicht per Realtime: regelmäßig nachsehen
    const t = window.setInterval(load, 20000);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, couple?.id]);

  const mineToday = today ? answers.find((a) => a.day === today.day && a.user_id === myId) : undefined;
  const partnerToday = today ? answers.find((a) => a.day === today.day && a.user_id !== myId) : undefined;

  // Archiv: vergangene Tage, an denen mindestens eine/r geantwortet hat
  const archive = useMemo(() => {
    const days = new Map<string, { q: number; mine?: Answer; theirs?: Answer }>();
    for (const a of answers) {
      if (today && a.day >= today.day) continue;
      const e = days.get(a.day) ?? { q: a.question_id };
      if (a.user_id === myId) e.mine = a;
      else e.theirs = a;
      days.set(a.day, e);
    }
    return [...days.entries()];
  }, [answers, today, myId]);

  // Antwort abschicken
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justRevealed, setJustRevealed] = useState(false);
  const revealTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(revealTimer.current), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('answer_today', { answer: text.trim() });
    if (error) setError(deutscherFehler(error.message));
    else {
      setText('');
      setJustRevealed(true);
      revealTimer.current = window.setTimeout(() => setJustRevealed(false), 2500);
      await load();
    }
    setBusy(false);
  };

  return (
    <>
      <main className="page">
        <span className="glow g1" aria-hidden="true" />
        <SubHeader title="Frage des Tages" back="/nachrichten" sub="Jeden Tag eine neue Frage für euch" />

        {loadError && <p className="form-error">{loadError}</p>}

        {today && (
          <section className="qotd appear">
            <span className="chip">💭 {formatDate(today.day, true)}</span>
            <h2 className="qotd-question">{today.text}</h2>

            {/* Eigene Antwort */}
            <div className="answer-card mine">
              <p className="answer-who">Deine Antwort</p>
              {mineToday ? (
                <p className="answer-text">{mineToday.answer}</p>
              ) : (
                <form className="form" onSubmit={submit}>
                  <label className="sr-only" htmlFor="answer">
                    Deine Antwort
                  </label>
                  <textarea id="answer" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Schreib, was dir einfällt …" className="answer-input" />
                  {error && <p className="form-error">{error}</p>}
                  <button className="love-btn press" disabled={busy || !text.trim()}>
                    {busy ? 'Wird gesendet …' : 'Antwort abschicken'}
                  </button>
                  <p className="answer-hint">Nur heute möglich und danach nicht mehr änderbar.</p>
                </form>
              )}
            </div>

            {/* Antwort des Partners */}
            <div className={`answer-card theirs${justRevealed && partnerToday ? ' reveal' : ''}`}>
              <p className="answer-who">{partnerName}</p>
              {partnerToday ? (
                <>
                  <p className="answer-text">{partnerToday.answer}</p>
                  {justRevealed && <HeartBurst />}
                </>
              ) : today.partner_answered ? (
                <div className="locked">
                  <p className="answer-text blurred" aria-hidden="true">
                    Hier steht eine liebe Antwort, die du erst lesen kannst, wenn du selbst geantwortet hast.
                  </p>
                  <span className="lock-badge">
                    <Lock size={16} /> Antworte zuerst, dann wird es sichtbar
                  </span>
                </div>
              ) : (
                <p className="answer-wait">
                  <span className="dot-pulse" aria-hidden="true" /> hat noch nicht geantwortet
                </p>
              )}
            </div>
          </section>
        )}

        {archive.length > 0 && (
          <section className="q-archive">
            <h2 className="section-title">Frühere Fragen</h2>
            {archive.map(([day, e]) => (
              <article key={day} className="q-past" style={{ background: tone.tileBg }}>
                <p className="q-past-day">{formatDate(day)}</p>
                <p className="q-past-question">{questions.get(e.q) ?? '…'}</p>
                <div className="q-past-answers">
                  <p>
                    <strong>Du:</strong> {e.mine?.answer ?? <em>nicht beantwortet</em>}
                  </p>
                  <p>
                    <strong>{partnerName}:</strong> {e.theirs?.answer ?? <em>nicht beantwortet</em>}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}

        {today && archive.length === 0 && (
          <p className="form-hint center" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Icon name="question" size={18} stroke={tone.icon} accent={tone.main} /> Hier sammeln sich eure Antworten der letzten Tage.
          </p>
        )}
      </main>
      <BottomNav active="nachrichten" />
    </>
  );
}
