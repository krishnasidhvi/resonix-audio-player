//! Tauri 2.0 Commands Bridge
//! Exposes native audio engine, bit-perfect device management, and SQLite recommendation pipeline to frontend.

use tauri::State;
use std::sync::Arc;
use parking_lot::Mutex;

use crate::audio::engine::{AudioEngine, EngineMetrics};
use crate::audio::bluetooth::{BluetoothManager, BluetoothStatus};
use crate::audio::output::AudioDeviceInfo;
use crate::db::sqlite::{ResonixDatabase, DbTrack};
use crate::ml::similarity::{VectorSimilarityEngine, TrackRecommendation};

pub struct AppState {
    pub engine: Arc<Mutex<AudioEngine>>,
    pub db: Arc<Mutex<ResonixDatabase>>,
}

#[tauri::command]
pub fn play_track(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut eng = state.engine.lock();
    eng.load_and_play(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pause_playback(state: State<'_, AppState>) {
    let eng = state.engine.lock();
    eng.pause();
}

#[tauri::command]
pub fn resume_playback(state: State<'_, AppState>) {
    let eng = state.engine.lock();
    eng.resume();
}

#[tauri::command]
pub fn seek_ms(ms: u64, state: State<'_, AppState>) {
    let eng = state.engine.lock();
    eng.seek(ms as f64 / 1000.0);
}

#[tauri::command]
pub fn stop_playback(state: State<'_, AppState>) {
    let mut eng = state.engine.lock();
    eng.stop();
}

#[tauri::command]
pub fn get_playback_status(state: State<'_, AppState>) -> EngineMetrics {
    let eng = state.engine.lock();
    eng.get_metrics()
}

#[tauri::command]
pub fn get_audio_devices() -> Vec<AudioDeviceInfo> {
    #[cfg(target_os = "windows")]
    {
        crate::audio::output::windows::WasapiExclusiveOutput::enumerate_devices()
    }
    #[cfg(target_os = "android")]
    {
        crate::audio::output::android::AndroidDirectAudioOutput::enumerate_devices()
    }
    #[cfg(target_os = "macos")]
    {
        crate::audio::output::macos::CoreAudioOutput::enumerate_devices()
    }
    #[cfg(target_os = "linux")]
    {
        crate::audio::output::linux::LinuxAudioOutput::enumerate_devices()
    }
    #[cfg(not(any(target_os = "windows", target_os = "android", target_os = "macos", target_os = "linux")))]
    {
        vec![]
    }
}

#[tauri::command]
pub fn get_bluetooth_status(state: State<'_, AppState>) -> BluetoothStatus {
    let eng = state.engine.lock();
    let metrics = eng.get_metrics();
    BluetoothManager::get_current_status(metrics.sample_rate, metrics.bit_depth, "FLAC")
}

#[tauri::command]
pub fn get_library_tracks(state: State<'_, AppState>) -> Result<Vec<DbTrack>, String> {
    let db = state.db.lock();
    db.get_all_tracks().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_track_recommendations(
    track_id: i64,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecommendation>, String> {
    let db = state.db.lock();
    let target = db.get_acoustic_features(track_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Track acoustic profile not found".to_string())?;

    let all_vectors = db.get_all_vectors().map_err(|e| e.to_string())?;
    let recs = VectorSimilarityEngine::find_similar_tracks(&target, &all_vectors, limit.unwrap_or(5));
    Ok(recs)
}
