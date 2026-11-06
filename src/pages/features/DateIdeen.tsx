import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import HeartBurst from '../../components/HeartBurst';
import SubHeader from '../../components/SubHeader';
import { useAuth } from '../../lib/auth';
import { notifyPartner } from '../../lib/push';
import { supabase } from '../../lib/supabase';
import type { DateIdea, Wish } from '../../lib/types';
import { useCoupleTable } from '../../lib/useCoupleTable';
import { Heart, Icon } from '../../icons/Icon';
import { tones } from '../../theme';

const tone = tones.lav;
const sun = tones.sun;

const SETTINGS = [
  { id: 'drinnen', label: 'Drinnen', emoji: '🏠' },
  { id: 'draussen', label: 'Draußen', emoji: '🌳' },
] as const;
const COSTS = [
  { id: 'kostenlos', label: 'Kostenlos', emoji: '🆓' },
  { id: 'guenstig', label: 'Günstig', emoji: '💶' },
  { id: 'teurer', label: 'Besonders', emoji: '💎' },
] as const;
const WISH_STARTS = ['Ich würde so gerne mal wieder …', 'Überrasch mich mit …', 'Ich wünsche mir …', 'Lass uns mal …'];

const settingLabel = (s: DateIdea['setting']) => SETTINGS.find((x) => x.id === s)?.emoji ?? '🔀';
const costLabel = (c: DateIdea['cost']) => COSTS.find((x) => x.id === c)?.emoji ?? '';

