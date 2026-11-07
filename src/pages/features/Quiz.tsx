import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import HeartBurst from '../../components/HeartBurst';
import SubHeader from '../../components/SubHeader';
import { deutscherFehler, useAuth } from '../../lib/auth';
import { formatDateShort } from '../../lib/dates';
import { notifyPartner } from '../../lib/push';
import { supabase } from '../../lib/supabase';
import type { QuizEntry, QuizRound } from '../../lib/types';
import { Icon } from '../../icons/Icon';
import { tones } from '../../theme';

const tone = tones.sun;

export default function Quiz() {
  const { session, partner, me, couple } = useAuth();
  const myId = session?.user.id ?? '';
  const partnerId = partner?.id ?? '';
  const myName = me?.display_name ?? 'Du';
  const partnerName = partner?.display_name ?? 'Dein Schatz';

  const [rounds, setRounds] = useState<QuizRound[]>([]);
  const [entries, setEntries] = useState<QuizEntry[]>([]);
  const [questions, setQuestions] = useState<Map<number, string>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, e] = await Promise.all([
      supabase.from('quiz_rounds').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('quiz_entries').select('id, round_id, question_id, user_id, own_answer, guess, guess_correct'),
    ]);
    if (r.error || e.error) setError('Konnte nicht geladen werden. Bist du online?');
    else {
      setError(null);
      setRounds((r.data as QuizRound[]) ?? []);
      setEntries((e.data as QuizEntry[]) ?? []);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    supabase
      .from('quiz_questions')
      .select('id, text')
      .then(({ data }) => setQuestions(new Map((data ?? []).map((q) => [q.id as number, q.text as string]))));
    if (!couple) return;
    const ch = supabase
      .channel(`quiz-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_rounds', filter: `couple_id=eq.${couple.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_entries', filter: `couple_id=eq.${couple.id}` }, () => load())
      .subscribe();
    const t = window.setInterval(load, 20000);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(ch);
    };
  }, [load, couple]);

  const current = rounds.find((r) => !r.finished_at) ?? null;
  const finished = rounds.filter((r) => r.finished_at);

  // Punkte: richtige Tipps je Person
  const score = useMemo(() => {
    const s = { me: 0, partner: 0 };
    for (const e of entries) if (e.guess_correct) e.user_id === myId ? s.me++ : s.partner++;
    return s;
  }, [entries, myId]);

  const [starting, setStarting] = useState(false);
  const start = async () => {
    setStarting(true);
    const { error } = await supabase.rpc('quiz_start_round');
    if (error) setError(deutscherFehler(error.message));
    await load();
    setStarting(false);
  };

  return (
    <>
      <main className="page">
        <span className="glow g3" aria-hidden="true" style={{ top: 120 }} />
        <SubHeader title="Wer kennt wen besser?" back="/extras" sub="Das Quiz für euch zwei" />

        <Scoreboard myName={myName} partnerName={partnerName} score={score} rounds={finished.length} />

        {error && <p className="form-error">{error}</p>}

        {loaded && !current && (
          <section className="card quiz-start appear" style={{ boxShadow: `0 10px 26px ${tone.shadow}` }}>
            <span className="placeholder-icon blob float" style={{ background: tone.tileBg }}>
              <Icon name="dice" size={40} stroke={tone.icon} accent={tones.rose.main} weight={1.6} />
            </span>
            <p className="placeholder-head">{finished.length ? 'Lust auf noch eine Runde?' : 'Bereit für eure erste Runde?'}</p>
            <p className="form-hint center">
              5 Fragen über euch. Du beantwortest jede für dich und tippst, was {partnerName} sagt. Aufgedeckt wird erst, wenn ihr beide fertig seid.
            </p>
            <button className="primary-btn press" onClick={start} disabled={starting}>
              {starting ? 'Einen Moment …' : 'Neue Runde starten 🎲'}
            </button>
          </section>
        )}

        {current && (
          <RoundView
            round={current}
            entries={entries.filter((e) => e.round_id === current.id)}
            questions={questions}
            myId={myId}
            partnerId={partnerId}
            partnerName={partnerName}
            onChanged={load}
          />
        )}

        {finished.length > 0 && (
          <section className="quiz-history">
            <h2 className="section-title">Vergangene Runden</h2>
            {finished.map((r) => {
              const es = entries.filter((e) => e.round_id === r.id);
              const m = es.filter((e) => e.user_id === myId && e.guess_correct).length;
              const p = es.filter((e) => e.user_id !== myId && e.guess_correct).length;
              return (
                <div key={r.id} className="history-row" style={{ background: tone.tileBg }}>
                  <span>{formatDateShort(r.finished_at!)}</span>
                  <strong>
                    {myName} {m} : {p} {partnerName}
                  </strong>
                  <span aria-hidden="true">{m > p ? '🏆' : m < p ? '🥈' : '🤝'}</span>
                </div>
              );
            })}
          </section>
        )}
      </main>
      <BottomNav active="start" />
    </>
  );
}

