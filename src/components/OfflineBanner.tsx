import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Kleiner Hinweis oben, solange das iPhone offline ist. */
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="offline" role="status">
      <WifiOff size={16} /> Offline · Speichern geht gerade nicht
    </div>
  );
}