export default function DateIdeen() {
  const { session, partner } = useAuth();
  const me = session?.user.id;
  const ideas = useCoupleTable<DateIdea>('date_ideas', { column: 'created_at' });
  const wishes = useCoupleTable<Wish>('wishes', { column: 'created_at', ascending: false });

  // Start-Ideen einmalig anlegen (die Datenbank verhindert doppeltes Anlegen)
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || ideas.loading || ideas.rows.length > 0) return;
    seeded.current = true;
    supabase.rpc('seed_date_ideas').then(() => ideas.reload());
  }, [ideas.loading, ideas.rows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const [settingF, setSettingF] = useState<DateIdea['setting'] | null>(null);
  const [costF, setCostF] = useState<DateIdea['cost'] | null>(null);
  const pool = useMemo(
    () =>
      ideas.rows.filter(
        (i) => (!settingF || i.setting === settingF || i.setting === 'egal') && (!costF || i.cost === costF),
      ),
    [ideas.rows, settingF, costF],
  );

  // Würfel
  const [rolling, setRolling] = useState(false);
  const [shown, setShown] = useState<DateIdea | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [burstKey, setBurstKey] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const roll = () => {
    if (pool.length === 0 || rolling) return;
    setRolling(true);
    setToast(null);
    const final = pool[Math.floor(Math.random() * pool.length)];
    // kurz durch Ideen „blättern“, immer langsamer
    const steps = 9;
    let t = 0;
    for (let i = 0; i < steps; i++) {
      t += 60 + i * 22;
      const pick = i === steps - 1 ? final : pool[Math.floor(Math.random() * pool.length)];
      timers.current.push(window.setTimeout(() => setShown(pick), t));
    }
    timers.current.push(
      window.setTimeout(() => {
        setRolling(false);
        setBurstKey((k) => k + 1);
      }, t + 120),
    );
  };

  const toBucket = async (idea: DateIdea) => {
    const { error } = await supabase.from('bucket_items').insert({ title: idea.title, category: 'erlebnisse' });
    if (!error) notifyPartner('bucket', idea.title);
    setToast(error ? 'Hat nicht geklappt. Bist du online?' : 'Steht jetzt auf eurer Bucket List 💕');
  };

  // Neue Idee
  const [newIdea, setNewIdea] = useState('');
  const [newSetting, setNewSetting] = useState<DateIdea['setting']>('egal');
  const [newCost, setNewCost] = useState<DateIdea['cost']>('guenstig');
  const [showAll, setShowAll] = useState(false);
  const addIdea = async (e: FormEvent) => {
    e.preventDefault();
    if (!newIdea.trim()) return;
    const res = await ideas.insert({ title: newIdea.trim(), setting: newSetting, cost: newCost });
    if (!res.error) setNewIdea('');
  };

  // Wunsch-Box
  const [wishText, setWishText] = useState('');
  const partnerName = partner?.display_name ?? 'deinem Schatz';
  const fromPartner = wishes.rows.filter((w) => w.created_by !== me);
  const mine = wishes.rows.filter((w) => w.created_by === me);
  const addWish = async (e: FormEvent) => {
    e.preventDefault();
    const text = wishText.replace(/…\s*$/, '').trim();
    if (!text) return;
    const res = await wishes.insert({ text });
    if (!res.error) setWishText('');
  };
  const toggleWish = async (w: Wish) => {
    await supabase.rpc('toggle_wish_fulfilled', { wish: w.id });
    wishes.reload();
  };

  return (
    <>
      <main className="page">
        <span className="glow g3" aria-hidden="true" style={{ top: 360 }} />
        <SubHeader title="Date-Ideen" back="/erinnerungen" sub="Würfeln, sammeln, wünschen" />

        {/* Date-Würfel */}
        <section className="dice-card appear">
          <p className="eyebrow">Date-Würfel</p>
          <button
            className={`dice press${rolling ? ' rolling' : ''}`}
            onClick={roll}
            disabled={pool.length === 0}
            aria-label="Würfeln"
          >
            <Icon name="dice" size={64} stroke="#3A2E39" accent="#FF6B6B" weight={1.5} />
          </button>
          <div className="dice-result" aria-live="polite">
            {shown ? (
              <>
                <p className={`dice-idea${rolling ? ' blur' : ''}`}>{shown.title}</p>
                {!rolling && (
                  <>
                    <p className="dice-tags">
                      {settingLabel(shown.setting)} {costLabel(shown.cost)}
                    </p>
                    <span className="burst-anchor">{burstKey > 0 && <HeartBurst key={burstKey} />}</span>
                    <div className="dice-actions">
                      <button className="primary-btn press" onClick={() => toBucket(shown)}>
                        Machen wir! 💕
                      </button>
                      <button className="secondary-btn press" onClick={roll}>
                        Nochmal
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="dice-hint">{pool.length ? 'Tipp auf den Würfel, wenn ihr euch nicht entscheiden könnt.' : 'Keine Idee passt zu den Filtern.'}</p>
            )}
            {toast && <p className="toast">{toast}</p>}
          </div>
          <div className="chips center-chips">
            {SETTINGS.map((s) => (
              <button key={s.id} className={`chip-btn press${settingF === s.id ? ' on' : ''}`} aria-pressed={settingF === s.id} onClick={() => setSettingF(settingF === s.id ? null : s.id)}>
                {s.emoji} {s.label}
              </button>
            ))}
            {COSTS.map((c) => (
              <button key={c.id} className={`chip-btn press${costF === c.id ? ' on' : ''}`} aria-pressed={costF === c.id} onClick={() => setCostF(costF === c.id ? null : c.id)}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* Wunsch-Box */}
        <section className="card wish-box appear" style={{ animationDelay: '0.08s', boxShadow: `0 10px 26px ${sun.shadow}` }}>
          <h2 className="card-title">
            <Icon name="letter" size={22} stroke={sun.icon} accent={tones.rose.main} /> Wunsch-Box
          </h2>

          <div>
            <p className="wish-head">Wünsche von {partner?.display_name ?? 'deinem Schatz'} an dich</p>
            {fromPartner.length === 0 ? (
              <p className="form-hint">Noch keine. Vielleicht kommt bald einer 😉</p>
            ) : (
              <ul className="wish-list">
                {fromPartner.map((w) => (
                  <li key={w.id} className={`wish${w.fulfilled_at ? ' done' : ''}`} style={{ background: sun.tileBg }}>
                    <span>{w.text}</span>
                    <button
                      className="wish-heart press"
                      onClick={() => toggleWish(w)}
                      aria-pressed={!!w.fulfilled_at}
                      aria-label={w.fulfilled_at ? 'Als offen markieren' : 'Als erfüllt markieren'}
                    >
                      <Heart size={22} color={tones.rose.main} outline={!w.fulfilled_at} weight={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="wish-head">Deine Wünsche an {partnerName}</p>
            {mine.length > 0 && (
              <ul className="wish-list">
                {mine.map((w) => (
                  <li key={w.id} className={`wish${w.fulfilled_at ? ' done' : ''}`} style={{ background: tone.tileBg }}>
                    <span>
                      {w.text}
                      {w.fulfilled_at && <em> · erfüllt 💕</em>}
                    </span>
                    <button className="x-btn press" onClick={() => wishes.remove(w.id)} aria-label="Wunsch löschen">
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form className="form" onSubmit={addWish} style={{ marginTop: 10 }}>
              <div className="chips">
                {WISH_STARTS.map((s) => (
                  <button type="button" key={s} className="chip-btn small press" onClick={() => setWishText(s.replace('…', '').trimEnd() + ' ')}>
                    {s}
                  </button>
                ))}
              </div>
              <label className="field">
                <span className="sr-only">Dein Wunsch</span>
                <textarea rows={2} maxLength={300} value={wishText} onChange={(e) => setWishText(e.target.value)} placeholder={`Was wünschst du dir von ${partnerName}?`} />
              </label>
              <button className="primary-btn press" disabled={!wishText.trim()}>
                Wunsch einwerfen
              </button>
            </form>
          </div>
        </section>

        {/* Ideen-Pool */}
        <section className="card appear" style={{ animationDelay: '0.12s', boxShadow: `0 10px 26px ${tone.shadow}` }}>
          <h2 className="card-title">
            <Icon name="sparkle" size={20} stroke={tone.icon} accent={tone.main} /> Unsere Ideen ({ideas.rows.length})
          </h2>
          <form className="form" onSubmit={addIdea}>
            <label className="field">
              <span className="sr-only">Neue Idee</span>
              <input value={newIdea} maxLength={120} onChange={(e) => setNewIdea(e.target.value)} placeholder="Neue Date-Idee …" />
            </label>
            <div className="chips">
              {[...SETTINGS, { id: 'egal', label: 'Egal', emoji: '🔀' } as const].map((s) => (
                <button type="button" key={s.id} className={`chip-btn small press${newSetting === s.id ? ' on' : ''}`} aria-pressed={newSetting === s.id} onClick={() => setNewSetting(s.id)}>
                  {s.emoji} {s.label}
                </button>
              ))}
              {COSTS.map((c) => (
                <button type="button" key={c.id} className={`chip-btn small press${newCost === c.id ? ' on' : ''}`} aria-pressed={newCost === c.id} onClick={() => setNewCost(c.id)}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
            <button className="secondary-btn press" disabled={!newIdea.trim()}>
              Idee hinzufügen
            </button>
          </form>

          <ul className="idea-list">
            {(showAll ? ideas.rows : ideas.rows.slice(-6).reverse()).map((i) => (
              <li key={i.id}>
                <span className="idea-tags">{settingLabel(i.setting)}{costLabel(i.cost)}</span>
                <span className="idea-title">{i.title}</span>
                <button className="x-btn press" onClick={() => ideas.remove(i.id)} aria-label={`${i.title} löschen`}>
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
          {ideas.rows.length > 6 && (
            <button className="link-btn" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Weniger anzeigen' : `Alle ${ideas.rows.length} Ideen anzeigen`}
            </button>
          )}
        </section>
      </main>
      <BottomNav active="erinnerungen" />
    </>
  );
}
