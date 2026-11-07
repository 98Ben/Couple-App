import { useAuth } from '../lib/auth';

const ME = '#FF8E85';
const PARTNER = '#C98BEA';

/** Kleiner Kreis mit Anfangsbuchstaben. userId = null heißt „wir beide“. */
export default function Avatar({ userId, size = 28 }: { userId: string | null; size?: number }) {
  const { session, me, partner } = useAuth();
  const myId = session?.user.id;
  const letter = (n: string | null | undefined, fallback: string) => (n?.trim()?.[0] ?? fallback).toUpperCase();
  const dot = (bg: string, l: string, label: string, offset = 0) => (
    <span className="avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.45, marginLeft: offset }} title={label}>
      {l}
    </span>
  );

  if (userId === null) {
    return (
      <span className="avatar-pair" aria-label="Wir beide">
        {dot(ME, letter(me?.display_name, 'I'), me?.display_name ?? 'Du')}
        {dot(PARTNER, letter(partner?.display_name, 'D'), partner?.display_name ?? 'Partner', -size * 0.35)}
      </span>
    );
  }
  const mine = userId === myId;
  const name = mine ? me?.display_name ?? 'Du' : partner?.display_name ?? 'Partner';
  return <span aria-label={mine ? 'Du' : name}>{dot(mine ? ME : PARTNER, letter(name, mine ? 'I' : 'D'), name)}</span>;
}
