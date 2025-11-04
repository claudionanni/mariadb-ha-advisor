import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('main.tsx: Script loaded');
const rootElement = document.getElementById('root');
console.log('main.tsx: root element:', rootElement);

if (rootElement) {
  console.log('main.tsx: Creating React root...');
  const root = createRoot(rootElement);
  console.log('main.tsx: Rendering App...');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('main.tsx: App rendered!');
} else {
  console.error('main.tsx: Root element not found!');
}
