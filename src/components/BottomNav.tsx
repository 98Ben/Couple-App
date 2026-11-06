import { Link } from 'react-router-dom';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/iconShapes';
import { colors } from '../theme';

export type NavKey = 'start' | 'alltag' | 'nachrichten' | 'erinnerungen';

const items: { key: NavKey; label: string; icon: IconName; to: string }[] = [
  { key: 'start', label: 'Start', icon: 'home', to: '/' },
  { key: 'alltag', label: 'Alltag', icon: 'checklist', to: '/#alltag' },
  { key: 'nachrichten', label: 'Nachrichten', icon: 'chat', to: '/#nachrichten' },
  { key: 'erinnerungen', label: 'Erinnerungen', icon: 'photos', to: '/#erinnerungen' },
];

/** Schwebende Navigation („Floating Island") am unteren Rand. */
export default function BottomNav({ active }: { active: NavKey }) {
  return (
    <nav className="nav" aria-label="Hauptnavigation">
      {items.map((it) => {
        const on = it.key === active;
        return (
          <Link key={it.key} to={it.to} className={`nav-item press${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>
            <Icon
              name={it.icon}
              size={22}
              stroke={on ? colors.text : colors.muted}
              accent={on ? '#FFFFFF' : colors.coral2}
            />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
