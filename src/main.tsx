import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { configureApiClient } from '@/services/apiClient';
import { auditLogger } from '@/services/auditLogger';
import { App } from './App';

// Configure API client with auth callbacks (avoids circular dependency)
// Token getter will be patched after AuthProvider mounts via module-level ref
let tokenGetter = () => null as string | null;

configureApiClient({
  getToken: () => tokenGetter(),
  onLogout: () => {
    // AuthProvider handles its own logout state; redirect is in apiClient
  },
  onError: (message: string) => {
    // Toast notification — in production this would use a toast library
    console.warn('API Error:', message);
  },
});

/**
 * Global unhandled promise rejection handler.
 * Logs to audit service and suppresses raw error details from UI (OWASP A04).
 */
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  // Suppress raw error details in production
  if (import.meta.env.PROD) {
    event.preventDefault();
  }

  // Log to audit service (non-blocking)
  const errorMessage = event.reason instanceof Error ? event.reason.message : 'Unknown error';
  console.warn('Unhandled rejection:', errorMessage);
  auditLogger.flush();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Expose token getter setter for AuthProvider integration
export function setTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}
