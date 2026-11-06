import { useMemo, useState, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import Empty from '../../components/Empty';
import HeartBurst from '../../components/HeartBurst';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { formatDateShort } from '../../lib/dates';
import type { BucketCategory, BucketItem } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';
import { tones } from '../../theme';

const tone = tones.lav;

export const CATEGORIES: { id: BucketCategory; label: string; emoji: string }[] = [
  { id: 'reisen', label: 'Reisen', emoji: '✈️' },
  { id: 'essen', label: 'Essen', emoji: '🍜' },
  { id: 'abenteuer', label: 'Abenteuer', emoji: '🧗' },
  { id: 'erlebnisse', label: 'Erlebnisse', emoji: '✨' },
];
const catOf = (id: BucketCategory) => CATEGORIES.find((c) => c.id === id)!;

export default function BucketList() {
  const { session } = useAuth();
  const { rows, loading, error, insert, update, remove } = useCoupleTable<BucketItem>('bucket_items', { column: 'created_at', ascending: false });
  const [filter, setFilter] = useState<BucketCategory | 'alle'>('alle');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BucketCategory>('reisen');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: string; n: number } | null>(null);

  const visible = useMemo(() => rows.filter((r) => filter === 'alle' || r.category === filter), [rows, filter]);
  const open = visible.filter((r) => !r.done_at);
  const done = visible.filter((r) => r.done_at).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));
  const doneCount = rows.filter((r) => r.done_at).length;

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setFormError(null);
    const res = await insert({ title: title.trim(), category });
    if (res.error) setFormError(res.error);
    else setTitle('');
    setBusy(false);
  };

  const toggle = (item: BucketItem) => {
    if (item.done_at) {
      update(item.id, { done_at: null, done_by: null });
    } else {
      setBurst({ id: item.id, n: Date.now() });
      update(item.id, { done_at: new Date().toISOString(), done_by: session?.user.id ?? null });
    }
  };

  const renderRow = (item: BucketItem) => {
    const c = catOf(item.category);
    return (
      <li key={item.id} className={`bucket-item${item.done_at ? ' done' : ''}`} style={{ background: item.done_at ? '#FFFFFF' : tone.tileBg }}>
        <button
          className="check press"
          onClick={() => toggle(item)}
          aria-pressed={!!item.done_at}
          aria-label={item.done_at ? `${item.title} wieder öffnen` : `${item.title} erledigt`}
          style={item.done_at ? { background: tone.main, borderColor: tone.main } : { borderColor: tone.main }}
        >
          {item.done_at && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
          {burst?.id === item.id && <HeartBurst key={burst.n} />}
        </button>
        <span className="bucket-text">
          <span className="bucket-title">{item.title}</span>
          <span className="bucket-meta">
            {c.emoji} {c.label}
            {item.done_at && ` · erledigt am ${formatDateShort(item.done_at)}`}
          </span>
        </span>
        <button className="x-btn press" onClick={() => remove(item.id)} aria-label={`${item.title} löschen`}>
          <X size={16} />
        </button>
      </li>
    );
  };

  return (
    <>
      <main className="page">
        <span className="glow g2" aria-hidden="true" />
        <SubHeader title="Bucket List" back="/erinnerungen" sub="Was wir noch erleben wollen" />

        {rows.length > 0 && (
          <section className="bucket-progress appear" style={{ background: tone.tileBg, boxShadow: `0 10px 24px ${tone.shadow}` }}>
            <p>
              <strong>{doneCount}</strong> von {rows.length} Träumen erfüllt
            </p>
            <span className="cd-bar" aria-hidden="true">
              <span style={{ width: `${(doneCount / rows.length) * 100}%`, background: tone.main }} />
            </span>
          </section>
        )}

        <form className="card add-card" onSubmit={add}>
          <label className="field">
            <span>Neuer Wunsch</span>
            <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Nordlichter sehen" />
          </label>
          <div className="chips" role="radiogroup" aria-label="Kategorie">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                role="radio"
                aria-checked={category === c.id}
                className={`chip-btn press${category === c.id ? ' on' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <button className="primary-btn press" disabled={busy || !title.trim()}>
            Auf die Liste
          </button>
        </form>

        <div className="chips filter" role="tablist" aria-label="Filter">
          {[{ id: 'alle' as const, label: 'Alle', emoji: '💫' }, ...CATEGORIES].map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={filter === c.id}
              className={`chip-btn press${filter === c.id ? ' on' : ''}`}
              onClick={() => setFilter(c.id)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}
        {!loading && rows.length === 0 && (
          <Empty icon="sparkle" title="Eure Liste ist noch leer" text="Was wollt ihr unbedingt zusammen erleben? Reisen, Essen, Abenteuer: schreibt es auf." />
        )}

        {open.length > 0 && (
          <ul className="bucket-list">
            {open.map(renderRow)}
          </ul>
        )}
        {done.length > 0 && (
          <section>
            <h2 className="section-title">Schon erlebt 💕</h2>
            <ul className="bucket-list">
              {done.map(renderRow)}
            </ul>
          </section>
        )}
      </main>
      <BottomNav active="erinnerungen" />
    </>
  );
}
