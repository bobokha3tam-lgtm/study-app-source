import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global secure fetch interceptor: Attach authentication token (counselor or student) to protected endpoints
try {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);
    const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

        // Only attach for internal API or v1 endpoints
        if (url && (url.startsWith('/api/') || url.startsWith('/v1/'))) {
          const counselorToken = sessionStorage.getItem('study_advisor_counselor_token') || localStorage.getItem('study_advisor_counselor_token');
          const studentToken = sessionStorage.getItem('study_advisor_student_token') || localStorage.getItem('study_advisor_student_token');
          const activeToken = counselorToken || studentToken;

          if (activeToken) {
            const headers = new Headers(init?.headers || {});
            if (!headers.has('Authorization')) {
              headers.set('Authorization', `Bearer ${activeToken}`);
            }
            if (!headers.has('x-student-token')) {
              headers.set('x-student-token', activeToken);
            }
            init = { ...init, headers };
          }
        }
      } catch (err) {
        // Ignore header attachment errors
      }

      return originalFetch(input, init);
    };

    // Safely attempt to patch window.fetch without throwing if window.fetch is a read-only getter
    try {
      const descriptor =
        Object.getOwnPropertyDescriptor(window, 'fetch') ||
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
      if (descriptor && !descriptor.writable && !descriptor.set && descriptor.configurable) {
        Object.defineProperty(window, 'fetch', {
          value: patchedFetch,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } else {
        window.fetch = patchedFetch;
      }
    } catch {
      // If the browser or sandbox strictly forbids reassigning window.fetch, ignore gracefully
    }
  }
} catch {
  // Global interceptor setup fallback
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
