import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Ensure browser never retains stale service worker caches on reload
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.update();
    }
  }).catch(() => {});
}

// Clear obsolete http caches if any
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then(names => {
    for (const name of names) {
      if (name.includes('supabase') || name.includes('workbox-precache')) {
        caches.delete(name);
      }
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
