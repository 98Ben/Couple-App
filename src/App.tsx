import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Heart } from './icons/Icon';
import Dashboard from './pages/Dashboard';
import Einstellungen from './pages/Einstellungen';
import OfflineBanner from './components/OfflineBanner';
import AreaPage from './pages/AreaPage';
import FeaturePage from './pages/FeaturePage';
import Login from './pages/Login';
import Pairing from './pages/Pairing';
import BucketList from './pages/features/BucketList';
import Countdowns from './pages/features/Countdowns';
import DateIdeen from './pages/features/DateIdeen';
import Doodle from './pages/features/Doodle';
import Einkaufsliste from './pages/features/Einkaufsliste';
import ToDos from './pages/features/ToDos';
import FrageDesTages from './pages/features/FrageDesTages';
import Liebesnotizen from './pages/features/Liebesnotizen';
import Quiz from './pages/features/Quiz';
import Zeitkapseln from './pages/features/Zeitkapseln';
import FotoTimeline from './pages/features/FotoTimeline';
// Karte (Leaflet) erst laden, wenn sie gebraucht wird
const Weltkarte = lazy(() => import('./pages/features/Weltkarte'));

export default function App() {
  const { loading, session, couple, partner } = useAuth();

  let content;
  if (loading) {
    content = (
      <main className="page splash" aria-label="Lädt">
        <span className="beat">
          <Heart size={48} color="#FF8E85" />
        </span>
      </main>
    );
  } else if (!session) {
    content = <Login />;
  } else if (!couple || !partner) {
    // Erst wenn beide verbunden sind, geht es in die App
    content = <Pairing />;
  } else {
    content = (
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/einstellungen" element={<Einstellungen />} />
        <Route path="/erinnerungen" element={<AreaPage group="erinnerungen" />} />
        <Route path="/nachrichten" element={<AreaPage group="nachrichten" />} />
        <Route path="/alltag" element={<AreaPage group="alltag" />} />
        <Route path="/f/einkaufsliste" element={<Einkaufsliste />} />
        <Route path="/f/todos" element={<ToDos />} />
        <Route path="/extras" element={<AreaPage group="extras" />} />
        <Route path="/f/quiz" element={<Quiz />} />
        <Route path="/f/zeitkapseln" element={<Zeitkapseln />} />
        <Route path="/f/liebesnotizen" element={<Liebesnotizen />} />
        <Route path="/f/frage-des-tages" element={<FrageDesTages />} />
        <Route path="/f/doodle" element={<Doodle />} />
        <Route path="/f/weltkarte" element={<Suspense fallback={<main className="page splash"><Heart size={40} color="#C98BEA" /></main>}><Weltkarte /></Suspense>} />
        <Route path="/f/foto-timeline" element={<FotoTimeline />} />
        <Route path="/f/tage-zaehler" element={<Countdowns />} />
        <Route path="/f/bucket-list" element={<BucketList />} />
        <Route path="/f/date-ideen" element={<DateIdeen />} />
        <Route path="/f/:id" element={<FeaturePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <OfflineBanner />
      {content}
    </div>
  );
}
