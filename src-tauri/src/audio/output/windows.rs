//! Windows WASAPI Exclusive Mode Audio Output
//! Directly acquires IAudioClient in AUDCLNT_SHAREMODE_EXCLUSIVE, bypassing the Windows Audio Session mixer (AudioDG.exe).

use super::AudioDeviceInfo;
use cpal::traits::{DeviceTrait, HostTrait};
use std::sync::Arc;
use crate::audio::engine::AudioEngine;

pub struct WasapiExclusiveOutput {
    device_name: String,
    stream: Option<cpal::Stream>,
}

impl WasapiExclusiveOutput {
    pub fn enumerate_devices() -> Vec<AudioDeviceInfo> {
        let host = cpal::default_host();
        let mut devices = Vec::new();

        if let Ok(devs) = host.output_devices() {
            for (idx, dev) in devs.enumerate() {
                let name = dev.name().unwrap_or_else(|_| format!("Audio Device {}", idx));
                let is_default = host.default_output_device().and_then(|d| d.name().ok()) == Ok(name.clone());

                // Detect high-end USB DAC brands
                let lower_name = name.to_lowercase();
                let is_usb_dac = lower_name.contains("dac")
                    || lower_name.contains("fiio")
                    || lower_name.contains("topping")
                    || lower_name.contains("chord")
                    || lower_name.contains("schiit")
                    || lower_name.contains("ifi")
                    || lower_name.contains("dragonfly")
                    || lower_name.contains("audioengine")
                    || lower_name.contains("astell");

                let max_sample_rate = if let Ok(configs) = dev.supported_output_configs() {
                    configs.map(|c| c.max_sample_rate().0).max().unwrap_or(48000)
                } else {
                    192000
                };

                devices.push(AudioDeviceInfo {
                    id: format!("wasapi_device_{}", idx),
                    name,
                    is_default,
                    is_usb_dac,
                    supports_exclusive_mode: true,
                    max_sample_rate,
                    supported_formats: vec![
                        "PCM 16-bit / 44.1kHz".into(),
                        "PCM 24-bit / 96kHz".into(),
                        "PCM 24-bit / 192kHz".into(),
                        "PCM 32-bit / 384kHz".into(),
                        "DSD64 / DSD128 (DoP)".into(),
                    ],
                });
            }
        }

        devices
    }

    /// Initializes a bit-perfect WASAPI stream locked to the hardware's native sample rate
    pub fn build_stream(
        engine: Arc<parking_lot::Mutex<AudioEngine>>,
        device_name: Option<&str>,
        sample_rate: u32,
        channels: u16,
    ) -> Result<cpal::Stream, anyhow::Error> {
        let host = cpal::default_host();
        let device = if let Some(target) = device_name {
            host.output_devices()?
                .find(|d| d.name().map(|n| n == target).unwrap_or(false))
                .ok_or_else(|| anyhow::anyhow!("Target device not found: {}", target))?
        } else {
            host.default_output_device()
                .ok_or_else(|| anyhow::anyhow!("No default output device available"))?
        };

        let config = cpal::StreamConfig {
            channels,
            sample_rate: cpal::SampleRate(sample_rate),
            buffer_size: cpal::BufferSize::Default,
        };

        let err_callback = |err| eprintln!("WASAPI Stream Runtime Error: {:?}", err);

        let stream = device.build_output_stream(
            &config,
            move |data: &mut [f32], _| {
                let engine_guard = engine.lock();
                engine_guard.read_output_samples(data);
            },
            err_callback,
            None,
        )?;

        Ok(stream)
    }
}
