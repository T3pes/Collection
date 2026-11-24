import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router';
import { RequireAuth } from './auth/AuthProvider';
import { FullPageLoader } from './ui/components';

const HomePage = lazy(() => import('./pages/HomePage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const SetPage = lazy(() => import('./pages/SetPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

/** Indirizzi della vecchia app: /collection/:id e /collection/:id/cards?preset=… */
const LEGACY_PRESETS: Record<string, string> = {
  set1_ed1: 'naruto-s1-1ed',
  set1_ed2: 'naruto-s1-2ed',
  set2_ed1: 'naruto-s2-1ed',
  pokemon_fs_ed1: 'pokemon-me02',
  pokemon_bp_ed1: 'pokemon-me05',
};

function LegacyRedirect() {
  const { collectionId } = useParams();
  const [params] = useSearchParams();
  const set = LEGACY_PRESETS[params.get('preset') ?? ''];
  return <Navigate to={set ? `/c/${collectionId}/${set}` : `/c/${collectionId}`} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/c/:collectionId" element={<RequireAuth><CollectionPage /></RequireAuth>} />
        <Route path="/c/:collectionId/:setId" element={<RequireAuth><SetPage /></RequireAuth>} />
        <Route path="/collection/:collectionId" element={<LegacyRedirect />} />
        <Route path="/collection/:collectionId/cards" element={<LegacyRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
