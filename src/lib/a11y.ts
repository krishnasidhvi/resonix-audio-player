// Keyboard focus handling for menus, popovers and dialogs (a Svelte action).
//   menu:  focus the first item, ArrowUp/Down/Home/End move between [role^=menuitem]
//   modal: Tab and Shift+Tab stay inside
//   Escape calls onClose; when the element goes away, focus returns to what opened it.
export interface FocusScopeOptions {
  onClose?: () => void;
  modal?: boolean;
  menu?: boolean;
  /** CSS selector of the element to focus first (defaults to the first focusable one). */
  initial?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function focusScope(node: HTMLElement, options: FocusScopeOptions = {}) {
  let opts = options;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const focusables = () => [...node.querySelectorAll<HTMLElement>(opts.menu ? '[role^="menuitem"]' : FOCUSABLE)]
    .filter((el) => el.getClientRects().length > 0);

  queueMicrotask(() => {
    const first = (opts.initial && node.querySelector<HTMLElement>(opts.initial)) || focusables()[0];
    (first ?? node).focus({ preventScroll: true });
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && opts.onClose) {
      e.preventDefault();
      e.stopPropagation();
      opts.onClose();
      return;
    }
    const items = focusables();
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (opts.menu && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
        : e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[n].focus();
    } else if (opts.modal && e.key === 'Tab') {
      const all = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (!all.length) return;
      const first = all[0], last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  node.addEventListener('keydown', onKey);
  return {
    update(o: FocusScopeOptions) { opts = o; },
    destroy() {
      node.removeEventListener('keydown', onKey);
      // give focus back to the trigger, unless the user already moved somewhere else
      const active = document.activeElement;
      if (opener && opener.isConnected && (!active || active === document.body || node.contains(active))) {
        opener.focus({ preventScroll: true });
      }
    },
  };
}

/** Only http(s) links may be rendered as hrefs (blocks javascript: and data: URLs from third-party data). */
export function safeUrl(u: unknown): string | undefined {
  if (typeof u !== 'string') return undefined;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch { return undefined; }
}
