import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug: Add console logs to track loading
console.log('🚀 Main.tsx loading...');
console.log('Root element:', document.getElementById("root"));

// Register Service Worker for PWA functionality (only in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, show update notification
                if (confirm('New version available! Reload to update?')) {
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
} else if (import.meta.env.DEV) {
  console.log('🚫 Service Worker disabled in development mode to prevent caching');
  
  // Unregister any existing service workers in development
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          console.log('🗑️ Unregistered existing service worker');
        });
      });
    });
  }
}

try {
  console.log('🎯 Attempting to render App...');
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log('✅ App rendered successfully!');
} catch (error) {
  console.error('❌ Error rendering app:', error);
  
  // Fallback: Show error message
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; background: #f0f0f0; min-height: 100vh; font-family: Arial, sans-serif;">
        <h1 style="color: #d32f2f;">❌ App Loading Error</h1>
        <p><strong>Error:</strong> ${error}</p>
        <p>Please check the browser console for more details.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}
