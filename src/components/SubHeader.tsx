import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';

/** Kopfzeile der Unterseiten: Zurück, Titel und optional ein Plus-Knopf. */
export default function SubHeader({
  title,
  back = '/',
  onAdd,
  addLabel = 'Hinzufügen',
  sub,
}: {
  title: string;
  back?: string;
  onAdd?: () => void;
  addLabel?: string;
  sub?: ReactNode;
}) {
  return (
    <header className="sub-top">
      <Link to={back} className="back press" aria-label="Zurück">
        <ArrowLeft size={20} />
      </Link>
      <div className="sub-title-wrap">
        <h1 className="sub-title">{title}</h1>
        {sub && <p className="sub-sub">{sub}</p>}
      </div>
      {onAdd && (
        <button className="add-btn press" onClick={onAdd} aria-label={addLabel}>
          <Plus size={22} strokeWidth={2.6} />
        </button>
      )}
    </header>
  );
}
