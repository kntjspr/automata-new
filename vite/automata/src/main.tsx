
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App' // Removed .tsx extension

console.log('Main.tsx is starting execution...');
window.onerror = (msg, url, lineNo, columnNo, error) => {
  console.error('Window Error:', msg, error);
  document.body.innerHTML += `<div style="background:white; color:red; padding:20px; border:2px solid red;">
        <h3>Global Error Detected</h3>
        <p>${msg}</p>
        <p>Line: ${lineNo}, Column: ${columnNo}</p>
        <p>${url}</p>
    </div>`;
  return false;
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element missing!');
  document.body.innerHTML = '<h1>FATAL: Root element missing</h1>';
} else {
  try {
    console.log('Attempting to create root...');
    const root = createRoot(rootElement);
    console.log('Root created, rendering App...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('Render called.');
  } catch (e: any) {
    console.error('React Mount Error:', e);
    rootElement.innerHTML = `<h1>Mount Error</h1><pre>${e.message}\n${e.stack}</pre>`;
  }
}
