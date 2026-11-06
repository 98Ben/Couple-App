import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/iconShapes';
import { tones, type ToneKey } from '../theme';

/** Freundlicher Leerzustand mit Icon, Text und optionalem Knopf. */
export default function Empty({
  icon,
  toneKey = 'lav',
  title,
  text,
  action,
  onAction,
}: {
  icon: IconName;
  toneKey?: ToneKey;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  const tone = tones[toneKey];
  return (
    <section className="empty appear" style={{ background: tone.tileBg }}>
      <span className="placeholder-icon blob float">
        <Icon name={icon} size={40} stroke={tone.icon} accent={tone.main} weight={1.6} />
      </span>
      <p className="placeholder-head">{title}</p>
      <p className="form-hint center">{text}</p>
      {action && onAction && (
        <button className="primary-btn press" onClick={onAction}>
          {action}
        </button>
      )}
    </section>
  );
}
