//! Resonix Studio Application Coordinator
//! Connects UI controls, Visualizer, Equalizer, Smart Music Manager, Live Trending Service, Public Vault, BWE Engine, and i18n

import { i18n } from './i18n/i18n.js';
import { locales } from './i18n/locales.js';
import { audioCore } from './audio-core.js';
import { VisualizerEngine } from './visualizer.js';
import { EqualizerManager } from './equalizer.js';
import { smartMusicManager } from './smart-manager.js';
import { publicVault } from './public-vault.js';
import { liveTrending } from './trending-service.js';
import { hwManager, BLUETOOTH_CODECS } from './bluetooth-manager.js';

class ResonixApp {
  constructor() {
    this.currentTrackIndex = 0;
    this.activeSourceTab = 'trending'; // Default to 'trending' so user sees online trending songs immediately!
    this.activeLanguageFilter = 'all'; // 'all', 'te', 'hi', 'ta', 'en', 'ja', 'es'
    this.activeDisplayList = [];
    this.visualizer = null;
    this.equalizer = null;
    this.searchDebounceTimer = null;
    this.currentSearchQuery = '';
  }

  async init() {
    // 1. Initialize i18n
    i18n.updateDOM();
    this.updateLanguageButton();

    if (!localStorage.getItem('resonix_lang_chosen')) {
      this.openLangModal();
    }

    // 2. Initialize Visualizer
    const canvas = document.getElementById('visualizer-canvas');
    if (canvas) {
      this.visualizer = new VisualizerEngine(canvas);
      this.visualizer.start();
    }

    // 3. Initialize Equalizer
    const eqSlidersContainer = document.getElementById('eq-sliders-container');
    const eqCurveSvg = document.getElementById('eq-curve-svg');
    if (eqSlidersContainer && eqCurveSvg) {
      this.equalizer = new EqualizerManager(eqSlidersContainer, eqCurveSvg);
    }

    // 4. Setup Listeners
    this.setupEventListeners();
    this.setupAudioListeners();

    // 5. Load Initial Online Trending Songs
    const langChips = document.getElementById('vault-lang-chips');
    if (langChips) langChips.style.display = 'flex';

    await this.loadTrendingCategory(this.activeLanguageFilter);
    if (this.activeDisplayList.length > 0) {
      this.updateCurrentTrackUI(this.activeDisplayList[0]);
      smartMusicManager.setSeedTrack(this.activeDisplayList[0]);
      this.updateRecommendationsAndRadar();
    }
    hwManager.updateDynamicBadge();
  }

