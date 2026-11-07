import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Lock, X } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import ConfirmButton from '../../components/ConfirmButton';
import Empty from '../../components/Empty';
import HeartBurst from '../../components/HeartBurst';
import { Photo } from '../../components/Photo';
import Sheet from '../../components/Sheet';
import SubHeader from '../../components/SubHeader';
import { deutscherFehler, useAuth } from '../../lib/auth';
import { addMonths, berlinToday, daysUntil, formatDate, parseDate, toIso } from '../../lib/dates';
import { removePhoto, uploadPhoto } from '../../lib/photos';
import { notifyPartner } from '../../lib/push';
import { load as loadLocal, save as saveLocal } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import type { Capsule, CapsuleContent } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';

const BOX_COLORS = [
  { body: '#FFB3BC', lid: '#FF8E9A', ribbon: '#FFD166' },
  { body: '#FFCBA4', lid: '#FFAA74', ribbon: '#C98BEA' },
  { body: '#E2C6F5', lid: '#C98BEA', ribbon: '#FF8E85' },
  { body: '#FFE7A3', lid: '#FFC94D', ribbon: '#FF7B86' },
];
const OPENED_KEY = 'couple.capsulesOpened';

function openedSet(): Set<string> {
  try {
    return new Set(JSON.parse(loadLocal(OPENED_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function GiftBox({ index, state }: { index: number; state: 'locked' | 'ready' | 'opened' | 'opening' }) {
  const c = BOX_COLORS[index % BOX_COLORS.length];
  return (
    <span className={`gift ${state}`} style={{ ['--body' as string]: c.body, ['--lid' as string]: c.lid, ['--ribbon' as string]: c.ribbon }} aria-hidden="true">
      <span className="gift-bow">
        <span />
        <span />
      </span>
      <span className="gift-lid" />
      <span className="gift-body" />
    </span>
  );
}

export default function Zeitkapseln() {
  const { session, partner, couple } = useAuth();
  const myId = session?.user.id;
  const partnerName = partner?.display_name ?? 'deinem Schatz';
  const caps = useCoupleTable<Capsule>('capsules', { column: 'open_on' });
  const [contents, setContents] = useState<Map<string, CapsuleContent>>(new Map());
  const [opened, setOpened] = useState<Set<string>>(() => openedSet());
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Capsule | null>(null);
  const [opening, setOpening] = useState<Capsule | null>(null);
  const [phase, setPhase] = useState<'shake' | 'pop' | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const today = berlinToday();
  const readyIds = caps.rows.filter((c) => c.open_on <= today).map((c) => c.id).join(',');

  // Inhalte nur von fälligen Kapseln – die Datenbank gibt andere ohnehin nicht heraus
  const loadContents = useCallback(async () => {
    if (!readyIds) return;
    const { data } = await supabase.from('capsule_contents').select('capsule_id, message, photo_paths');
    setContents(new Map(((data as CapsuleContent[]) ?? []).map((c) => [c.capsule_id, c])));
  }, [readyIds]);
  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const markOpened = (id: string) => {
    const next = new Set(opened);
    next.add(id);
    setOpened(next);
    saveLocal(OPENED_KEY, JSON.stringify([...next]));
  };

  const startOpening = (c: Capsule) => {
    setOpening(c);
    setPhase('shake');
    timers.current.push(window.setTimeout(() => setPhase('pop'), 1100));
    timers.current.push(
      window.setTimeout(() => {
        setPhase(null);
        setOpening(null);
        markOpened(c.id);
        setViewing(c);
      }, 2300),
    );
  };

  const tap = (c: Capsule) => {
    if (c.open_on > today) return setViewing(c);
    if (!opened.has(c.id)) return startOpening(c);
    setViewing(c);
  };

  const sorted = useMemo(() => {
    const ready = caps.rows.filter((c) => c.open_on <= today && !opened.has(c.id));
    const locked = caps.rows.filter((c) => c.open_on > today);
    const done = caps.rows.filter((c) => c.open_on <= today && opened.has(c.id)).reverse();
    return { ready, locked, done };
  }, [caps.rows, opened, today]);

  const del = async (c: Capsule) => {
    setViewing(null);
    const { data } = await supabase.rpc('delete_capsule', { k: c.id });
    for (const p of (data as string[] | null) ?? []) await removePhoto(p);
    caps.reload();
  };

  const card = (c: Capsule, i: number) => {
    const state = c.open_on > today ? 'locked' : opened.has(c.id) ? 'opened' : 'ready';
    const d = daysUntil(c.open_on);
    return (
      <button key={c.id} className={`capsule press appear ${state}`} style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }} onClick={() => tap(c)}>
        <GiftBox index={i} state={state} />
        <span className="capsule-title">{c.title || 'Zeitkapsel'}</span>
        {state === 'locked' ? (
          <span className="capsule-lock">
            <Lock size={13} /> {d === 1 ? 'morgen' : `noch ${d} Tage`}
          </span>
        ) : state === 'ready' ? (
          <span className="capsule-ready">Jetzt öffnen! ✨</span>
        ) : (
          <span className="capsule-date">geöffnet · {formatDate(c.open_on)}</span>
        )}
      </button>
    );
  };

  const content = viewing ? contents.get(viewing.id) : undefined;

  return (
    <>
      <main className="page">
        <span className="glow g3" aria-hidden="true" style={{ top: 80 }} />
        <SubHeader title="Zeitkapseln" back="/extras" onAdd={() => setCreating(true)} addLabel="Zeitkapsel erstellen" sub="Für später versiegelt" />

        {caps.error && <p className="form-error">{caps.error}</p>}
        {!caps.loading && caps.rows.length === 0 && (
          <Empty
            icon="gift"
            toneKey="sun"
            title="Noch keine Zeitkapsel"
            text="Schreibt euch eine Nachricht an die Zukunft, legt Fotos dazu und wählt den Tag, an dem sie sich öffnet. Bis dahin bleibt sie für euch beide verschlossen."
            action="Erste Kapsel versiegeln"
            onAction={() => setCreating(true)}
          />
        )}

        {sorted.ready.length > 0 && (
          <section>
            <h2 className="section-title">Bereit zum Öffnen 🎉</h2>
            <div className="capsule-grid">{sorted.ready.map(card)}</div>
          </section>
        )}
        {sorted.locked.length > 0 && (
          <section>
            <h2 className="section-title">Noch versiegelt</h2>
            <div className="capsule-grid">{sorted.locked.map((c, i) => card(c, i + sorted.ready.length))}</div>
          </section>
        )}
        {sorted.done.length > 0 && (
          <section>
            <h2 className="section-title">Schon geöffnet</h2>
            <div className="capsule-grid">{sorted.done.map((c, i) => card(c, i + 1))}</div>
          </section>
        )}
      </main>
      <BottomNav active="start" />

      {opening && (
        <div className="capsule-stage" role="dialog" aria-label="Zeitkapsel wird geöffnet">
          <div className={`capsule-stage-box ${phase ?? ''}`}>
            <GiftBox index={0} state="opening" />
            {phase === 'pop' && <HeartBurst />}
            {phase === 'pop' && <HeartBurst key="b2" />}
          </div>
          <p className="capsule-stage-text">{phase === 'shake' ? 'Die Schleife löst sich …' : 'Überraschung! 💕'}</p>
        </div>
      )}

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || 'Zeitkapsel'}>
        {viewing && viewing.open_on > today && (
          <div className="detail">
            <div className="capsule-locked-info">
              <GiftBox index={0} state="locked" />
              <p className="detail-note">
                Versiegelt bis <strong>{formatDate(viewing.open_on, true)}</strong>. Noch {daysUntil(viewing.open_on)} {daysUntil(viewing.open_on) === 1 ? 'Tag' : 'Tage'}, dann dürft ihr beide hineinschauen.
              </p>
              <p className="form-hint">
                {viewing.created_by === myId ? 'Von dir versiegelt' : `Von ${partner?.display_name ?? 'deinem Schatz'} versiegelt`}
                {viewing.photo_count > 0 ? ` · ${viewing.photo_count} ${viewing.photo_count === 1 ? 'Foto' : 'Fotos'} drin` : ''}
              </p>
            </div>
            {viewing.created_by === myId && <ConfirmButton label="Kapsel löschen" onConfirm={() => del(viewing)} />}
          </div>
        )}
        {viewing && viewing.open_on <= today && (
          <div className="detail capsule-content">
            <p className="detail-date">
              Versiegelt am {formatDate(viewing.created_at.slice(0, 10))} · {viewing.created_by === myId ? 'von dir' : `von ${partner?.display_name ?? 'deinem Schatz'}`}
            </p>
            {content ? (
              <>
                <p className="capsule-message">{content.message}</p>
                {content.photo_paths.length > 0 && (
                  <div className="capsule-photos">
                    {content.photo_paths.map((p) => (
                      <Photo key={p} path={p} alt="Foto aus der Zeitkapsel" className="capsule-photo" />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="form-hint">Inhalt wird geladen …</p>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Neue Zeitkapsel">
        {creating && couple && (
          <CapsuleForm
            coupleId={couple.id}
            startDate={couple.start_date}
            partnerName={partnerName}
            onCancel={() => setCreating(false)}
            onDone={(openOn) => {
              notifyPartner('capsule', formatDate(openOn));
              setCreating(false);
              caps.reload();
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function nextAnniversary(start: string | null): string | null {
  if (!start) return null;
  const s = parseDate(start);
  const t = parseDate(berlinToday());
  let n = new Date(t.getFullYear(), s.getMonth(), s.getDate());
  if (n <= t) n = new Date(t.getFullYear() + 1, s.getMonth(), s.getDate());
  return toIso(n);
}

function CapsuleForm({
  coupleId,
  startDate,
  partnerName,
  onCancel,
  onDone,
}: {
  coupleId: string;
  startDate: string | null;
  partnerName: string;
  onCancel: () => void;
  onDone: (openOn: string) => void;
}) {
  const today = berlinToday();
  const anniversary = nextAnniversary(startDate);
  const quick = [
    ...(anniversary ? [{ label: 'Nächster Jahrestag 💞', value: anniversary }] : []),
    { label: 'In 6 Monaten', value: addMonths(today, 6) },
    { label: 'In 1 Jahr', value: addMonths(today, 12) },
  ];
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [openOn, setOpenOn] = useState(quick[0].value);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  const minDate = toIso(new Date(parseDate(today).getTime() + 86400000));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !openOn) return;
    setBusy(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      for (const f of files) uploaded.push(await uploadPhoto(coupleId, f));
      const { error } = await supabase.rpc('create_capsule', {
        cap_title: title.trim(),
        cap_open_on: openOn,
        cap_message: message.trim(),
        cap_photo_paths: uploaded,
      });
      if (error) throw new Error(deutscherFehler(error.message));
      onDone(openOn);
    } catch (e2) {
      for (const p of uploaded) await removePhoto(p);
      setError((e2 as Error).message);
    }
    setBusy(false);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Name der Kapsel (optional)</span>
        <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Für unseren 3. Jahrestag" />
      </label>
      <label className="field">
        <span>Deine Nachricht an die Zukunft</span>
        <textarea rows={5} maxLength={3000} required value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Liebe/r ${partnerName}, wenn du das liest …`} />
      </label>

      <div className="field">
        <span>Fotos (bis zu 5)</span>
        <div className="capsule-previews">
          {previews.map((u, i) => (
            <span key={u} className="capsule-preview">
              <img src={u} alt={`Foto ${i + 1}`} />
              <button type="button" className="preview-x" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Foto ${i + 1} entfernen`}>
                <X size={14} />
              </button>
            </span>
          ))}
          {files.length < 5 && (
            <label className="capsule-add-photo press">
              <ImagePlus size={24} />
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  setFiles([...files, ...picked].slice(0, 5));
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="field">
        <span>Öffnen am</span>
        <div className="chips">
          {quick.map((q) => (
            <button type="button" key={q.label} className={`chip-btn small press${openOn === q.value ? ' on' : ''}`} aria-pressed={openOn === q.value} onClick={() => setOpenOn(q.value)}>
              {q.label}
            </button>
          ))}
        </div>
        <input type="date" value={openOn} min={minDate} required onChange={(e) => setOpenOn(e.target.value)} />
      </div>

      <p className="seal-hint">
        <Lock size={14} /> Auch du kannst sie erst am {openOn ? formatDate(openOn) : '…'} wieder öffnen.
      </p>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-btn press" disabled={busy || !message.trim() || !openOn || openOn <= today}>
        {busy ? 'Wird versiegelt …' : 'Versiegeln 🎁'}
      </button>
      <button type="button" className="link-btn" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  );
}
