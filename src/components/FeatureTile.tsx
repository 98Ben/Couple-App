import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Feature } from '../features';
import { Heart, Icon } from '../icons/Icon';
import type { Tone } from '../theme';

/** Kachel auf dem Dashboard: federt beim Antippen und lässt ein Herz aufsteigen. */
export default function FeatureTile({ feature, tone, wide }: { feature: Feature; tone: Tone; wide: boolean }) {
  const style = { background: tone.tileBg, boxShadow: `0 8px 22px ${tone.shadow}` } as CSSProperties;
  return (
    <Link to={`/f/${feature.id}`} className={`tile press${wide ? ' wide' : ''}`} style={style}>
      <span className="tile-icon blob" style={{ background: tone.blob }}>
        <Icon name={feature.icon} size={26} stroke={tone.icon} accent={tone.main} />
      </span>
      <span className="tile-text">
        <span className="tile-title">{feature.title}</span>
        <span className="tile-short">{feature.short}</span>
      </span>
      {feature.status === 'geplant' && <span className="tile-badge">bald</span>}
      <span className="tile-heart">
        <Heart size={18} color={tone.main} />
      </span>
    </Link>
  );
}
