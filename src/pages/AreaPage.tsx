import BottomNav, { type NavKey } from '../components/BottomNav';
import FeatureTile from '../components/FeatureTile';
import SubHeader from '../components/SubHeader';
import { features, findGroup, type FeatureGroup } from '../features';
import { Icon } from '../icons/Icon';
import { tones } from '../theme';

const TEXT: Partial<Record<FeatureGroup, { sub: string; intro: string }>> = {
  erinnerungen: {
    sub: 'Orte, Momente und was noch kommt',
    intro: 'Alles, was ihr zusammen erlebt habt und noch erleben wollt, an einem Ort.',
  },
  nachrichten: {
    sub: 'Kleine Botschaften für zwischendurch',
    intro: 'Liebe Worte, eine Frage für jeden Tag und kleine Zeichnungen nur für euch.',
  },
};

/** Übersichtsseite eines Bereichs (z. B. /erinnerungen, /nachrichten). */
export default function AreaPage({ group: groupId }: { group: FeatureGroup }) {
  const group = findGroup(groupId);
  const tone = tones[group.tone];
  const items = features.filter((f) => f.group === groupId);
  const text = TEXT[groupId];
  const nav: NavKey = groupId === 'extras' ? 'start' : groupId;

  return (
    <>
      <main className="page">
        <span className="glow g2" aria-hidden="true" />
        <SubHeader title={group.title} sub={text?.sub} />

        {text && (
          <section className="area-hero appear" style={{ background: tone.tileBg, boxShadow: `0 14px 34px ${tone.shadow}` }}>
            <span className="area-hero-icon blob" style={{ background: tone.main }}>
              <Icon name={group.icon} size={30} stroke="#FFFFFF" accent="#FFFFFF" />
            </span>
            <p>{text.intro}</p>
          </section>
        )}

        <div className="grid appear" style={{ animationDelay: '0.08s' }}>
          {items.map((f, i) => (
            <FeatureTile key={f.id} feature={f} tone={tone} wide={i === items.length - 1 && items.length % 2 === 1} />
          ))}
        </div>
      </main>
      <BottomNav active={nav} />
    </>
  );
}
