// Hash router, toasts and overlay state.
export type Route =
  | { name: 'home' }
  | { name: 'search'; q: string }
  | { name: 'library'; tab?: string }
  | { name: 'playlist'; id: string }
  | { name: 'album'; id: string }
  | { name: 'radio' }
  | { name: 'raga' }
  | { name: 'journey' }
  | { name: 'stats' }
  | { name: 'settings' };

function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const [name, ...rest] = path.split('/');
  const params = new URLSearchParams(query);
  switch (name) {
    case 'search': return { name: 'search', q: params.get('q') ?? '' };
    case 'library': return { name: 'library', tab: rest[0] };
    case 'playlist': return { name: 'playlist', id: decodeURIComponent(rest.join('/')) };
    case 'album': return { name: 'album', id: decodeURIComponent(rest.join('/')) };
    case 'radio': case 'raga': case 'journey': case 'stats': case 'settings': return { name };
    default: return { name: 'home' };
  }
}

export interface Toast { id: number; text: string; kind: 'info' | 'error' }

class UI {
  route: Route = $state(parse(location.hash));
  toasts: Toast[] = $state([]);
  palette = $state(false);
  panel: 'now' | 'lyrics' | 'queue' | 'signal' = $state('now');
  panelOpen = $state(innerWidth > 1280);
  ambient = $state(false);
  eqOpen = $state(false);
  practiceOpen = $state(false);
  hearingOpen = $state(false);
  private n = 0;

  constructor() {
    addEventListener('hashchange', () => { this.route = parse(location.hash); document.getElementById('main')?.scrollTo(0, 0); });
  }

  go(hash: string) { location.hash = hash; }

  toast(text: string, kind: Toast['kind'] = 'info') {
    const id = ++this.n;
    this.toasts = [...this.toasts, { id, text, kind }];
    setTimeout(() => { this.toasts = this.toasts.filter((t) => t.id !== id); }, kind === 'error' ? 6000 : 3500);
  }
}

export const ui = new UI();
