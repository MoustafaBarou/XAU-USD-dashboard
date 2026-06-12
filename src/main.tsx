import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './lib/AuthContext';
import { PreferencesProvider } from './lib/PreferencesContext';
import { ToastProvider } from './components/Toasts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PreferencesProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </PreferencesProvider>
    </AuthProvider>
  </StrictMode>,
);
