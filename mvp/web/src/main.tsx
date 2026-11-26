import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SessionProvider } from './app/session';
// Fontes empacotadas no build (funcionam offline):
// Space Grotesk nos títulos e na marca, IBM Plex Sans no corpo e nos
// formulários, IBM Plex Mono em números de OS, placas e valores.
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado.');

createRoot(container).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
);
