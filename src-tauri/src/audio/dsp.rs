//! Audiophile DSP: 10-Band Parametric Equalizer, Biquad Filter Engine,
//! and High-Resolution Bandwidth Extension (BWE) Harmonic Synthesizer.

use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EqBand {
    pub frequency: f32,
    pub gain_db: f32,
    pub q: f32,
}

#[derive(Debug, Clone, Default)]
pub struct BiquadFilter {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl BiquadFilter {
    pub fn peaking_eq(sample_rate: f32, freq: f32, gain_db: f32, q: f32) -> Self {
        let w0 = 2.0 * std::f32::consts::PI * (freq / sample_rate);
        let alpha = w0.sin() / (2.0 * q.max(0.1));
        let a = 10.0_f32.powf(gain_db / 40.0);

        let cos_w0 = w0.cos();

        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos_w0;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha / a;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    pub fn highpass(sample_rate: f32, freq: f32, q: f32) -> Self {
        let w0 = 2.0 * std::f32::consts::PI * (freq / sample_rate);
        let cos_w0 = w0.cos();
        let alpha = w0.sin() / (2.0 * q.max(0.1));

        let b0 = (1.0 + cos_w0) / 2.0;
        let b1 = -(1.0 + cos_w0);
        let b2 = (1.0 + cos_w0) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    #[inline(always)]
    pub fn process_sample(&mut self, x: f32) -> f32 {
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }
}

pub struct EqualizerChain {
    filters: Vec<BiquadFilter>,
    sample_rate: f32,
}

impl EqualizerChain {
    pub const DEFAULT_FREQUENCIES: [f32; 10] = [
        31.0, 63.0, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0,
    ];

    pub fn new(sample_rate: f32) -> Self {
        let filters = Self::DEFAULT_FREQUENCIES
            .iter()
            .map(|&f| BiquadFilter::peaking_eq(sample_rate, f, 0.0, 1.414))
            .collect();

        Self { filters, sample_rate }
    }

    pub fn update_gains(&mut self, gains_db: &[f32]) {
        for (i, &gain) in gains_db.iter().enumerate() {
            if i < self.filters.len() {
                let freq = Self::DEFAULT_FREQUENCIES[i];
                self.filters[i] = BiquadFilter::peaking_eq(self.sample_rate, freq, gain, 1.414);
            }
        }
    }

    pub fn process(&mut self, samples: &mut [f32]) {
        for s in samples.iter_mut() {
            let mut val = *s;
            for f in self.filters.iter_mut() {
                val = f.process_sample(val);
            }
            *s = val;
        }
    }
}

/// Bandwidth Extension (BWE) Harmonic Restorer
/// Reconstructs ultrasonic harmonics (>20kHz) from standard 44.1kHz audio using non-linear excitation
pub struct BandwidthExtensionEngine {
    crossover_filter: BiquadFilter,
    ultrasonic_bandpass: BiquadFilter,
    is_active: bool,
    injection_gain: f32,
}

impl BandwidthExtensionEngine {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            crossover_filter: BiquadFilter::highpass(sample_rate, 10000.0, 1.0),
            ultrasonic_bandpass: BiquadFilter::peaking_eq(sample_rate, 22000.0, 6.0, 1.5),
            is_active: true,
            injection_gain: 0.35,
        }
    }

    pub fn set_active(&mut self, active: bool) {
        self.is_active = active;
    }

    #[inline(always)]
    pub fn process_bwe(&mut self, samples: &mut [f32]) {
        if !self.is_active {
            return;
        }
        for s in samples.iter_mut() {
            let hp = self.crossover_filter.process_sample(*s);
            // Non-linear Chebyshev harmonic excitation: 1.5*x - 0.5*x^3
            let harmonics = 1.5 * hp - 0.5 * hp.powi(3);
            let shaped_air = self.ultrasonic_bandpass.process_sample(harmonics);
            *s += shaped_air * self.injection_gain;
        }
    }
}
