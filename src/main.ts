import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { i18n } from './lib/i18n/i18n.svelte';

// Load the saved/browser language first so the first paint is already translated.
await i18n.init();
mount(App, { target: document.getElementById('app')! });

// Offline app shell (production only; the dev server serves fresh files).
if ('serviceWorker' in navigator && import.meta.env.PROD && !('__TAURI_INTERNALS__' in window)) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
