import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav, { type NavKey } from '../components/BottomNav';
import DaysCounter from '../components/DaysCounter';
import FeatureTile from '../components/FeatureTile';
import { features, groups } from '../features';
import { useAuth } from '../lib/auth';
import { Heart, Icon } from '../icons/Icon';
import { colors, tones } from '../theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Hallo';
  return 'Guten Abend';
}

export default function Dashboard() {
  const { hash } = useLocation();
  const { me, partner, signOut } = useAuth();
  const names = [me?.display_name, partner?.display_name].filter(Boolean).join(' & ') || 'ihr zwei';
  const section = hash.replace('#', '');

  // Navigation unten springt zum passenden Bereich
  useEffect(() => {
    if (!section) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [section]);

  const active: NavKey = (['alltag', 'nachrichten', 'erinnerungen'] as NavKey[]).includes(section as NavKey)
    ? (section as NavKey)
    : 'start';

  return (
    <>
      <main className="page">
        <span className="glow g1" aria-hidden="true" />
        <span className="glow g2" aria-hidden="true" />
        <span className="glow g3" aria-hidden="true" />

        <header className="top appear">
          <div>
            <p className="top-small">{greeting()}, {names} ✨</p>
            <h1 className="top-title">Couple App</h1>
          </div>
          <span className="beat">
            <Heart size={34} outline color={colors.coral} weight={2} />
          </span>
        </header>

        <DaysCounter />

        {groups.map((g, gi) => {
          const items = features.filter((f) => f.group === g.id);
          if (items.length === 0) return null;
          const tone = tones[g.tone];
          return (
            <section key={g.id} id={g.id} className="group appear" style={{ animationDelay: `${0.08 * (gi + 1)}s` }}>
              <h2 className="group-title">
                <span className="group-chip blob" style={{ background: tone.main, boxShadow: `0 6px 14px ${tone.shadow}` }}>
                  <Icon name={g.icon} size={20} stroke="#FFFFFF" accent="#FFFFFF" />
                </span>
                {g.title}
              </h2>
              <div className="grid">
                {items.map((f, i) => (
                  <FeatureTile key={f.id} feature={f} tone={tone} wide={i === items.length - 1 && items.length % 2 === 1} />
                ))}
              </div>
            </section>
          );
        })}

        <footer className="foot">
          <span>
            Mit Liebe gemacht <Heart size={12} />
          </span>
          <button className="link-btn" onClick={signOut}>
            Abmelden
          </button>
        </footer>
      </main>
      <BottomNav active={active} />
    </>
  );
}
