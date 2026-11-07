import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav, { type NavKey } from '../components/BottomNav';
import { findFeature, findGroup } from '../features';
import { Heart, Icon } from '../icons/Icon';
import { tones } from '../theme';

/**
 * Platzhalterseite für Features mit status 'geplant'.
 * Wird ein Feature gebaut, bekommt es eine eigene Seite unter src/pages/features/
 * und App.tsx leitet dorthin.
 */
export default function FeaturePage() {
  const { id } = useParams();
  const f = findFeature(id);
  if (!f) return <Navigate to="/" replace />;
  const group = findGroup(f.group);
  const tone = tones[group.tone];
  const nav: NavKey = f.group === 'extras' ? 'start' : f.group;

  return (
    <>
      <main className="page">
        <span className="glow g1" aria-hidden="true" />

        <header className="sub-top">
          <Link to={f.group !== 'alltag' ? `/${f.group}` : `/#${f.group}`} className="back press" aria-label="Zurück zum Dashboard">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="sub-title">{f.title}</h1>
        </header>

        <section className="placeholder appear" style={{ background: tone.tileBg, boxShadow: `0 14px 34px ${tone.shadow}` }}>
          <span className="placeholder-icon blob float" style={{ boxShadow: `0 10px 24px ${tone.shadow}` }}>
            <Icon name={f.icon} size={42} stroke={tone.icon} accent={tone.main} weight={1.6} />
          </span>
          <p className="placeholder-head">Hier entsteht etwas Schönes</p>
          <span className="sun-pill small">✨ kommt bald</span>
        </section>

        <section className="card appear" style={{ animationDelay: '0.1s', boxShadow: `0 10px 26px ${tone.shadow}` }}>
          <h2 className="card-title">
            <Icon name="sparkle" size={20} stroke={tone.icon} accent={tone.main} />
            Das kommt hier rein
          </h2>
          <ul className="plan">
            {f.planned.map((p) => (
              <li key={p}>
                <Heart size={16} outline color={tone.icon} weight={2} />
                {p}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <BottomNav active={nav} />
    </>
  );
}