function Scoreboard({ myName, partnerName, score, rounds }: { myName: string; partnerName: string; score: { me: number; partner: number }; rounds: number }) {
  const total = Math.max(1, score.me + score.partner);
  const lead = score.me === score.partner ? null : score.me > score.partner ? myName : partnerName;
  return (
    <section className="scoreboard appear">
      <p className="eyebrow">Wer hat wen besser im Kopf?</p>
      <div className="score-nums">
        <span>
          <strong>{score.me}</strong>
          <small>{myName}</small>
        </span>
        <span className="score-vs">:</span>
        <span>
          <strong>{score.partner}</strong>
          <small>{partnerName}</small>
        </span>
      </div>
      <div className="score-bar" aria-hidden="true">
        <span className="me" style={{ width: `${(score.me / total) * 100}%` }} />
        <span className="them" style={{ width: `${(score.partner / total) * 100}%` }} />
      </div>
      <p className="score-sub">
        {rounds === 0 ? 'Noch keine Runde gespielt' : lead ? `${lead} liegt vorne · ${rounds} ${rounds === 1 ? 'Runde' : 'Runden'}` : `Gleichstand · ${rounds} ${rounds === 1 ? 'Runde' : 'Runden'}`}
      </p>
    </section>
  );
}

function RoundView({
  round,
  entries,
  questions,
  myId,
  partnerId,
  partnerName,
  onChanged,
}: {
  round: QuizRound;
  entries: QuizEntry[];
  questions: Map<number, string>;
  myId: string;
  partnerId: string;
  partnerName: string;
  onChanged: () => Promise<void>;
}) {
  const iSubmitted = round.submitted.includes(myId);
  const partnerSubmitted = round.submitted.includes(partnerId);

  if (!iSubmitted) return <AnswerForm round={round} questions={questions} partnerName={partnerName} partnerSubmitted={partnerSubmitted} onDone={onChanged} />;

  if (!partnerSubmitted) {
    return (
      <section className="card quiz-wait appear">
        <p className="placeholder-head">Abgegeben! 🎉</p>
        <p className="answer-wait center">
          <span className="dot-pulse" aria-hidden="true" /> Jetzt ist {partnerName} dran. Sobald ihr beide fertig seid, wird aufgedeckt.
        </p>
      </section>
    );
  }

  return (
    <section className="reveal-list">
      <p className="form-hint">Bewerte die Tipps über dich: Hat {partnerName} richtig gelegen?</p>
      {round.question_ids.map((qid, i) => {
        const mine = entries.find((e) => e.question_id === qid && e.user_id === myId);
        const theirs = entries.find((e) => e.question_id === qid && e.user_id !== myId);
        if (!mine || !theirs) return null;
        return <RevealCard key={qid} index={i} question={questions.get(qid) ?? '…'} mine={mine} theirs={theirs} partnerName={partnerName} onChanged={onChanged} />;
      })}
    </section>
  );
}

