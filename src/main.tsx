import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import './lib/a11y/dark-theme.css';
import './pages/admin/admin-reference.css';
import App from './App.tsx';
import { installTagalogValidation } from './lib/validationMessages';
import { AuthProvider } from './lib/auth/AuthContext';
import { AccessibilityProvider } from './lib/a11y/AccessibilityContext';
import { ReadingGuideOverlay } from './components/a11y/ReadingGuideOverlay';
import { SoftGlowCursor } from './components/a11y/SoftGlowCursor';
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/700.css';

import { showFormFeedback } from './lib/formFeedback';
import './lib/formFeedback.css';
import { tagalogError } from './lib/validationMessages';
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => { if (typeof mutation.meta?.saveFeedback === 'string') showFormFeedback(mutation.meta.saveFeedback); },
    onError: (error, _variables, _context, mutation) => { if (mutation.meta?.saveFeedback) showFormFeedback(tagalogError(error), false); },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

document.documentElement.dataset.appVersion = import.meta.env.VITE_APP_VERSION || 'development';
const removeValidationListeners = installTagalogValidation(document);
if (import.meta.hot) import.meta.hot.dispose(removeValidationListeners);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AccessibilityProvider>
          <SoftGlowCursor />
          <ReadingGuideOverlay />
          <AuthProvider>
            <App />
          </AuthProvider>
        </AccessibilityProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
