import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Unregister stale development service workers to prevent dev-sw.js text/html MIME type errors
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
      if (import.meta.env.DEV || scriptURL.includes('dev-sw')) {
        registration.unregister().catch(() => {});
      } else {
        registration.update().catch(() => {});
      }
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
