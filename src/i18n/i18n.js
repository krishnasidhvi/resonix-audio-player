import { locales } from './locales.js';

class I18nManager {
  constructor() {
    this.currentLocaleKey = localStorage.getItem('resonix_lang') || 'en';
    this.listeners = [];
  }

  get t() {
    return locales[this.currentLocaleKey] || locales.en;
  }

  get currentKey() {
    return this.currentLocaleKey;
  }

  setLocale(key) {
    if (locales[key]) {
      this.currentLocaleKey = key;
      localStorage.setItem('resonix_lang', key);
      
      // Update document direction and lang
      const locale = locales[key];
      document.documentElement.dir = locale.dir;
      document.documentElement.lang = key;
      if (locale.dir === 'rtl') {
        document.body.classList.add('rtl-layout');
      } else {
        document.body.classList.remove('rtl-layout');
      }

      this.updateDOM();
      this.listeners.forEach(fn => fn(locale));
    }
  }

  onLanguageChange(callback) {
    this.listeners.push(callback);
  }

  updateDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    const t = this.t;

    elements.forEach(el => {
      const keyPath = el.getAttribute('data-i18n');
      const text = this.resolvePath(t, keyPath);
      if (text !== undefined) {
        if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
          el.placeholder = text;
        } else {
          el.textContent = text;
        }
      }
    });

    // Update title
    document.title = `${t.header.appName} • ${t.header.tagline}`;
  }

  resolvePath(obj, path) {
    return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
  }
}

export const i18n = new I18nManager();