function AnswerForm({
  round,
  questions,
  partnerName,
  partnerSubmitted,
  onDone,
}: {
  round: QuizRound;
  questions: Map<number, string>;
  partnerName: string;
  partnerSubmitted: boolean;
  onDone: () => Promise<void>;
}) {
  const [own, setOwn] = useState<Record<number, string>>({});
  const [guess, setGuess] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const complete = round.question_ids.every((q) => own[q]?.trim() && guess[q]?.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    setBusy(true);
    setError(null);
    const answers = round.question_ids.map((q) => ({ question_id: q, own: own[q].trim(), guess: guess[q].trim() }));
    const { error } = await supabase.rpc('quiz_submit', { r: round.id, answers });
    if (error) {
      setError(deutscherFehler(error.message));
      setBusy(false);
      return;
    }
    notifyPartner('quiz');
    await onDone();
    setBusy(false);
  };

  return (
    <form className="quiz-form" onSubmit={submit}>
      {partnerSubmitted && <p className="toast">{partnerName} hat schon geantwortet. Jetzt du! 🎲</p>}
      {round.question_ids.map((q, i) => (
        <fieldset key={q} className="quiz-q appear" style={{ animationDelay: `${i * 0.05}s` }}>
          <legend className="quiz-q-num">Frage {i + 1} von 5</legend>
          <p className="quiz-q-text">{questions.get(q) ?? '…'}</p>
          <label className="field">
            <span>Deine Antwort</span>
            <input value={own[q] ?? ''} maxLength={200} onChange={(e) => setOwn({ ...own, [q]: e.target.value })} placeholder="Ehrlich sein!" />
          </label>
          <label className="field">
            <span>Was antwortet {partnerName}?</span>
            <input value={guess[q] ?? ''} maxLength={200} onChange={(e) => setGuess({ ...guess, [q]: e.target.value })} placeholder="Dein Tipp" />
          </label>
        </fieldset>
      ))}
      {error && <p className="form-error">{error}</p>}
      <button className="primary-btn press" disabled={busy || !complete}>
        {busy ? 'Wird abgegeben …' : complete ? 'Abgeben' : 'Alle Felder ausfüllen'}
      </button>
    </form>
  );
}

function RevealCard({
  index,
  question,
  mine,
  theirs,
  partnerName,
  onChanged,
}: {
  index: number;
  question: string;
  mine: QuizEntry;
  theirs: QuizEntry;
  partnerName: string;
  onChanged: () => Promise<void>;
}) {
  const [burst, setBurst] = useState(0);
  const judge = async (correct: boolean) => {
    if (correct) setBurst((n) => n + 1);
    await supabase.rpc('quiz_judge', { entry: theirs.id, correct });
    await onChanged();
  };

  return (
    <article className="reveal-card appear" style={{ animationDelay: `${index * 0.06}s` }}>
      <p className="quiz-q-num">Frage {index + 1}</p>
      <p className="quiz-q-text">{question}</p>

      <div className="reveal-pair">
        <p className="reveal-who">Über dich</p>
        <p>
          <span className="muted">Du:</span> {mine.own_answer}
        </p>
        <p>
          <span className="muted">{partnerName} tippte:</span> {theirs.guess}
        </p>
        {theirs.guess_correct === null ? (
          <div className="judge-row">
            <button className="judge yes press" onClick={() => judge(true)} aria-label="Treffer">
              <Check size={18} strokeWidth={3} /> Treffer
              {burst > 0 && <HeartBurst key={burst} />}
            </button>
            <button className="judge no press" onClick={() => judge(false)} aria-label="Daneben">
              <X size={18} strokeWidth={3} /> Daneben
            </button>
          </div>
        ) : (
          <span className={`verdict ${theirs.guess_correct ? 'yes' : 'no'}`}>
            {theirs.guess_correct ? 'Treffer ✓' : 'Daneben ✗'}
            {burst > 0 && theirs.guess_correct && <HeartBurst key={burst} />}
          </span>
        )}
      </div>

      <div className="reveal-pair">
        <p className="reveal-who">Über {partnerName}</p>
        <p>
          <span className="muted">{partnerName}:</span> {theirs.own_answer}
        </p>
        <p>
          <span className="muted">Du tipptest:</span> {mine.guess}
        </p>
        {mine.guess_correct === null ? (
          <span className="verdict wait">{partnerName} bewertet noch …</span>
        ) : (
          <span className={`verdict ${mine.guess_correct ? 'yes' : 'no'}`}>{mine.guess_correct ? 'Treffer ✓' : 'Daneben ✗'}</span>
        )}
      </div>
    </article>
  );
}