  setupEventListeners() {
    // Source Navigation Tabs: Local Masters vs Trending Hits vs Public Vault
    const tabLocal = document.getElementById('tab-local-masters');
    const tabTrending = document.getElementById('tab-trending-hits');
    const tabVault = document.getElementById('tab-public-vault');
    const langChips = document.getElementById('vault-lang-chips');
    const quickTags = document.getElementById('quick-search-tags');
    const loadMoreWrap = document.getElementById('btn-load-more-wrap');

    const updateTabActive = (activeTab) => {
      [tabLocal, tabTrending, tabVault].forEach(t => t && t.classList.remove('active'));
      activeTab.classList.add('active');
    };

    if (tabTrending) {
      tabTrending.addEventListener('click', async () => {
        this.activeSourceTab = 'trending';
        updateTabActive(tabTrending);
        if (langChips) langChips.style.display = 'flex';
        if (quickTags) quickTags.style.display = 'flex';
        await this.loadTrendingCategory(this.activeLanguageFilter);
      });
    }

    if (tabVault) {
      tabVault.addEventListener('click', () => {
        this.activeSourceTab = 'vault';
        updateTabActive(tabVault);
        if (langChips) langChips.style.display = 'flex';
        if (quickTags) quickTags.style.display = 'none';
        if (loadMoreWrap) loadMoreWrap.style.display = 'none';
        this.renderTrackList();
      });
    }

    if (tabLocal) {
      tabLocal.addEventListener('click', () => {
        this.activeSourceTab = 'local';
        updateTabActive(tabLocal);
        if (langChips) langChips.style.display = 'none';
        if (quickTags) quickTags.style.display = 'none';
        if (loadMoreWrap) loadMoreWrap.style.display = 'none';
        this.renderTrackList();
      });
    }

    // Multilingual Language Chips Filter
    document.querySelectorAll('[data-vault-lang]').forEach(chip => {
      chip.addEventListener('click', async (e) => {
        document.querySelectorAll('[data-vault-lang]').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        this.activeLanguageFilter = e.target.getAttribute('data-vault-lang');
        const input = document.getElementById('library-search-input');
        if (input) input.value = '';
        this.currentSearchQuery = '';

        if (this.activeSourceTab === 'trending') {
          await this.loadTrendingCategory(this.activeLanguageFilter);
        } else {
          this.renderTrackList();
        }
      });
    });

    // Quick Search Suggestion Tags
    document.querySelectorAll('.quick-tag').forEach(tag => {
      tag.addEventListener('click', async (e) => {
        const query = e.target.getAttribute('data-quick-q');
        const input = document.getElementById('library-search-input');
        if (input) input.value = query;

        this.activeSourceTab = 'trending';
        updateTabActive(tabTrending);
        if (langChips) langChips.style.display = 'flex';
        if (quickTags) quickTags.style.display = 'flex';

        await this.performOnlineSearch(query);
      });
    });

    // Load More Songs Button
    const btnLoadMore = document.getElementById('btn-load-more');
    if (btnLoadMore) {
      btnLoadMore.addEventListener('click', () => this.loadMoreSongs());
    }

    // AI BWE Remaster Toggle Button
    const btnToggleBwe = document.getElementById('btn-toggle-bwe');
    if (btnToggleBwe) {
      btnToggleBwe.addEventListener('click', () => {
        audioCore.setBweRemaster(!audioCore.bweEnabled);
        if (audioCore.bweEnabled) {
          btnToggleBwe.classList.remove('bwe-off');
          btnToggleBwe.classList.add('bwe-active-btn');
        } else {
          btnToggleBwe.classList.add('bwe-off');
          btnToggleBwe.classList.remove('bwe-active-btn');
        }
        hwManager.updateDynamicBadge();
      });
    }

    // Play / Pause Toggle
    const btnPlayPause = document.getElementById('btn-play-pause');
    if (btnPlayPause) {
      btnPlayPause.addEventListener('click', () => {
        if (audioCore.state === 'playing') {
          audioCore.pause();
        } else {
          const list = this.getActiveTrackList();
          const track = list[this.currentTrackIndex] || list[0];
          if (track) audioCore.play(track);
        }
      });
    }

    // Next Track
    const btnNext = document.getElementById('btn-next-track');
    if (btnNext) {
      btnNext.addEventListener('click', () => this.nextTrack());
    }

    // Prev Track
    const btnPrev = document.getElementById('btn-prev-track');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => this.prevTrack());
    }

    // Timeline Scrubber
    const seekSlider = document.getElementById('player-seek-slider');
    if (seekSlider) {
      seekSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const targetSec = (val / 100) * audioCore.duration;
        audioCore.seek(targetSec);
      });
    }

    // Volume Slider
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        audioCore.setVolume(parseFloat(e.target.value));
      });
    }

    // Volume Mute Button
    const btnMute = document.getElementById('btn-volume-mute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        const isMuted = audioCore.toggleMute();
        btnMute.style.opacity = isMuted ? '0.4' : '1';
      });
    }

    // Visualizer Mode Switch
    document.querySelectorAll('[data-vis-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-vis-mode]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const mode = e.target.getAttribute('data-vis-mode');
        if (this.visualizer) {
          this.visualizer.setMode(mode);
        }
      });
    });

    // Equalizer Presets
    const eqPresetSelect = document.getElementById('eq-preset-select');
    if (eqPresetSelect) {
      eqPresetSelect.addEventListener('change', (e) => {
        if (this.equalizer) {
          this.equalizer.setPreset(e.target.value);
        }
      });
    }

    // Equalizer Bypass
    const btnEqBypass = document.getElementById('btn-eq-bypass');
    if (btnEqBypass) {
      btnEqBypass.addEventListener('click', () => {
        if (this.equalizer) {
          const isBypassed = this.equalizer.toggleBypass();
          btnEqBypass.textContent = isBypassed ? 'Active' : 'Bypass';
          btnEqBypass.style.borderColor = isBypassed ? '#ff3d00' : 'var(--border-subtle)';
        }
      });
    }

    // Live Online & Local Search Filter with Debounce
    const searchInput = document.getElementById('library-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value;
        if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);

        if (this.activeSourceTab === 'trending') {
          if (q.trim().length >= 2) {
            const badge = document.getElementById('library-count-badge');
            if (badge) badge.textContent = 'Searching Online...';

            this.searchDebounceTimer = setTimeout(async () => {
              await this.performOnlineSearch(q);
            }, 350);
          } else if (q.trim().length === 0) {
            this.searchDebounceTimer = setTimeout(async () => {
              await this.loadTrendingCategory(this.activeLanguageFilter);
            }, 200);
          }
        } else {
          this.searchDebounceTimer = setTimeout(() => {
            this.renderTrackList(q);
          }, 150);
        }
      });
    }

    // Audio Import File Button
    const btnImport = document.getElementById('btn-import-audio');
    const fileInput = document.getElementById('file-input-audio');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          btnImport.textContent = 'Importing...';
          const newTrack = await smartMusicManager.importUserAudioFile(file);
          this.activeSourceTab = 'local';
          updateTabActive(tabLocal);
          this.renderTrackList();
          this.playTrack(newTrack);
          btnImport.textContent = 'Import Audio';
        }
      });
    }

    // Hardware Output Select
    const hwSelect = document.getElementById('hardware-output-select');
    const btRow = document.getElementById('bt-codec-row');
    if (hwSelect) {
      hwSelect.addEventListener('change', (e) => {
        hwManager.setOutput(e.target.value);
        if (btRow) {
          btRow.style.display = e.target.value === 'bluetooth_passthrough' ? 'block' : 'none';
        }
      });
    }

    // Bluetooth Codec Select
    const btSelect = document.getElementById('bluetooth-codec-select');
    if (btSelect) {
      btSelect.addEventListener('change', (e) => {
        hwManager.setCodec(e.target.value);
      });
    }

    // Language Modal
    const btnOpenLang = document.getElementById('btn-open-lang');
    if (btnOpenLang) {
      btnOpenLang.addEventListener('click', () => this.openLangModal());
    }

    const btnCloseLang = document.getElementById('btn-close-lang-modal');
    if (btnCloseLang) {
      btnCloseLang.addEventListener('click', () => {
        localStorage.setItem('resonix_lang_chosen', 'true');
        document.getElementById('lang-modal').classList.remove('open');
      });
    }
  }

  setupAudioListeners() {
    audioCore.on('stateChange', (state) => {
      const icon = document.getElementById('play-pause-icon');
      if (icon) {
        if (state === 'playing') {
          icon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
        } else {
          icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
        }
      }
      this.updateTrackActiveVisuals();
    });

    audioCore.on('timeUpdate', (data) => {
      const curStamp = document.getElementById('player-time-current');
      const totStamp = document.getElementById('player-time-total');
      const slider = document.getElementById('player-seek-slider');

      if (curStamp) curStamp.textContent = this.formatTime(data.current);
      if (totStamp) totStamp.textContent = this.formatTime(data.total);
      if (slider) slider.value = data.progress * 100;
    });

    audioCore.on('metrics', (metrics) => {
      const bufEl = document.getElementById('metric-ringbuf');
      const ufEl = document.getElementById('metric-underflows');
      if (bufEl) bufEl.textContent = `${metrics.bufferOccupancy}%`;
      if (ufEl) ufEl.textContent = metrics.underflows;
    });

    audioCore.on('bweChange', () => {
      hwManager.updateDynamicBadge();
    });

    // Continuous Queue / Autoplay Next Track
    audioCore.on('ended', () => {
      this.nextTrack();
    });
  }

  async loadTrendingCategory(lang) {
    const badge = document.getElementById('library-count-badge');
    const loadMoreWrap = document.getElementById('btn-load-more-wrap');
    if (badge) badge.textContent = 'Pulling Live Songs...';

    const list = await liveTrending.loadCategoryTracks(lang, 1);
    this.activeDisplayList = list;
    this.renderCustomList(list, `${list.length} Online Hits`);

    if (loadMoreWrap) loadMoreWrap.style.display = 'block';
  }

  async performOnlineSearch(query) {
    this.currentSearchQuery = query;
    const badge = document.getElementById('library-count-badge');
    const loadMoreWrap = document.getElementById('btn-load-more-wrap');
    if (badge) badge.textContent = 'Searching 10M+ Online...';

    const results = await liveTrending.searchOnline(query, 1);
    this.activeDisplayList = results;
    this.renderCustomList(results, `${results.length} Online Results`);

    if (loadMoreWrap) loadMoreWrap.style.display = results.length > 0 ? 'block' : 'none';
  }

  async loadMoreSongs() {
    const btnLoadMore = document.getElementById('btn-load-more');
    if (btnLoadMore) btnLoadMore.textContent = '⏳ Loading More Online...';

    const more = await liveTrending.loadMore();
    if (more && more.length > 0) {
      // Append non-duplicate tracks
      const existingIds = new Set(this.activeDisplayList.map(t => t.id));
      const fresh = more.filter(t => !existingIds.has(t.id));
      this.activeDisplayList = [...this.activeDisplayList, ...fresh];
      this.renderCustomList(this.activeDisplayList, `${this.activeDisplayList.length} Online Songs`);
    }

    if (btnLoadMore) btnLoadMore.textContent = '⬇️ Load More Songs (+25 Online)';
  }

  getActiveTrackList(filter = '') {
    if (this.activeSourceTab === 'trending') {
      if (this.activeDisplayList.length > 0) return this.activeDisplayList;
      return liveTrending.getPrecached(this.activeLanguageFilter);
    } else if (this.activeSourceTab === 'vault') {
      return publicVault.getTracks(filter, this.activeLanguageFilter);
    } else {
      const tracks = smartMusicManager.getTracks();
      const q = filter.trim().toLowerCase();
      return tracks.filter(t =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.format.toLowerCase().includes(q)
      );
    }
  }

  renderCustomList(list, badgeText) {
    const container = document.getElementById('track-list-container');
    if (!container) return;
    container.innerHTML = '';

    const countBadge = document.getElementById('library-count-badge');
    if (countBadge && badgeText) countBadge.textContent = badgeText;

    this.renderCards(list, container);
  }

  renderTrackList(filter = '') {
    const container = document.getElementById('track-list-container');
    if (!container) return;
    container.innerHTML = '';

    const list = this.getActiveTrackList(filter);

    const countBadge = document.getElementById('library-count-badge');
    if (countBadge) {
      const label = this.activeSourceTab === 'trending' ? 'Trending Hits' : this.activeSourceTab === 'vault' ? 'Public Masters' : 'Masters';
      countBadge.textContent = `${list.length} ${label}`;
    }

    this.renderCards(list, container);
  }

  renderCards(list, container) {
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          No tracks found. Try clicking a trending tag or searching above.
        </div>
      `;
      return;
    }

    list.forEach((track, idx) => {
      const card = document.createElement('div');
      const isCur = audioCore.currentTrack && audioCore.currentTrack.id === track.id;
      card.className = `track-item-card ${isCur ? 'active-playing' : ''}`;

      const isUpscaledTarget = track.sample_rate < 88200 || !track.is_native_hires;
      const qualityPill = isUpscaledTarget
        ? `<span class="track-pill-bwe" title="Auto-Remasters to 24-bit/96kHz via BWE Engine">AI 24/96 Remaster</span>`
        : `<span class="track-pill-hires">Native ${track.format}</span>`;

      const platformLabel = track.source_platform
        ? `<span style="font-size: 0.65rem; color: var(--text-tertiary); font-family: var(--font-mono); margin-left: 6px;">• ${track.source_platform}</span>`
        : '';

      const durationLabel = track.duration_seconds
        ? `<span style="font-size: 0.68rem; font-family: var(--font-mono); color: var(--text-secondary); margin-left: 6px;">${this.formatTime(track.duration_seconds)}</span>`
        : '';

      const thumbImg = track.image
        ? `<img src="${track.image}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" alt="Artwork" loading="lazy" />`
        : `<div class="track-thumb">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
           </div>`;

      card.innerHTML = `
        <div class="track-info-left" style="overflow: hidden;">
          ${thumbImg}
          <div class="track-meta-wrap" style="overflow: hidden;">
            <div class="track-meta-title" title="${track.title}">${track.title}</div>
            <div class="track-meta-artist" title="${track.artist}">${track.artist} ${platformLabel}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          ${qualityPill}
          ${durationLabel}
        </div>
      `;

      card.addEventListener('click', () => {
        this.currentTrackIndex = idx;
        this.playTrack(track);
      });

      container.appendChild(card);
    });
  }

  playTrack(track) {
    audioCore.play(track);
    this.updateCurrentTrackUI(track);
    smartMusicManager.setSeedTrack(track);
    this.updateRecommendationsAndRadar();
    hwManager.updateDynamicBadge();
    this.updateTrackActiveVisuals();
  }

  nextTrack() {
    const list = this.getActiveTrackList();
    if (list.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % list.length;
    this.playTrack(list[this.currentTrackIndex]);
  }

  prevTrack() {
    const list = this.getActiveTrackList();
    if (list.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + list.length) % list.length;
    this.playTrack(list[this.currentTrackIndex]);
  }

  updateCurrentTrackUI(track) {
    if (!track) return;
    const titleEl = document.getElementById('player-track-title');
    const artistEl = document.getElementById('player-track-artist');
    const totStamp = document.getElementById('player-time-total');

    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    if (totStamp) totStamp.textContent = this.formatTime(track.duration_seconds);
  }

  updateTrackActiveVisuals() {
    const container = document.getElementById('track-list-container');
    if (!container) return;
    const cards = container.querySelectorAll('.track-item-card');
    const list = this.getActiveTrackList();
    cards.forEach((c, idx) => {
      const isCur = audioCore.currentTrack && list[idx] && list[idx].id === audioCore.currentTrack.id;
      if (isCur) {
        c.classList.add('active-playing');
      } else {
        c.classList.remove('active-playing');
      }
    });
  }

  updateRecommendationsAndRadar() {
    const seed = smartMusicManager.currentSeedTrack;
    const radarSvg = document.getElementById('radar-chart-svg');
    if (radarSvg && seed) {
      smartMusicManager.renderRadarSvg(seed, radarSvg);
    }

    const recs = smartMusicManager.getRecommendations(seed, 4);
    const container = document.getElementById('recommendations-container');
    if (!container) return;
    container.innerHTML = '';

    recs.forEach(rec => {
      const item = document.createElement('div');
      item.className = 'rec-item-card';
      item.innerHTML = `
        <div style="overflow: hidden; max-width: 220px;">
          <div style="font-size: 0.82rem; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${rec.track.title}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">
            ${rec.reason}
          </div>
        </div>
        <span class="rec-score-pill">${rec.scorePercent}%</span>
      `;

      item.addEventListener('click', () => {
        this.playTrack(rec.track);
      });

      container.appendChild(item);
    });
  }

  formatTime(secs) {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  openLangModal() {
    const modal = document.getElementById('lang-modal');
    const container = document.getElementById('lang-options-container');
    if (!modal || !container) return;

    container.innerHTML = '';
    Object.keys(locales).forEach(key => {
      const loc = locales[key];
      const btn = document.createElement('button');
      btn.className = `lang-card-btn ${i18n.currentKey === key ? 'selected' : ''}`;
      btn.innerHTML = `<span>${loc.flag}</span> <span>${loc.name}</span>`;

      btn.addEventListener('click', () => {
        i18n.setLocale(key);
        this.updateLanguageButton();
        this.renderTrackList();
        this.updateRecommendationsAndRadar();
        hwManager.updateDynamicBadge();
        
        container.querySelectorAll('.lang-card-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });

      container.appendChild(btn);
    });

    modal.classList.add('open');
  }

  updateLanguageButton() {
    const flagEl = document.getElementById('lang-flag');
    const nameEl = document.getElementById('lang-name');
    const cur = locales[i18n.currentKey] || locales.en;
    if (flagEl) flagEl.textContent = cur.flag;
    if (nameEl) nameEl.textContent = cur.name;
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new ResonixApp();
  app.init();
});
