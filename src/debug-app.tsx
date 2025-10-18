import React from 'react';
import { createRoot } from 'react-dom/client';

// Simple debug component to test if React is working
const DebugApp = () => {
  console.log('DebugApp rendering...');
  
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333' }}>🔧 Debug Mode - App is Loading</h1>
      <p>If you can see this, React is working correctly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <p>Environment: {import.meta.env.MODE}</p>
      <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</p>
      <p>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e0e0e0' }}>
        <h3>Next Steps:</h3>
        <ol>
          <li>If you see this page, the basic React setup is working</li>
          <li>Check the browser console for any JavaScript errors</li>
          <li>Look for any red error messages in the console</li>
          <li>Try refreshing the page</li>
        </ol>
      </div>
    </div>
  );
};

// Render the debug app
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<DebugApp />);
} else {
  console.error('Root element not found!');
}



