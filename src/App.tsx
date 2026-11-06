import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Heart } from './icons/Icon';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import Login from './pages/Login';
import Pairing from './pages/Pairing';

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
        <Route path="/f/:id" element={<FeaturePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return <div className="app">{content}</div>;
}
