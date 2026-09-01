import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Global Unhandled Rejection & Runtime Error Handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Global Unhandled Promise Rejection caught]:', event.reason);
    // Prevent default browser behavior for non-fatal background promise rejections
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.warn('[Global Unhandled Runtime Error caught]:', event.error || event.message);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary sectionName="Dormiqa Platform">
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);

