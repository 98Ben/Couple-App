import BottomNav from '../components/BottomNav';
import FeatureTile from '../components/FeatureTile';
import SubHeader from '../components/SubHeader';
import { features, findGroup } from '../features';
import { Icon } from '../icons/Icon';
import { tones } from '../theme';

/** Übersicht des Bereichs „Unsere Erinnerungen". */
export default function Erinnerungen() {
  const group = findGroup('erinnerungen');
  const tone = tones[group.tone];
  const items = features.filter((f) => f.group === 'erinnerungen');

  return (
    <>
      <main className="page">
        <span className="glow g2" aria-hidden="true" />
        <SubHeader title="Unsere Erinnerungen" sub="Orte, Momente und was noch kommt" />

        <section className="area-hero appear" style={{ background: tone.tileBg, boxShadow: `0 14px 34px ${tone.shadow}` }}>
          <span className="area-hero-icon blob" style={{ background: tone.main }}>
            <Icon name="polaroid" size={30} stroke="#FFFFFF" accent="#FFFFFF" />
          </span>
          <p>Alles, was ihr zusammen erlebt habt und noch erleben wollt, an einem Ort.</p>
        </section>

        <div className="grid appear" style={{ animationDelay: '0.08s' }}>
          {items.map((f, i) => (
            <FeatureTile key={f.id} feature={f} tone={tone} wide={i === items.length - 1 && items.length % 2 === 1} />
          ))}
        </div>
      </main>
      <BottomNav active="erinnerungen" />
    </>
  );
}
