import { useMemo, useState, type FormEvent } from 'react';
import { Check, ChevronDown, Repeat } from 'lucide-react';
import Avatar from '../../components/Avatar';
import BottomNav from '../../components/BottomNav';
import ConfirmButton from '../../components/ConfirmButton';
import Empty from '../../components/Empty';
import HeartBurst from '../../components/HeartBurst';
import Sheet from '../../components/Sheet';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { berlinToday, daysUntil, formatDate, parseDate, toIso } from '../../lib/dates';
import { supabase } from '../../lib/supabase';
import type { Chore, ChoreEvery, Task } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';
import { Heart } from '../../icons/Icon';
import { tones } from '../../theme';

const tone = tones.peach;
const EVERY: { id: ChoreEvery; label: string }[] = [
  { id: 'taeglich', label: 'Täglich' },
  { id: 'woechentlich', label: 'Jede Woche' },
  { id: 'zweiwoechentlich', label: 'Alle 2 Wochen' },
  { id: 'monatlich', label: 'Jeden Monat' },
];
const everyLabel = (e: ChoreEvery) => EVERY.find((x) => x.id === e)?.label ?? '';

/** „heute“, „morgen“, „Mo, 16. Nov.“, „seit 2 Tagen fällig“ */
function dueLabel(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return d === -1 ? 'seit gestern fällig' : `seit ${-d} Tagen fällig`;
  if (d === 0) return 'heute';
  if (d === 1) return 'morgen';
  if (d < 7) return parseDate(iso).toLocaleDateString('de-DE', { weekday: 'long' });
  return parseDate(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}

type Filter = 'alle' | 'meine' | 'partner';

export default function ToDos() {
  const { session, partner } = useAuth();
  const myId = session?.user.id ?? '';
  const partnerName = partner?.display_name ?? 'Partner';
  const tasks = useCoupleTable<Task>('tasks', { column: 'created_at' });
  const chores = useCoupleTable<Chore>('chores', { column: 'next_due' });
  const [filter, setFilter] = useState<Filter>('alle');
  const [adding, setAdding] = useState<'task' | 'chore' | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editChore, setEditChore] = useState<Chore | null>(null);
  const [burst, setBurst] = useState<{ id: string; n: number } | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const today = berlinToday();
  const matches = (assignee: string | null) =>
    filter === 'alle' || assignee === null || (filter === 'meine' ? assignee === myId : assignee !== myId);

  const visibleChores = chores.rows.filter((c) => matches(c.assignee));
  const openTasks = tasks.rows.filter((t) => !t.done_at && matches(t.assignee));
  const doneTasks = tasks.rows
    .filter((t) => t.done_at && matches(t.assignee))
    .sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));

  const sections = useMemo(() => {
    const byDue = (a: Task, b: Task) => Number(b.important) - Number(a.important) || (a.due_on ?? '').localeCompare(b.due_on ?? '');
    return [
      { id: 'ueberfaellig', title: 'Überfällig', items: openTasks.filter((t) => t.due_on && t.due_on < today).sort(byDue) },
      { id: 'heute', title: 'Heute', items: openTasks.filter((t) => t.due_on === today).sort(byDue) },
      { id: 'demnaechst', title: 'Demnächst', items: openTasks.filter((t) => t.due_on && t.due_on > today).sort(byDue) },
      { id: 'irgendwann', title: 'Irgendwann', items: openTasks.filter((t) => !t.due_on).sort(byDue) },
    ].filter((s) => s.items.length);
  }, [openTasks, today]);

  // „Alles geschafft“: heute oder früher fällige sind alle erledigt und heute wurde etwas abgehakt
  const dueNow = tasks.rows.filter((t) => t.due_on && t.due_on <= today);
  const choresDue = chores.rows.filter((c) => c.next_due <= today);
  const doneToday = tasks.rows.some((t) => t.done_at && t.done_at.slice(0, 10) === today) || chores.rows.some((c) => c.last_done_at?.slice(0, 10) === today);
  const allDone = doneToday && dueNow.every((t) => t.done_at) && choresDue.length === 0;

  const toggleTask = (t: Task) => {
    if (t.done_at) return tasks.update(t.id, { done_at: null, done_by: null });
    setBurst({ id: t.id, n: Date.now() });
    // kurz durchgestrichen zeigen, dann einsortieren
    window.setTimeout(() => tasks.update(t.id, { done_at: new Date().toISOString(), done_by: myId }), 450);
  };

  const doChore = async (c: Chore) => {
    setBurst({ id: c.id, n: Date.now() });
    const { data } = await supabase.rpc('complete_chore', { chore: c.id });
    if (data) setToast(`Erledigt! Nächstes Mal: ${dueLabel(data as string)}`);
    window.setTimeout(() => setToast(null), 2600);
    chores.reload();
  };

  const clearDone = async () => {
    for (const t of doneTasks) await tasks.remove(t.id);
  };

  const filterLabel: Record<Filter, string> = { alle: 'Alle', meine: 'Meine', partner: `${partnerName}s` };

  return (
    <>
      <main className="page">
        <span className="glow g1" aria-hidden="true" />
        <SubHeader title="To-dos" back="/alltag" onAdd={() => setAdding('task')} addLabel="Aufgabe hinzufügen" sub="Haushalt, Orga und Projekte" />

        <div className="chips filter" role="tablist" aria-label="Filter">
          {(Object.keys(filterLabel) as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={`chip-btn press${filter === f ? ' on peach' : ''}`} onClick={() => setFilter(f)}>
              {filterLabel[f]}
            </button>
          ))}
        </div>

        {allDone && (
          <section className="all-done appear">
            <HeartBurst />
            <p>Alles geschafft für heute! 💕</p>
          </section>
        )}
        {toast && <p className="toast">{toast}</p>}

        {/* Wiederkehrend */}
        <section className="todo-block">
          <div className="todo-block-head">
            <h2 className="section-title">
              <Repeat size={16} style={{ verticalAlign: '-2px' }} /> Wiederkehrend
            </h2>
            <button className="link-btn" onClick={() => setAdding('chore')}>
              + Hinzufügen
            </button>
          </div>
          {visibleChores.length === 0 ? (
            <p className="form-hint">Z. B. „Müll raus“ jede Woche oder „Bad putzen“ alle 2 Wochen.</p>
          ) : (
            <ul className="todo-list">
              {visibleChores.map((c) => {
                const due = c.next_due <= today;
                return (
                  <li key={c.id} className={`todo-item chore${due ? ' due' : ''}`} style={{ background: due ? tone.tileBg : '#fff' }}>
                    <button className="todo-check press" onClick={() => doChore(c)} aria-label={`${c.title} erledigt`} style={{ borderColor: tone.main }}>
                      {burst?.id === c.id && <HeartBurst key={burst.n} />}
                    </button>
                    <button className="todo-body" onClick={() => setEditChore(c)}>
                      <span className="todo-title">{c.title}</span>
                      <span className="todo-meta">
                        {everyLabel(c.every)} · <span className={c.next_due < today ? 'late' : ''}>{dueLabel(c.next_due)}</span>
                      </span>
                    </button>
                    <Avatar userId={c.assignee} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Einmalige To-dos */}
        {tasks.error && <p className="form-error">{tasks.error}</p>}
        {!tasks.loading && tasks.rows.length === 0 && (
          <Empty icon="checklist" toneKey="peach" title="Keine To-dos" text="Was steht an? Balkon bepflanzen, Urlaub planen, Wohnung saugen: tippt oben auf +." />
        )}

        {sections.map((s) => (
          <section key={s.id} className="todo-block">
            <h2 className={`section-title${s.id === 'ueberfaellig' ? ' late' : ''}`}>{s.title}</h2>
            <ul className="todo-list">
              {s.items.map((t) => (
                <li key={t.id} className={`todo-item${burst?.id === t.id ? ' completing' : ''}`}>
                  <button className="todo-check press" onClick={() => toggleTask(t)} aria-label={`${t.title} erledigt`} style={{ borderColor: tone.main }}>
                    {burst?.id === t.id && (
                      <>
                        <Check size={15} strokeWidth={3} color="#fff" />
                        <HeartBurst key={burst.n} />
                      </>
                    )}
                  </button>
                  <button className="todo-body" onClick={() => setEditTask(t)}>
                    <span className="todo-title">
                      {t.important && <span className="prio" aria-label="wichtig">❗</span>}
                      {t.title}
                    </span>
                    {t.due_on && <span className={`todo-meta${t.due_on < today ? ' late' : ''}`}>{dueLabel(t.due_on)}</span>}
                  </button>
                  <Avatar userId={t.assignee} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {doneTasks.length > 0 && (
          <section className="cart">
            <div className="cart-head">
              <button className="cart-toggle" onClick={() => setDoneOpen((v) => !v)} aria-expanded={doneOpen}>
                ✓ Erledigt ({doneTasks.length}) <ChevronDown size={16} className={doneOpen ? 'rot' : ''} />
              </button>
              <button className="link-btn" onClick={clearDone}>
                Aufräumen
              </button>
            </div>
            {doneOpen && (
              <ul className="todo-list">
                {doneTasks.slice(0, 30).map((t) => (
                  <li key={t.id} className="todo-item done">
                    <button className="todo-check on press" onClick={() => toggleTask(t)} aria-label={`${t.title} wieder öffnen`}>
                      <Check size={15} strokeWidth={3} color="#fff" />
                    </button>
                    <span className="todo-body">
                      <span className="todo-title">{t.title}</span>
                      <span className="todo-meta">
                        <Heart size={11} color={tone.main} /> {t.done_by === myId ? 'von dir' : `von ${partnerName}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <BottomNav active="alltag" />

      <Sheet open={adding === 'task' || !!editTask} onClose={() => { setAdding(null); setEditTask(null); }} title={editTask ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}>
        {(adding === 'task' || editTask) && (
          <TaskForm
            initial={editTask}
            onSwitchToChore={editTask ? undefined : () => setAdding('chore')}
            onDelete={editTask ? async () => { await tasks.remove(editTask.id); setEditTask(null); } : undefined}
            onSave={async (v) => {
              const res = editTask ? await tasks.update(editTask.id, v) : await tasks.insert(v);
              if (res.error) return res.error;
              setAdding(null);
              setEditTask(null);
              return null;
            }}
          />
        )}
      </Sheet>

      <Sheet open={adding === 'chore' || !!editChore} onClose={() => { setAdding(null); setEditChore(null); }} title={editChore ? 'Wiederkehrende Aufgabe' : 'Neue wiederkehrende Aufgabe'}>
        {(adding === 'chore' || editChore) && (
          <ChoreForm
            initial={editChore}
            onDelete={editChore ? async () => { await chores.remove(editChore.id); setEditChore(null); } : undefined}
            onSave={async (v) => {
              const res = editChore ? await chores.update(editChore.id, v) : await chores.insert(v);
              if (res.error) return res.error;
              setAdding(null);
              setEditChore(null);
              return null;
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function AssigneePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { session, partner, me } = useAuth();
  const opts: { id: string | null; label: string }[] = [
    { id: null, label: 'Wir beide' },
    { id: session?.user.id ?? '', label: me?.display_name ?? 'Ich' },
    { id: partner?.id ?? '', label: partner?.display_name ?? 'Partner' },
  ];
  return (
    <div className="field">
      <span>Wer kümmert sich?</span>
      <div className="assignee-row" role="radiogroup" aria-label="Zuständig">
        {opts.map((o) => (
          <button type="button" key={String(o.id)} role="radio" aria-checked={value === o.id} className={`assignee-opt press${value === o.id ? ' on' : ''}`} onClick={() => onChange(o.id)}>
            <Avatar userId={o.id} size={30} />
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function nextWeekend(today: string) {
  const d = parseDate(today);
  const add = (6 - d.getDay() + 7) % 7; // Samstag
  d.setDate(d.getDate() + add);
  return toIso(d);
}

function TaskForm({
  initial,
  onSave,
  onDelete,
  onSwitchToChore,
}: {
  initial: Task | null;
  onSave: (v: Partial<Task>) => Promise<string | null>;
  onDelete?: () => void;
  onSwitchToChore?: () => void;
}) {
  const { session } = useAuth();
  const today = berlinToday();
  const tomorrow = toIso(new Date(parseDate(today).getTime() + 86400000));
  const [title, setTitle] = useState(initial?.title ?? '');
  const [assignee, setAssignee] = useState<string | null>(initial ? initial.assignee : null);
  const [due, setDue] = useState<string | null>(initial?.due_on ?? null);
  const [important, setImportant] = useState(initial?.important ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quick = [
    { label: 'Heute', value: today },
    { label: 'Morgen', value: tomorrow },
    { label: 'Wochenende', value: nextWeekend(today) },
    { label: 'Kein Datum', value: null },
  ];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await onSave({ title: title.trim(), assignee, due_on: due, important });
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Was ist zu tun?</span>
        <input value={title} maxLength={120} required autoFocus={!initial} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Balkon bepflanzen" />
      </label>
      <AssigneePicker value={assignee} onChange={setAssignee} />
      <div className="field">
        <span>Fällig</span>
        <div className="chips">
          {quick.map((q) => (
            <button type="button" key={q.label} className={`chip-btn small press${due === q.value ? ' on peach' : ''}`} aria-pressed={due === q.value} onClick={() => setDue(q.value)}>
              {q.label}
            </button>
          ))}
        </div>
        <input type="date" value={due ?? ''} onChange={(e) => setDue(e.target.value || null)} />
        {due && <span className="form-hint">{formatDate(due, true)}</span>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
        <span className="toggle-ui peach" aria-hidden="true" />
        <span>Wichtig ❗</span>
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-btn press" disabled={busy || !title.trim()}>
        {busy ? 'Wird gespeichert …' : initial ? 'Speichern' : 'Hinzufügen'}
      </button>
      {onSwitchToChore && (
        <button type="button" className="link-btn" onClick={onSwitchToChore}>
          <Repeat size={14} style={{ verticalAlign: '-2px' }} /> Lieber wiederkehrend?
        </button>
      )}
      {onDelete && <ConfirmButton onConfirm={onDelete} />}
      {initial?.created_by && initial.created_by !== session?.user.id && <p className="form-hint center">Angelegt von deinem Schatz</p>}
    </form>
  );
}

function ChoreForm({ initial, onSave, onDelete }: { initial: Chore | null; onSave: (v: Partial<Chore>) => Promise<string | null>; onDelete?: () => void }) {
  const today = berlinToday();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [assignee, setAssignee] = useState<string | null>(initial ? initial.assignee : null);
  const [every, setEvery] = useState<ChoreEvery>(initial?.every ?? 'woechentlich');
  const [next, setNext] = useState(initial?.next_due ?? today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await onSave({ title: title.trim(), assignee, every, next_due: next });
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Was steht regelmäßig an?</span>
        <input value={title} maxLength={120} required autoFocus={!initial} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Müll raus" />
      </label>
      <div className="field">
        <span>Wie oft?</span>
        <div className="chips">
          {EVERY.map((x) => (
            <button type="button" key={x.id} className={`chip-btn small press${every === x.id ? ' on peach' : ''}`} aria-pressed={every === x.id} onClick={() => setEvery(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <AssigneePicker value={assignee} onChange={setAssignee} />
      <label className="field">
        <span>{initial ? 'Nächstes Mal fällig' : 'Zum ersten Mal fällig'}</span>
        <input type="date" value={next} required onChange={(e) => setNext(e.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-btn press" disabled={busy || !title.trim() || !next}>
        {busy ? 'Wird gespeichert …' : initial ? 'Speichern' : 'Hinzufügen'}
      </button>
      {onDelete && <ConfirmButton onConfirm={onDelete} />}
    </form>
  );
}
