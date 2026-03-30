import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initMonitoring } from './lib/monitoring';
import App from './App.tsx';
import './index.css';

// Initialize Sentry monitoring before rendering (production only)
initMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
