//! Symphonia Pure-Rust High-Resolution Audio Decoder
//! Supports FLAC, ALAC, WAV, AIFF, DSD over PCM (DoP), MP3, AAC up to 32-bit / 384 kHz.

use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{Decoder, DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::{FormatOptions, FormatReader, SeekMode, SeekTo};
use symphonia::core::io::{MediaSourceStream, ReadOnlySource};
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::default::get_probe;
use std::fs::File;
use std::path::Path;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackAudioMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub codec: String,
    pub sample_rate: u32,
    pub bit_depth: u32,
    pub channels: u32,
    pub duration_seconds: f64,
    pub is_hi_res: bool,
    pub is_dop_dsd: bool,
}

pub struct SymphoniaDecoder {
    format_reader: Box<dyn FormatReader>,
    decoder: Box<dyn Decoder>,
    track_id: u32,
    sample_rate: u32,
    channels: u32,
    bit_depth: u32,
    duration_secs: f64,
    codec_name: String,
    is_dop: bool,
}

impl SymphoniaDecoder {
    /// Opens and probes an audio file from the filesystem.
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, anyhow::Error> {
        let file = File::open(path.as_ref())?;
        let mss = MediaSourceStream::new(Box::new(file), Default::default());

        let mut hint = Hint::new();
        if let Some(ext) = path.as_ref().extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        }

        let format_opts = FormatOptions {
            enable_gapless: true,
            ..Default::default()
        };
        let meta_opts: MetadataOptions = Default::default();

        let probed = get_probe().format(&hint, mss, &format_opts, &meta_opts)?;
        let format_reader = probed.format;

        // Find the first valid audio track
        let track = format_reader
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or_else(|| anyhow::anyhow!("No valid audio track detected in file"))?;

        let track_id = track.id;
        let codec_params = track.codec_params.clone();

        let sample_rate = codec_params.sample_rate.unwrap_or(44100);
        let channels = codec_params.channels.map(|c| c.count() as u32).unwrap_or(2);
        let bit_depth = codec_params.bits_per_sample.unwrap_or(16);
        let codec_name = format!("{:?}", codec_params.codec);

        let duration_secs = if let (Some(n_frames), Some(tb)) = (codec_params.n_frames, codec_params.time_base) {
            let time = tb.calc_time(n_frames);
            time.seconds as f64 + time.frac
        } else {
            0.0
        };

        // Check for DSD / DoP marker (e.g. 176.4kHz or 352.8kHz with DSD markers)
        let is_dop = codec_name.to_lowercase().contains("dsd") || 
            (sample_rate == 176400 && bit_depth == 24);

        let dec_opts: DecoderOptions = Default::default();
        let decoder = symphonia::default::get_codecs().make(&codec_params, &dec_opts)?;

        Ok(Self {
            format_reader,
            decoder,
            track_id,
            sample_rate,
            channels,
            bit_depth,
            duration_secs,
            codec_name,
            is_dop,
        })
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    pub fn channels(&self) -> u32 {
        self.channels
    }

    pub fn bit_depth(&self) -> u32 {
        self.bit_depth
    }

    pub fn duration_seconds(&self) -> f64 {
        self.duration_secs
    }

    pub fn is_dop(&self) -> bool {
        self.is_dop
    }

    pub fn codec_name(&self) -> &str {
        &self.codec_name
    }

    /// Seek to a specific timestamp in seconds
    pub fn seek(&mut self, seconds: f64) -> Result<(), anyhow::Error> {
        let time_base = symphonia::core::units::TimeBase::new(1, self.sample_rate);
        let seek_to = SeekTo::Time {
            time: symphonia::core::units::Time::from(seconds),
            track_id: Some(self.track_id),
        };
        self.format_reader.seek(SeekMode::Coarse, seek_to)?;
        self.decoder.reset();
        Ok(())
    }

    /// Read next packet and convert samples to standard 32-bit float interleaved stereo/multi-channel format
    pub fn next_samples(&mut self) -> Result<Option<Vec<f32>>, anyhow::Error> {
        loop {
            let packet = match self.format_reader.next_packet() {
                Ok(packet) => packet,
                Err(SymphoniaError::IoError(ref err)) if err.kind() == std::io::ErrorKind::UnexpectedEof => {
                    return Ok(None);
                }
                Err(SymphoniaError::ResetRequired) => {
                    self.decoder.reset();
                    continue;
                }
                Err(e) => return Err(e.into()),
            };

            if packet.track_id() != self.track_id {
                continue;
            }

            match self.decoder.decode(&packet) {
                Ok(audio_buf_ref) => {
                    let samples = Self::convert_buffer_to_f32(&audio_buf_ref);
                    return Ok(Some(samples));
                }
                Err(SymphoniaError::DecodeError(_)) => {
                    // Skip corrupt frames gracefully
                    continue;
                }
                Err(SymphoniaError::ResetRequired) => {
                    self.decoder.reset();
                    continue;
                }
                Err(e) => return Err(e.into()),
            }
        }
    }

    /// Convert any bit-depth (16-bit, 24-bit, 32-bit int or float) to normalized IEEE f32 samples
    fn convert_buffer_to_f32(buf: &AudioBufferRef) -> Vec<f32> {
        match buf {
            AudioBufferRef::F32(buf) => {
                let channels = buf.spec().channels.count();
                let frames = buf.frames();
                let mut interleaved = Vec::with_capacity(frames * channels);
                for f in 0..frames {
                    for c in 0..channels {
                        interleaved.push(buf.chan(c)[f]);
                    }
                }
                interleaved
            }
            AudioBufferRef::U8(buf) => {
                let channels = buf.spec().channels.count();
                let frames = buf.frames();
                let mut interleaved = Vec::with_capacity(frames * channels);
                for f in 0..frames {
                    for c in 0..channels {
                        let sample = (buf.chan(c)[f] as f32 - 128.0) / 128.0;
                        interleaved.push(sample);
                    }
                }
                interleaved
            }
            AudioBufferRef::S16(buf) => {
                let channels = buf.spec().channels.count();
                let frames = buf.frames();
                let mut interleaved = Vec::with_capacity(frames * channels);
                for f in 0..frames {
                    for c in 0..channels {
                        let sample = buf.chan(c)[f] as f32 / 32768.0;
                        interleaved.push(sample);
                    }
                }
                interleaved
            }
            AudioBufferRef::S24(buf) => {
                let channels = buf.spec().channels.count();
                let frames = buf.frames();
                let mut interleaved = Vec::with_capacity(frames * channels);
                for f in 0..frames {
                    for c in 0..channels {
                        let sample = buf.chan(c)[f].0 as f32 / 8388608.0;
                        interleaved.push(sample);
                    }
                }
                interleaved
            }
            AudioBufferRef::S32(buf) => {
                let channels = buf.spec().channels.count();
                let frames = buf.frames();
                let mut interleaved = Vec::with_capacity(frames * channels);
                for f in 0..frames {
                    for c in 0..channels {
                        let sample = buf.chan(c)[f] as f32 / 2147483648.0;
                        interleaved.push(sample);
                    }
                }
                interleaved
            }
            AudioBufferRef::F64(buf) => {
                let channels = buf.spec().channels.count();
                let frames = buf.frames();
                let mut interleaved = Vec::with_capacity(frames * channels);
                for f in 0..frames {
                    for c in 0..channels {
                        interleaved.push(buf.chan(c)[f] as f32);
                    }
                }
                interleaved
            }
        }
    }
}
