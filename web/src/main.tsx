import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import './index.css';
import { ToastProvider } from './ui/components';
import { MotionProvider } from './ui/motion';

// Dopo un nuovo deploy i file JS della versione precedente non esistono più:
// se una pagina aperta prova a caricarli, ricarichiamo una volta per prendere la versione nuova.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'tcg-reload-after-deploy';
  const last = Number(sessionStorage.getItem(KEY) ?? 0);
  if (Date.now() - last > 10_000) {
    event.preventDefault();
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MotionProvider>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </MotionProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
