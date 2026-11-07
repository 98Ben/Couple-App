import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import DaysCounter from '../components/DaysCounter';
import MoodRings from '../components/MoodRings';
import { PushBanner, PushSheet } from '../components/PushSettings';
import TodayOverview from '../components/TodayOverview';
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
  const { me, partner } = useAuth();
  const [pushOpen, setPushOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const names = [me?.display_name, partner?.display_name].filter(Boolean).join(' & ') || 'ihr zwei';

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

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
          <Link to="/einstellungen" className="settings-btn press" aria-label="Einstellungen">
            <Settings size={22} color={colors.muted} strokeWidth={2} />
          </Link>
        </header>

        <DaysCounter editOpen={dateOpen} onEditOpenChange={setDateOpen} />

        <MoodRings />

        <PushBanner onOpen={() => setPushOpen(true)} />

        <TodayOverview />

        <section className="areas appear" style={{ animationDelay: '0.14s' }} aria-label="Bereiche">
          {groups.map((g) => {
            const tone = tones[g.tone];
            const names = features.filter((f) => f.group === g.id).map((f) => f.title).join(' · ');
            return (
              <Link
                key={g.id}
                to={`/${g.id}`}
                className="area-tile press"
                style={{ background: tone.tileBg, boxShadow: `0 8px 22px ${tone.shadow}` }}
              >
                <span className="group-chip blob" style={{ background: tone.main, boxShadow: `0 6px 14px ${tone.shadow}` }}>
                  <Icon name={g.icon} size={20} stroke="#FFFFFF" accent="#FFFFFF" />
                </span>
                <span className="area-text">
                  <span className="tile-title">{g.navLabel}</span>
                  <span className="tile-short area-names">{names}</span>
                </span>
                <span className="tile-heart">
                  <Heart size={18} color={tone.main} />
                </span>
              </Link>
            );
          })}
        </section>

        <footer className="foot">
          <span>
            Mit Liebe gemacht <Heart size={12} />
          </span>
        </footer>
      </main>
      <BottomNav active="start" />
      <PushSheet open={pushOpen} onClose={() => setPushOpen(false)} />
    </>
  );
}
