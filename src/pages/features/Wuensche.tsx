import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import ConfirmButton from '../../components/ConfirmButton';
import Empty from '../../components/Empty';
import HeartBurst from '../../components/HeartBurst';
import Sheet from '../../components/Sheet';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { relativeTime } from '../../lib/dates';
import { NEED_KINDS, needKind, needTitle, type NeedKind } from '../../lib/needs';
import { notifyPartner } from '../../lib/push';
import { supabase } from '../../lib/supabase';
import type { Need } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';
import { Heart } from '../../icons/Icon';
import { tones } from '../../theme';

const tone = tones.rose;

export default function Wuensche() {
  const { session, partner } = useAuth();
  const myId = session?.user.id;
  const name = partner?.display_name ?? 'Dein Schatz';
  const { rows, loading, error, insert, update, remove, reload } = useCoupleTable<Need>('needs', { column: 'created_at', ascending: false });
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Need | null>(null);
  const [hearted, setHearted] = useState<{ id: string; n: number } | null>(null);

  const open = rows.filter((n) => !n.fulfilled_at);
  const mine = open.filter((n) => n.created_by === myId);
  const theirs = open.filter((n) => n.created_by !== myId);
  const done = rows.filter((n) => n.fulfilled_at).sort((a, b) => (b.fulfilled_at! > a.fulfilled_at! ? 1 : -1));

  const heart = async (n: Need) => {
    const { data, error } = await supabase.rpc('toggle_need_heart', { n: n.id });
    if (!error && data) {
      notifyPartner('need-heart', needTitle(n));
      setHearted({ id: n.id, n: (hearted?.n ?? 0) + 1 });
    }
    reload();
  };

  const fulfil = async (n: Need) => {
    setViewing(null);
    await update(n.id, { fulfilled_at: n.fulfilled_at ? null : new Date().toISOString() });
  };

  const card = (n: Need) => {
    const k = needKind(n.kind);
    const isMine = n.created_by === myId;
    const custom = k.id === 'eigen';
    return (
      <li key={n.id} className={`need-card appear${n.fulfilled_at ? ' done' : ''}`}>
        <button className="need-main plain-btn" onClick={() => setViewing(n)}>
          <span className="need-emoji blob" style={{ background: tone.blob }} aria-hidden="true">
            {k.emoji}
          </span>
          <span className="need-text">
            <span className="need-title">{needTitle(n)}</span>
            {!custom && n.text && <span className="need-note">„{n.text}“</span>}
            <span className="need-meta">
              {n.fulfilled_at
                ? `erfüllt ${relativeTime(n.fulfilled_at)} 🎉`
                : isMine
                  ? n.heart_at
                    ? `${name} hat's gesehen 💗`
                    : `noch nicht gesehen · ${relativeTime(n.created_at)}`
                  : relativeTime(n.created_at)}
            </span>
          </span>
        </button>
        {!isMine && !n.fulfilled_at && (
          <button
            className={`need-heart press${n.heart_at ? ' on' : ''}`}
            onClick={() => heart(n)}
            aria-pressed={!!n.heart_at}
            aria-label={n.heart_at ? 'Herz zurücknehmen' : 'Herz geben: gesehen'}
          >
            <Heart size={22} color={n.heart_at ? '#FF6B6B' : '#C9B6BF'} outline={!n.heart_at} />
            {hearted?.id === n.id && <HeartBurst key={hearted.n} />}
          </button>
        )}
        {isMine && !n.fulfilled_at && (
          <button className="need-done press" onClick={() => fulfil(n)} aria-label="Als erfüllt abhaken">
            <Check size={18} />
          </button>
        )}
      </li>
    );
  };

  return (
    <>
      <main className="page">
        <span className="glow g1" aria-hidden="true" />
        <SubHeader title="Wünsche" back="/nachrichten" sub="Was wir uns gerade wünschen" onAdd={() => setAdding(true)} addLabel="Wunsch eintragen" />

        {error && <p className="form-error">{error}</p>}

        {!loading && rows.length === 0 && (
          <Empty
            icon="wish"
            toneKey="rose"
            title="Was brauchst du gerade?"
            text={`Mehr Umarmungen, gemeinsame Zeit, kleine Überraschungen … Trag es ein – ${name} sieht es sofort und kann dir ein Herz geben.`}
          />
        )}

        {theirs.length > 0 && (
          <section>
            <h2 className="section-title">{name} wünscht sich</h2>
            <ul className="needs">{theirs.map(card)}</ul>
          </section>
        )}

        {(mine.length > 0 || rows.length > 0) && (
          <section>
            <h2 className="section-title">Du wünschst dir</h2>
            {mine.length ? (
              <ul className="needs">{mine.map(card)}</ul>
            ) : (
              <button className="secondary-btn press letter-cta" onClick={() => setAdding(true)}>
                + Wunsch eintragen
              </button>
            )}
          </section>
        )}

        {done.length > 0 && (
          <section>
            <h2 className="section-title">Erfüllt 🎉</h2>
            <ul className="needs">{done.slice(0, 20).map(card)}</ul>
          </section>
        )}
      </main>
      <BottomNav active="nachrichten" />

      <Sheet open={adding} onClose={() => setAdding(false)} title="Ich wünsche mir …">
        {adding && (
          <NeedForm
            onSave={async (v) => {
              const res = await insert(v);
              if (!res.error) setAdding(false);
              return res.error;
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing ? (viewing.created_by === myId ? 'Dein Wunsch' : `${name} wünscht sich`) : ''}>
        {viewing && (
          <div className="detail">
            <p className="need-big">
              <span aria-hidden="true">{needKind(viewing.kind).emoji}</span> {needTitle(viewing)}
            </p>
            {needKind(viewing.kind).id !== 'eigen' && viewing.text && <p className="need-note big">„{viewing.text}“</p>}
            <p className="detail-date">eingetragen {relativeTime(viewing.created_at)}</p>
            {viewing.created_by === myId ? (
              <div className="detail-actions">
                <button className="primary-btn press" onClick={() => fulfil(viewing)}>
                  {viewing.fulfilled_at ? 'Doch noch nicht erfüllt' : 'Erfüllt – danke! 🎉'}
                </button>
                <ConfirmButton
                  onConfirm={() => {
                    remove(viewing.id);
                    setViewing(null);
                  }}
                />
              </div>
            ) : (
              !viewing.fulfilled_at && (
                <button
                  className="primary-btn press"
                  onClick={() => {
                    heart(viewing);
                    setViewing(null);
                  }}
                >
                  {viewing.heart_at ? 'Herz zurücknehmen' : 'Gesehen – Herz geben 💗'}
                </button>
              )
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

function NeedForm({ onSave }: { onSave: (v: Partial<Need>) => Promise<string | null> }) {
  const { partner } = useAuth();
  const [kind, setKind] = useState<NeedKind>('umarmungen');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const custom = kind === 'eigen';

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (custom && !text.trim()) return;
    setBusy(true);
    setError(await onSave({ kind, text: text.trim() || null }));
    setBusy(false);
  };

  return (
    <form className="form" onSubmit={save}>
      <div className="need-grid" role="radiogroup" aria-label="Wunsch">
        {NEED_KINDS.map((k) => (
          <button
            type="button"
            key={k.id}
            role="radio"
            aria-checked={kind === k.id}
            className={`need-pick press${kind === k.id ? ' on' : ''}`}
            onClick={() => setKind(k.id)}
          >
            <span aria-hidden="true">{k.emoji}</span>
            {k.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>{custom ? 'Was wünschst du dir?' : 'Magst du noch etwas dazu sagen? (optional)'}</span>
        <textarea
          rows={2}
          maxLength={200}
          required={custom}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={custom ? 'z. B. Frühstück am Bett' : 'z. B. Gerade nach der Arbeit tut mir das gut'}
        />
      </label>
      <p className="form-hint">{partner?.display_name ?? 'Dein Schatz'} bekommt eine Benachrichtigung und sieht deinen Wunsch sofort.</p>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-btn press" disabled={busy || (custom && !text.trim())}>
        Wunsch eintragen 💗
      </button>
    </form>
  );
}
