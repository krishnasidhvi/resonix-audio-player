//! Resonix Hardware DAC & Bluetooth Passthrough Manager
//! Dynamic Wireless Badges, Codec Switching, and Direct Bit-Perfect Mode Controller

import { audioCore } from './audio-core.js';

export const BLUETOOTH_CODECS = {
  ldac990: {
    id: 'ldac990',
    name: 'LDAC 990 kbps',
    label: 'LDAC',
    bitrate: 990,
    sampleRate: 96000,
    bitDepth: 24,
    isHiRes: true,
    latency: 120,
    description: 'Pure Hi-Res Audio Wireless 3x standard Bluetooth bandwidth'
  },
  ldac660: {
    id: 'ldac660',
    name: 'LDAC 660 kbps',
    label: 'LDAC',
    bitrate: 660,
    sampleRate: 96000,
    bitDepth: 24,
    isHiRes: true,
    latency: 110,
    description: 'High-Fidelity balance with enhanced wireless range stability'
  },
  aptxLossless: {
    id: 'aptxLossless',
    name: 'Qualcomm aptX Lossless',
    label: 'aptX Lossless',
    bitrate: 1100,
    sampleRate: 44100,
    bitDepth: 16,
    isHiRes: false,
    latency: 80,
    description: 'Bit-Exact uncompressed CD-quality lossless transmission'
  },
  aptxHd: {
    id: 'aptxHd',
    name: 'Qualcomm aptX HD',
    label: 'aptX HD',
    bitrate: 576,
    sampleRate: 48000,
    bitDepth: 24,
    isHiRes: true,
    latency: 90,
    description: 'High Definition 24-bit/48kHz wireless audio'
  },
  aptxAdaptive: {
    id: 'aptxAdaptive',
    name: 'Qualcomm aptX Adaptive (Ultra-Low Latency)',
    label: 'aptX Adaptive',
    bitrate: 420,
    sampleRate: 48000,
    bitDepth: 24,
    isHiRes: false,
    latency: 40,
    description: '40ms Ultra-low latency mode with dynamic bit-rate adjustment'
  },
  aac: {
    id: 'aac',
    name: 'Apple AAC (Advanced Audio Coding)',
    label: 'AAC',
    bitrate: 256,
    sampleRate: 44100,
    bitDepth: 16,
    isHiRes: false,
    latency: 160,
    description: 'Psychoacoustic compression standard for Apple ecosystem'
  },
  sbc: {
    id: 'sbc',
    name: 'Subband Codec (Standard SBC)',
    label: 'SBC',
    bitrate: 328,
    sampleRate: 44100,
    bitDepth: 16,
    isHiRes: false,
    latency: 220,
    description: 'Universal fallback Bluetooth audio codec'
  }
};

export const HARDWARE_OUTPUTS = [
  {
    id: 'wasapi_exclusive',
    name: 'WASAPI Exclusive Mode (AudioQuest DragonFly Cobalt)',
    type: 'USB DAC',
    isExclusive: true,
    maxRate: 384000,
    platform: 'Windows'
  },
  {
    id: 'android_direct',
    name: 'USB Audio DAC (Bit-Perfect AUDIO_OUTPUT_FLAG_DIRECT)',
    type: 'USB DAC',
    isExclusive: true,
    maxRate: 384000,
    platform: 'Android'
  },
  {
    id: 'coreaudio_bitperfect',
    name: 'CoreAudio External DAC (Bit-Perfect Integer Mode)',
    type: 'USB DAC',
    isExclusive: true,
    maxRate: 384000,
    platform: 'macOS / iOS'
  },
  {
    id: 'alsa_hw_direct',
    name: 'ALSA Direct Hardware (hw:0,0 Native)',
    type: 'Hardware Direct',
    isExclusive: true,
    maxRate: 384000,
    platform: 'Linux'
  },
  {
    id: 'bluetooth_passthrough',
    name: 'Sony WH-1000XM5 (LDAC 990kbps Direct A2DP)',
    type: 'Wireless Hi-Res',
    isExclusive: false,
    maxRate: 96000,
    platform: 'All Platforms'
  }
];

export class BluetoothAndHardwareManager {
  constructor() {
    this.currentCodec = BLUETOOTH_CODECS.ldac990;
    this.currentOutput = HARDWARE_OUTPUTS[0];
    this.isBluetoothMode = false;
  }

  setCodec(codecKey) {
    if (BLUETOOTH_CODECS[codecKey]) {
      this.currentCodec = BLUETOOTH_CODECS[codecKey];
      this.updateDynamicBadge();
    }
  }

  setOutput(outputId) {
    const out = HARDWARE_OUTPUTS.find(o => o.id === outputId);
    if (out) {
      this.currentOutput = out;
      this.isBluetoothMode = out.id === 'bluetooth_passthrough';
      audioCore.activeOutput = out.name;
      audioCore.isBitPerfect = out.isExclusive;
      this.updateDynamicBadge();
    }
  }

  getDynamicBadgeText(track = audioCore.currentTrack) {
    const srcFormat = track ? track.format : 'FLAC 24/192';
    const srcRate = track ? `${track.sample_rate / 1000}kHz` : '192kHz';
    const srcDepth = track ? `${track.bit_depth}-bit` : '24-bit';

    if (this.isBluetoothMode) {
      return `${srcFormat} → ${this.currentCodec.label} ${this.currentCodec.bitrate} kbps • ${this.currentCodec.isHiRes ? 'Hi-Res Wireless' : 'Standard Wireless'}`;
    } else {
      return `${srcFormat} • ${this.currentOutput.isExclusive ? 'Bit-Perfect Direct Bypass' : 'Standard Audio Stream'}`;
    }
  }

  updateDynamicBadge() {
    const badgeEl = document.getElementById('active-stream-badge');
    const badgeTextEl = document.getElementById('stream-badge-text');
    if (badgeEl && badgeTextEl) {
      const text = this.getDynamicBadgeText();
      badgeTextEl.textContent = text;
      
      if (this.isBluetoothMode && this.currentCodec.isHiRes) {
        badgeEl.className = 'stream-badge-pill badge-gold-hires';
      } else if (!this.isBluetoothMode && this.currentOutput.isExclusive) {
        badgeEl.className = 'stream-badge-pill badge-cyan-exclusive';
      } else {
        badgeEl.className = 'stream-badge-pill badge-standard';
      }
    }
  }
}

export const hwManager = new BluetoothAndHardwareManager();
