// Playback backend for YouTube videos, using YouTube's official IFrame Player API only.
// The player lives in a visible dock (components/YouTubeDock.svelte) at 200×200 px or larger,
// with YouTube's own controls, branding and ads intact, as the YouTube API policies require.
// Audio is never separated from the video, and nothing is downloaded.

/* Minimal typings for the IFrame API we use. */
interface YTPlayer {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  cuePlaylist(o: { list: string; listType?: string }): void;
  getPlaylist(): string[] | null;
  playVideo(): void; pauseVideo(): void; stopVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number; getDuration(): number; getPlayerState(): number;
  setVolume(v: number): void; setPlaybackRate(r: number): void; getAvailablePlaybackRates(): number[];
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
}
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  apiPromise ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiPromise = null; reject(new Error('Could not load the YouTube player')); };
    document.head.appendChild(s);
  });
  return apiPromise;
}

/** YouTube error codes → readable messages. */
const ERRORS: Record<number, string> = {
  2: 'That YouTube link is not valid.',
  5: 'This video cannot be played in the browser.',
  100: 'This video was removed or is private.',
  101: 'The owner does not allow this video to play outside YouTube.',
  150: 'The owner does not allow this video to play outside YouTube.',
};

type Listener = () => void;

class YouTubeBackend {
  private player: YTPlayer | null = null;
  private host: HTMLElement | null = null;
  private ready: Promise<YTPlayer> | null = null;
  private listeners = new Set<Listener>();
  private poll = 0;
  private volume = 0.8;
  private loop: { a: number; b: number } | null = null;
  private state = -1;
  private pendingPlay: { resolve: () => void; reject: (e: Error) => void } | null = null;
  /** true while a YouTube video is the active track (the dock shows only then). */
  active = false;
  onEnded: Listener = () => {};
  onError: (msg: string) => void = () => {};

  /** The dock registers its container element once it is mounted. */
  attach(el: HTMLElement) { this.host = el; }
  on(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { for (const l of this.listeners) l(); }

  private ensure(): Promise<YTPlayer> {
    if (!this.host) return Promise.reject(new Error('YouTube player is not ready'));
    this.ready ??= loadApi().then((YT) => new Promise<YTPlayer>((resolve) => {
      const mount = document.createElement('div');
      this.host!.appendChild(mount);
      const p = new YT.Player(mount, {
        width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0, origin: location.origin, enablejsapi: 1 },
        events: {
          onReady: () => { this.player = p; p.setVolume(Math.round(this.volume ** 2 * 100)); resolve(p); },
          onStateChange: (e: { data: number }) => this.handleState(e.data),
          onError: (e: { data: number }) => {
            const msg = ERRORS[e.data] ?? 'YouTube could not play this video.';
            if (this.pendingPlay) { this.pendingPlay.reject(new Error(msg)); this.pendingPlay = null; } else this.onError(msg);
          },
        },
      });
    }));
    return this.ready;
  }

  private handleState(s: number) {
    this.state = s;
    if (s === 1 && this.pendingPlay) { this.pendingPlay.resolve(); this.pendingPlay = null; }
    clearInterval(this.poll);
    if (s === 1) {
      this.poll = window.setInterval(() => {
        if (this.loop && this.player && this.player.getCurrentTime() >= this.loop.b) this.player.seekTo(this.loop.a, true);
        this.emit();
      }, 250);
    }
    this.emit();
    if (s === 0) this.onEnded();
  }

  async play(videoId: string, startAt = 0): Promise<void> {
    this.active = true;
    this.emit();
    const p = await this.ensure();
    await new Promise<void>((resolve, reject) => {
      this.pendingPlay = { resolve, reject };
      p.loadVideoById({ videoId, startSeconds: startAt });
      // autoplay may be blocked; treat a cued/paused video as loaded after a while
      setTimeout(() => { if (this.pendingPlay) { this.pendingPlay.resolve(); this.pendingPlay = null; } }, 8000);
    });
  }

  /** Read the video ids of a playlist without playing anything. */
  async playlistIds(listId: string): Promise<string[]> {
    const YT = await loadApi();
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:200px';
    document.body.appendChild(box);
    const mount = document.createElement('div');
    box.appendChild(mount);
    try {
      return await new Promise<string[]>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('YouTube did not return that playlist')), 15000);
        const p = new YT.Player(mount, {
          width: 320, height: 200,
          playerVars: { listType: 'playlist', list: listId, autoplay: 0, origin: location.origin },
          events: {
            onReady: () => {
              const tryRead = (n: number) => {
                const ids = p.getPlaylist();
                if (ids?.length) { clearTimeout(timer); resolve(ids); p.destroy(); }
                else if (n > 0) setTimeout(() => tryRead(n - 1), 500);
                else { clearTimeout(timer); reject(new Error('That playlist is private or empty')); p.destroy(); }
              };
              tryRead(16);
            },
            onError: () => { clearTimeout(timer); reject(new Error('That playlist is private or unavailable')); },
          },
        });
      });
    } finally { box.remove(); }
  }

  stop() {
    this.active = false;
    clearInterval(this.poll);
    this.player?.stopVideo();
    this.state = -1;
    this.emit();
  }
  toggle() { if (this.paused) this.resume(); else this.pause(); }
  pause() { this.player?.pauseVideo(); }
  async resume() { this.player?.playVideo(); }
  seek(t: number) { this.player?.seekTo(Math.max(0, t), true); setTimeout(() => this.emit(), 50); }

  get currentTime() { return this.player?.getCurrentTime() ?? 0; }
  get duration() { return this.player?.getDuration() ?? 0; }
  get paused() { return this.state !== 1 && this.state !== 3; }
  get buffering() { return this.state === 3; }

  setVolume(v: number) { this.volume = v; this.player?.setVolume(Math.round(v ** 2 * 100)); }
  setRate(r: number) {
    const rates = this.player?.getAvailablePlaybackRates() ?? [1];
    const best = rates.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 1);
    this.player?.setPlaybackRate(best);
  }
  setLoop(a: number | null, b: number | null) { this.loop = a !== null && b !== null && b > a ? { a, b } : null; }

  fadeOutAndPause(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      const start = this.volume, t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / (seconds * 1000));
        this.player?.setVolume(Math.round((start * (1 - k)) ** 2 * 100));
        if (k < 1) requestAnimationFrame(step);
        else { this.pause(); this.setVolume(start); resolve(); }
      };
      step();
    });
  }
}

export const youtube = new YouTubeBackend();
