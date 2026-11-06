import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

/** Löschen mit zweitem Antippen zur Bestätigung (statt nerviger Dialoge). */
export default function ConfirmButton({ onConfirm, label = 'Löschen' }: { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={`danger-btn press${armed ? ' armed' : ''}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      <Trash2 size={16} /> {armed ? 'Wirklich löschen?' : label}
    </button>
  );
}
