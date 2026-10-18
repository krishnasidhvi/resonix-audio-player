//! Resonix 10-Band Parametric Equalizer Module
//! Interactive SVG frequency response curve with audiophile presets & real-time biquad synchronization

import { audioCore } from './audio-core.js';

export const EQ_FREQUENCIES = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  warm: [1.5, 2.5, 2.0, 1.0, 0.0, -0.5, -0.5, 0.5, 1.0, 1.5],
  air: [0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.5, 2.5, 3.5, 4.0],
  jazz: [1.0, 2.0, 1.5, 0.5, 0.0, 1.5, 2.0, 2.5, 2.0, 1.0],
  vocal: [-1.0, -0.5, 0.0, 0.5, 2.0, 3.0, 2.5, 1.5, 0.5, 0.0],
  bass: [4.5, 3.5, 2.0, -0.5, -1.0, 0.0, 0.0, 0.5, 1.0, 1.0]
};

export class EqualizerManager {
  constructor(containerEl, curveSvgEl) {
    this.container = containerEl;
    this.curveSvg = curveSvgEl;
    this.gains = [...EQ_PRESETS.flat];
    this.isBypassed = false;

    this.render();
  }

  setPreset(name) {
    if (EQ_PRESETS[name]) {
      this.gains = [...EQ_PRESETS[name]];
      this.syncGains();
      this.updateSliders();
      this.drawCurve();
    }
  }

  resetFlat() {
    this.setPreset('flat');
  }

  toggleBypass() {
    this.isBypassed = !this.isBypassed;
    if (this.isBypassed) {
      audioCore.setEqualizerGains([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    } else {
      audioCore.setEqualizerGains(this.gains);
    }
    this.drawCurve();
    return this.isBypassed;
  }

  setBandGain(index, gain) {
    this.gains[index] = Math.max(-12, Math.min(12, gain));
    if (!this.isBypassed) {
      audioCore.setEqualizerGains(this.gains);
    }
    this.drawCurve();
  }

  syncGains() {
    if (!this.isBypassed) {
      audioCore.setEqualizerGains(this.gains);
    }
  }

  formatFreq(hz) {
    return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    EQ_FREQUENCIES.forEach((freq, idx) => {
      const col = document.createElement('div');
      col.className = 'eq-band-slider';

      col.innerHTML = `
        <span class="eq-val-badge" id="eq-val-${idx}">${this.gains[idx] > 0 ? '+' : ''}${this.gains[idx].toFixed(1)} dB</span>
        <div class="slider-track-wrap">
          <input type="range" min="-12" max="12" step="0.5" value="${this.gains[idx]}" id="eq-slider-${idx}" class="eq-vertical-range" orient="vertical">
        </div>
        <span class="eq-freq-label">${this.formatFreq(freq)}Hz</span>
      `;

      const input = col.querySelector('input');
      const valBadge = col.querySelector(`#eq-val-${idx}`);

      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.setBandGain(idx, val);
        valBadge.textContent = `${val > 0 ? '+' : ''}${val.toFixed(1)} dB`;
      });

      this.container.appendChild(col);
    });

    this.drawCurve();
  }

  updateSliders() {
    EQ_FREQUENCIES.forEach((_, idx) => {
      const slider = document.getElementById(`eq-slider-${idx}`);
      const valBadge = document.getElementById(`eq-val-${idx}`);
      if (slider && valBadge) {
        slider.value = this.gains[idx];
        valBadge.textContent = `${this.gains[idx] > 0 ? '+' : ''}${this.gains[idx].toFixed(1)} dB`;
      }
    });
  }

  drawCurve() {
    if (!this.curveSvg) return;
    const width = 640;
    const height = 140;
    const centerY = height / 2;

    const points = this.gains.map((g, idx) => {
      const x = (idx / (this.gains.length - 1)) * (width - 40) + 20;
      // -12dB -> height - 15, +12dB -> 15
      const gainVal = this.isBypassed ? 0 : g;
      const y = centerY - (gainVal / 12) * (centerY - 18);
      return { x, y };
    });

    // Spline path string
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i != points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const fillPath = `${d} L ${points[points.length - 1].x} ${centerY} L ${points[0].x} ${centerY} Z`;

    this.curveSvg.innerHTML = `
      <defs>
        <linearGradient id="eqCurveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <!-- Center 0dB Reference Line -->
      <line x1="0" y1="${centerY}" x2="${width}" y2="${centerY}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="4,4"/>
      <!-- Filled Area -->
      <path d="${fillPath}" fill="url(#eqCurveGrad)"/>
      <!-- Stroke Curve -->
      <path d="${d}" fill="none" stroke="${this.isBypassed ? '#888' : '#00e5ff'}" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Control Points -->
      ${points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="${this.isBypassed ? '#666' : '#ffb300'}" stroke="#000" stroke-width="1.5"/>
      `).join('')}
    `;
  }
}
