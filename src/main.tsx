import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function mount() {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    createRoot(rootEl).render(<App />);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, {once: true});
} else {
  mount();
}
