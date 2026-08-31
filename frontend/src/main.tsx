import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { Toaster } from 'react-hot-toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text-main)',
            border: '1px solid var(--color-border)',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: 'var(--color-surface)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-error)',
              secondary: 'var(--color-surface)',
            },
          },
        }}
      />
    </AuthProvider>
  </StrictMode>,
);
