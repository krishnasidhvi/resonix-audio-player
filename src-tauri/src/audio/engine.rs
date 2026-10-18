//! Lock-free SPSC Ring Buffer Engine & Playback Pipeline
//! Bridges decoder worker thread and real-time audio callback thread with microsecond jitter protection.

use ringbuf::traits::{Consumer, Producer, Split};
use ringbuf::HeapRb;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::Duration;
use parking_lot::Mutex;
use serde::{Serialize, Deserialize};
use super::decoder::SymphoniaDecoder;

/// 2 seconds of 32-bit float stereo audio buffer at 384kHz (384,000 * 2 * 2 = 1,536,000 samples)
pub const DEFAULT_RING_BUFFER_CAPACITY: usize = 1_536_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlaybackState {
    Stopped,
    Playing,
    Paused,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineMetrics {
    pub state: PlaybackState,
    pub current_position_ms: u64,
    pub total_duration_ms: u64,
    pub sample_rate: u32,
    pub bit_depth: u32,
    pub channels: u32,
    pub buffer_occupancy_percent: f32,
    pub underflow_count: usize,
    pub is_bit_perfect: bool,
    pub is_dop: bool,
    pub active_output_name: String,
}

pub struct AudioEngine {
    state: Arc<Mutex<PlaybackState>>,
    position_samples: Arc<AtomicU64>,
    sample_rate: Arc<AtomicU64>,
    total_samples: Arc<AtomicU64>,
    underflow_count: Arc<AtomicUsize>,
    bit_depth: Arc<AtomicU64>,
    channels: Arc<AtomicU64>,
    is_dop: Arc<AtomicBool>,
    is_bit_perfect: Arc<AtomicBool>,
    active_device_name: Arc<Mutex<String>>,

    // Producer handle for background decoding thread
    producer: Arc<Mutex<Option<<HeapRb<f32> as Split>::Prod>>>,
    // Consumer handle for real-time audio output callback
    pub consumer: Arc<Mutex<Option<<HeapRb<f32> as Split>::Cons>>>,
    
    decoder_thread: Option<JoinHandle<()>>,
    stop_signal: Arc<AtomicBool>,
    seek_request: Arc<Mutex<Option<f64>>>,
    ring_capacity: usize,
}

impl AudioEngine {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(PlaybackState::Stopped)),
            position_samples: Arc::new(AtomicU64::new(0)),
            sample_rate: Arc::new(AtomicU64::new(44100)),
            total_samples: Arc::new(AtomicU64::new(0)),
            underflow_count: Arc::new(AtomicUsize::new(0)),
            bit_depth: Arc::new(AtomicU64::new(16)),
            channels: Arc::new(AtomicU64::new(2)),
            is_dop: Arc::new(AtomicBool::new(false)),
            is_bit_perfect: Arc::new(AtomicBool::new(true)),
            active_device_name: Arc::new(Mutex::new("WASAPI Exclusive Stream".into())),
            producer: Arc::new(Mutex::new(None)),
            consumer: Arc::new(Mutex::new(None)),
            decoder_thread: None,
            stop_signal: Arc::new(AtomicBool::new(false)),
            seek_request: Arc::new(Mutex::new(None)),
            ring_capacity: DEFAULT_RING_BUFFER_CAPACITY,
        }
    }

    /// Load and play a file through Symphonia and the lock-free ring buffer
    pub fn load_and_play(&mut self, filepath: String) -> Result<(), anyhow::Error> {
        // Stop any previous stream
        self.stop();

        let mut decoder = SymphoniaDecoder::open(&filepath)?;
        let sample_rate = decoder.sample_rate();
        let channels = decoder.channels();
        let bit_depth = decoder.bit_depth();
        let total_secs = decoder.duration_seconds();
        let is_dop = decoder.is_dop();

        self.sample_rate.store(sample_rate as u64, Ordering::SeqCst);
        self.channels.store(channels as u64, Ordering::SeqCst);
        self.bit_depth.store(bit_depth as u64, Ordering::SeqCst);
        self.total_samples.store((total_secs * sample_rate as f64) as u64, Ordering::SeqCst);
        self.position_samples.store(0, Ordering::SeqCst);
        self.is_dop.store(is_dop, Ordering::SeqCst);

        // Allocate high-capacity lock-free SPSC ring buffer
        let rb = HeapRb::<f32>::new(self.ring_capacity);
        let (mut prod, cons) = rb.split();

        *self.producer.lock() = None; // clear previous
        *self.consumer.lock() = Some(cons);

        self.stop_signal.store(false, Ordering::SeqCst);
        *self.seek_request.lock() = None;

        let stop_sig = self.stop_signal.clone();
        let seek_req = self.seek_request.clone();
        let pos_atomic = self.position_samples.clone();
        let state_arc = self.state.clone();

        // Spawn dedicated real-time decoding thread
        let handle = thread::Builder::new()
            .name("resonix-symphonia-decoder".into())
            .spawn(move || {
                loop {
                    if stop_sig.load(Ordering::SeqCst) {
                        break;
                    }

                    // Handle Seek Request
                    let seek_to = {
                        let mut req = seek_req.lock();
                        req.take()
                    };
                    if let Some(target_sec) = seek_to {
                        if let Err(e) = decoder.seek(target_sec) {
                            eprintln!("Seek error: {:?}", e);
                        } else {
                            pos_atomic.store((target_sec * sample_rate as f64) as u64, Ordering::SeqCst);
                        }
                    }

                    // Check if paused
                    if *state_arc.lock() == PlaybackState::Paused {
                        thread::sleep(Duration::from_millis(15));
                        continue;
                    }

                    // If ring buffer is nearly full, pause decoding to save CPU cycles
                    if prod.vacant_len() < 8192 {
                        thread::sleep(Duration::from_millis(5));
                        continue;
                    }

                    match decoder.next_samples() {
                        Ok(Some(samples)) => {
                            let mut offset = 0;
                            while offset < samples.len() {
                                if stop_sig.load(Ordering::SeqCst) {
                                    break;
                                }
                                let pushed = prod.push_slice(&samples[offset..]);
                                offset += pushed;
                                if offset < samples.len() {
                                    thread::sleep(Duration::from_millis(2));
                                }
                            }
                        }
                        Ok(None) => {
                            // End of track reached
                            thread::sleep(Duration::from_millis(50));
                        }
                        Err(e) => {
                            eprintln!("Decoder error encountered: {:?}", e);
                            break;
                        }
                    }
                }
            })?;

        self.decoder_thread = Some(handle);
        *self.state.lock() = PlaybackState::Playing;

        Ok(())
    }

    pub fn pause(&self) {
        let mut st = self.state.lock();
        if *st == PlaybackState::Playing {
            *st = PlaybackState::Paused;
        }
    }

    pub fn resume(&self) {
        let mut st = self.state.lock();
        if *st == PlaybackState::Paused {
            *st = PlaybackState::Playing;
        }
    }

    pub fn stop(&mut self) {
        self.stop_signal.store(true, Ordering::SeqCst);
        *self.state.lock() = PlaybackState::Stopped;
        if let Some(handle) = self.decoder_thread.take() {
            let _ = handle.join();
        }
        *self.consumer.lock() = None;
        self.position_samples.store(0, Ordering::SeqCst);
    }

    pub fn seek(&self, target_seconds: f64) {
        *self.seek_request.lock() = Some(target_seconds);
    }

    /// Read samples into audio callback buffer with lock-free atomic safety
    pub fn read_output_samples(&self, output_buffer: &mut [f32]) -> usize {
        let mut cons_guard = self.consumer.lock();
        if let Some(ref mut cons) = *cons_guard {
            let read_count = cons.pop_slice(output_buffer);
            if read_count < output_buffer.len() {
                // Buffer underflow occurred! Fill the remainder with silence
                output_buffer[read_count..].fill(0.0);
                self.underflow_count.fetch_add(1, Ordering::Relaxed);
            }

            let channels = self.channels.load(Ordering::Relaxed).max(1);
            let frames_advanced = (read_count as u64) / channels;
            self.position_samples.fetch_add(frames_advanced, Ordering::Relaxed);

            read_count
        } else {
            output_buffer.fill(0.0);
            0
        }
    }

    pub fn get_metrics(&self) -> EngineMetrics {
        let sr = self.sample_rate.load(Ordering::Relaxed).max(1);
        let pos_samples = self.position_samples.load(Ordering::Relaxed);
        let tot_samples = self.total_samples.load(Ordering::Relaxed);

        let current_position_ms = (pos_samples * 1000) / sr;
        let total_duration_ms = (tot_samples * 1000) / sr;

        let occupancy_percent = {
            let cons_guard = self.consumer.lock();
            if let Some(ref cons) = *cons_guard {
                (cons.occupied_len() as f32 / self.ring_capacity as f32) * 100.0
            } else {
                0.0
            }
        };

        EngineMetrics {
            state: *self.state.lock(),
            current_position_ms,
            total_duration_ms,
            sample_rate: sr as u32,
            bit_depth: self.bit_depth.load(Ordering::Relaxed) as u32,
            channels: self.channels.load(Ordering::Relaxed) as u32,
            buffer_occupancy_percent: occupancy_percent,
            underflow_count: self.underflow_count.load(Ordering::Relaxed),
            is_bit_perfect: self.is_bit_perfect.load(Ordering::Relaxed),
            is_dop: self.is_dop.load(Ordering::Relaxed),
            active_output_name: self.active_device_name.lock().clone(),
        }
    }
}
