import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler to suppress Google Translate DOM manipulation errors
window.addEventListener('error', (event) => {
  const error = event.error;
  if (error && error.name === 'NotFoundError' && 
      (error.message.includes('removeChild') || 
       error.message.includes('insertBefore') ||
       error.message.includes('replaceChild'))) {
    event.preventDefault();
    event.stopPropagation();
    console.warn('Google Translate DOM error suppressed:', error.message);
    return false;
  }
}, true);

// Suppress unhandled promise rejections from Google Translate
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason && reason.name === 'NotFoundError' &&
      (reason.message.includes('removeChild') || 
       reason.message.includes('insertBefore') ||
       reason.message.includes('replaceChild'))) {
    event.preventDefault();
    console.warn('Google Translate promise rejection suppressed:', reason.message);
    return false;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
