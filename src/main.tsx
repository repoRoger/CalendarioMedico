import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for full PWA installability and standalone full-screen support
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
