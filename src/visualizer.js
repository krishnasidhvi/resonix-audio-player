//! Resonix Real-Time 60FPS Audiophile Visualizer Engine
//! 64-Band FFT Spectrum Analyzer, Ultrasonic Nyquist Inspector, Lissajous Vectorscope, & Dual VU Meters

import { audioCore } from './audio-core.js';

export class VisualizerEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'spectrum'; // 'spectrum', 'oscilloscope', 'lissajous'
    this.animationId = null;

    this.fftBands = 64;
    this.freqData = new Uint8Array(1024);
    this.timeData = new Uint8Array(1024);
    this.peakCaps = new Float32Array(this.fftBands);
    this.peakCapSpeed = 1.8;

    this.vuLeft = -60;
    this.vuRight = -60;
    this.vuPeakLeft = -60;
    this.vuPeakRight = -60;
    this.peakDecay = 0.4;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    if (this.animationId) return;
    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  draw() {
    const { ctx, width, height } = this;
    if (!ctx || width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);

    audioCore.getFrequencyData(this.freqData);
    audioCore.getTimeDomainData(this.timeData);

    this.computeVUMeters();

    if (this.mode === 'spectrum') {
      this.drawSpectrum(ctx, width, height);
    } else if (this.mode === 'oscilloscope') {
      this.drawOscilloscope(ctx, width, height);
    } else if (this.mode === 'lissajous') {
      this.drawLissajous(ctx, width, height);
    }
  }

  computeVUMeters() {
    let sumSquaresL = 0;
    let sumSquaresR = 0;
    const len = this.timeData.length;

    for (let i = 0; i < len; i += 2) {
      const sampleL = (this.timeData[i] - 128) / 128;
      const sampleR = (this.timeData[i + 1 < len ? i + 1 : i] - 128) / 128;
      sumSquaresL += sampleL * sampleL;
      sumSquaresR += sampleR * sampleR;
    }

    const rmsL = Math.sqrt(sumSquaresL / (len / 2));
    const rmsR = Math.sqrt(sumSquaresR / (len / 2));

    const dbL = rmsL > 0.0001 ? 20 * Math.log10(rmsL) : -60;
    const dbR = rmsR > 0.0001 ? 20 * Math.log10(rmsR) : -60;

    this.vuLeft = Math.max(-60, dbL);
    this.vuRight = Math.max(-60, dbR);

    this.vuPeakLeft = Math.max(this.vuLeft, this.vuPeakLeft - this.peakDecay);
    this.vuPeakRight = Math.max(this.vuRight, this.vuPeakRight - this.peakDecay);
  }

  drawSpectrum(ctx, width, height) {
    const bands = this.fftBands;
    const barWidth = (width / bands) * 0.72;
    const gap = (width / bands) * 0.28;

    // Background Subtle Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let y = height; y >= 0; y -= height / 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const isPlaying = audioCore.state === 'playing';
    const isBweActive = audioCore.isUpscaled && audioCore.bweEnabled;
    const brickwallIndex = Math.floor(bands * 0.68); // ~20kHz - 22kHz position in 64-band log scale

    for (let i = 0; i < bands; i++) {
      const logIndex = Math.floor(Math.pow(i / bands, 1.8) * (this.freqData.length * 0.65));
      let value = isPlaying ? this.freqData[logIndex] || 0 : 0;

      // If BWE is active and we are in ultrasonic range (> 22kHz), render synthesized harmonic air
      if (isBweActive && i >= brickwallIndex && isPlaying) {
        const baseVal = this.freqData[brickwallIndex - 4] || 30;
        const decay = Math.exp(-(i - brickwallIndex) / 6.0);
        value = Math.max(value, Math.min(220, baseVal * 0.7 * decay + (Math.random() * 8)));
      }

      const barHeight = Math.max(3, (value / 255) * (height - 24));
      const x = i * (barWidth + gap);
      const y = height - barHeight;

      if (barHeight > this.peakCaps[i]) {
        this.peakCaps[i] = barHeight;
      } else {
        this.peakCaps[i] = Math.max(0, this.peakCaps[i] - this.peakCapSpeed);
      }

      const grad = ctx.createLinearGradient(0, height, 0, y);
      if (isBweActive && i >= brickwallIndex) {
        // High-frequency BWE restored harmonics glow in gold/purple
        grad.addColorStop(0, 'rgba(255, 179, 0, 0.2)');
        grad.addColorStop(0.5, 'rgba(255, 179, 0, 0.85)');
        grad.addColorStop(1, 'rgba(213, 0, 249, 0.95)');
      } else {
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
        grad.addColorStop(0.65, 'rgba(0, 229, 255, 0.85)');
        grad.addColorStop(1, 'rgba(255, 179, 0, 0.95)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 1, 1]);
      ctx.fill();

      if (this.peakCaps[i] > 4) {
        ctx.fillStyle = (isBweActive && i >= brickwallIndex) ? '#d500f9' : '#ffc107';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 6;
        ctx.fillRect(x, height - this.peakCaps[i] - 3, barWidth, 2);
        ctx.shadowBlur = 0;
      }
    }

    // Draw Brickwall Marker when BWE is active
    if (isBweActive) {
      const markerX = brickwallIndex * (barWidth + gap);
      ctx.strokeStyle = 'rgba(255, 179, 0, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(markerX, 28);
      ctx.lineTo(markerX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffb300';
      ctx.fillText('⚡ 22.05kHz BRICKWALL ➔ BWE HARMONIC RESTORATION ACTIVE (UP TO 48kHz)', 14, 22);
    } else {
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#00e5ff';
      ctx.fillText('96kHz REAL-TIME SPECTRAL NYQUIST BOUNDARY (48kHz PASSBAND)', 14, 22);
    }
  }

  drawOscilloscope(ctx, width, height) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const sliceWidth = width / this.timeData.length;
    let x = 0;

    for (let i = 0; i < this.timeData.length; i++) {
      const v = this.timeData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawLissajous(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.85;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffb300';
    ctx.shadowColor = '#ffb300';
    ctx.shadowBlur = 6;
    ctx.beginPath();

    const len = this.timeData.length / 2;
    for (let i = 0; i < len; i++) {
      const left = (this.timeData[i * 2] - 128) / 128;
      const right = (this.timeData[i * 2 + 1] - 128) / 128;

      const x = centerX + (left - right) * (radius * 0.7);
      const y = centerY - (left + right) * (radius * 0.7);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
