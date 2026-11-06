import { useMemo, useState, type FormEvent } from 'react';
import BottomNav from '../../components/BottomNav';
import ConfirmButton from '../../components/ConfirmButton';
import { Photo, PhotoField } from '../../components/Photo';
import Empty from '../../components/Empty';
import Sheet from '../../components/Sheet';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { formatDate, parseDate, plural, todayIso, yearsAgo } from '../../lib/dates';
import { removePhoto, uploadPhoto } from '../../lib/photos';
import type { Moment } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';
import { Heart, Icon } from '../../icons/Icon';
import { tones } from '../../theme';

const tone = tones.lav;

export default function FotoTimeline() {
  const { couple } = useAuth();
  const { rows, loading, error, insert, update, remove } = useCoupleTable<Moment>('moments', { column: 'happened_on', ascending: false });
  const [editing, setEditing] = useState<Moment | 'neu' | null>(null);
  const [viewing, setViewing] = useState<Moment | null>(null);

  // Nach Jahren gruppiert, neueste zuerst
  const years = useMemo(() => {
    const map = new Map<number, Moment[]>();
    for (const m of rows) {
      const y = parseDate(m.happened_on).getFullYear();
      map.set(y, [...(map.get(y) ?? []), m]);
    }
    return [...map.entries()];
  }, [rows]);

  // „An diesem Tag“: gleicher Tag und Monat in früheren Jahren
  const onThisDay = useMemo(() => {
    const t = todayIso().slice(5);
    return rows.filter((m) => m.happened_on.slice(5) === t && yearsAgo(m.happened_on) > 0);
  }, [rows]);

  const del = async (m: Moment) => {
    setViewing(null);
    await remove(m.id);
    await removePhoto(m.photo_path);
  };

  return (
    <>
      <main className="page">
        <span className="glow g2" aria-hidden="true" />
        <SubHeader
          title="Foto-Timeline"
          back="/erinnerungen"
          onAdd={() => setEditing('neu')}
          addLabel="Moment hinzufügen"
          sub={rows.length ? plural(rows.length, 'Moment', 'Momente') : undefined}
        />

        {onThisDay.length > 0 && (
          <section className="on-this-day appear" style={{ background: tone.tileBg, boxShadow: `0 12px 28px ${tone.shadow}` }}>
            <p className="eyebrow" style={{ color: tone.icon }}>
              <Icon name="hourglass" size={18} stroke={tone.icon} accent={tone.main} /> An diesem Tag
            </p>
            <div className="otd-row">
              {onThisDay.map((m) => (
                <button key={m.id} className="otd-card press" onClick={() => setViewing(m)}>
                  <Photo path={m.photo_path} alt={m.title} className="otd-photo" />
                  <span className="otd-text">
                    <strong>{m.title}</strong>
                    <span>vor {plural(yearsAgo(m.happened_on), 'Jahr', 'Jahren')}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {error && <p className="form-error">{error}</p>}
        {!loading && rows.length === 0 && (
          <Empty
            icon="photos"
            title="Noch keine Momente"
            text="Haltet eure schönsten Momente fest: Dates, Ausflüge, Alltag. Jeder bekommt ein Foto, ein Datum und ein paar Worte."
            action="Ersten Moment hinzufügen"
            onAction={() => setEditing('neu')}
          />
        )}

        <div className="timeline">
          {years.map(([year, items]) => (
            <section key={year} className="tl-year">
              <h2 className="tl-year-label" style={{ background: tone.main }}>
                {year}
              </h2>
              {items.map((m, i) => (
                <article key={m.id} className="tl-item appear" style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}>
                  <span className="tl-dot" aria-hidden="true">
                    <Heart size={14} color={tone.main} />
                  </span>
                  <button className={`polaroid press ${i % 2 ? 'tilt-r' : 'tilt-l'}`} onClick={() => setViewing(m)}>
                    <Photo path={m.photo_path} alt={m.title} className="polaroid-photo" />
                    <span className="polaroid-caption">
                      <strong>{m.title}</strong>
                      <span>{formatDate(m.happened_on)}</span>
                      {m.note && <span className="polaroid-note">{m.note}</span>}
                    </span>
                  </button>
                </article>
              ))}
            </section>
          ))}
        </div>
      </main>
      <BottomNav active="erinnerungen" />

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? ''}>
        {viewing && (
          <div className="detail">
            <Photo path={viewing.photo_path} alt={viewing.title} className="detail-photo" />
            <p className="detail-date">{formatDate(viewing.happened_on, true)}</p>
            {viewing.note && <p className="detail-note">{viewing.note}</p>}
            <div className="detail-actions">
              <button className="secondary-btn press" onClick={() => { setEditing(viewing); setViewing(null); }}>
                Bearbeiten
              </button>
              <ConfirmButton onConfirm={() => del(viewing)} />
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'neu' ? 'Neuer Moment' : 'Moment bearbeiten'}>
        {editing && couple && (
          <MomentForm
            initial={editing === 'neu' ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (values, file) => {
              const old = editing === 'neu' ? null : editing;
              let photo_path = old?.photo_path ?? null;
              if (file) photo_path = await uploadPhoto(couple.id, file);
              const res = old ? await update(old.id, { ...values, photo_path }) : await insert({ ...values, photo_path });
              if (res.error) return res.error;
              if (file && old?.photo_path) await removePhoto(old.photo_path);
              setEditing(null);
              return null;
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function MomentForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Moment | null;
  onSave: (v: Pick<Moment, 'title' | 'happened_on' | 'note'>, file: File | null) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.happened_on ?? todayIso());
  const [note, setNote] = useState(initial?.note ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const err = await onSave({ title: title.trim(), happened_on: date, note: note.trim() || null }, file);
      if (err) setError(err);
    } catch (e2) {
      setError((e2 as Error).message);
    }
    setBusy(false);
  };

  return (
    <form className="form" onSubmit={submit}>
      <PhotoField file={file} existingPath={initial?.photo_path} onChange={setFile} />
      <label className="field">
        <span>Titel</span>
        <input value={title} maxLength={80} required onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Unser erster Urlaub" />
      </label>
      <label className="field">
        <span>Datum</span>
        <input type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="field">
        <span>Ein paar Worte (optional)</span>
        <textarea value={note} maxLength={1000} rows={3} onChange={(e) => setNote(e.target.value)} placeholder="Was war besonders?" />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-btn press" disabled={busy || !title.trim() || !date}>
        {busy ? 'Wird gespeichert …' : 'Speichern'}
      </button>
      <button type="button" className="link-btn" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  );
}
