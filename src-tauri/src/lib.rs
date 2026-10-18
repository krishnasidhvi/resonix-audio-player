pub mod audio;
pub mod db;
pub mod ml;
pub mod commands;

use std::sync::Arc;
use parking_lot::Mutex;
use audio::engine::AudioEngine;
use db::sqlite::{ResonixDatabase, DbTrack, AcousticVector};
use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let engine = Arc::new(Mutex::new(AudioEngine::new()));
    
    // Initialize embedded SQLite database in local app data directory
    let db = match ResonixDatabase::open_in_memory() {
        Ok(db) => {
            // Seed sample audiophile demo tracks with rich acoustic vector profiles
            seed_initial_audiophile_data(&db);
            Arc::new(Mutex::new(db))
        }
        Err(e) => {
            eprintln!("Failed to open SQLite database: {:?}", e);
            return;
        }
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { engine, db })
        .invoke_handler(tauri::generate_handler![
            commands::play_track,
            commands::pause_playback,
            commands::resume_playback,
            commands::seek_ms,
            commands::stop_playback,
            commands::get_playback_status,
            commands::get_audio_devices,
            commands::get_bluetooth_status,
            commands::get_library_tracks,
            commands::get_track_recommendations,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Resonix Audio Player");
}

fn seed_initial_audiophile_data(db: &ResonixDatabase) {
    let sample_tracks = vec![
        (
            DbTrack {
                id: 1,
                title: "Nocturne in C-Sharp Minor (Master)".into(),
                artist: "Chopin / Valentina Lisitsa".into(),
                album: "Audiophile Piano Masters (24-bit/192kHz)".into(),
                duration_seconds: 254.0,
                sample_rate: 192000,
                bit_depth: 24,
                format: "FLAC".into(),
                channels: 2,
                file_path: "demo://chopin_nocturne_24_192.flac".into(),
                is_hi_res: true,
                date_added: 1729270000,
            },
            AcousticVector {
                track_id: 1,
                tempo_bpm: 64.0,
                energy: 0.32,
                spectral_centroid: 1850.0,
                danceability: 0.22,
                valence: 0.28,
                acousticness: 0.96,
                dynamic_range_dr: 14.5,
            },
        ),
        (
            DbTrack {
                id: 2,
                title: "Clair de Lune (Direct DSD128 Transcode)".into(),
                artist: "Claude Debussy".into(),
                album: "Impressionist Reflections".into(),
                duration_seconds: 312.0,
                sample_rate: 352800,
                bit_depth: 32,
                format: "DSD/DoP".into(),
                channels: 2,
                file_path: "demo://debussy_clair_dsd.dop".into(),
                is_hi_res: true,
                date_added: 1729270100,
            },
            AcousticVector {
                track_id: 2,
                tempo_bpm: 58.0,
                energy: 0.26,
                spectral_centroid: 1620.0,
                danceability: 0.18,
                valence: 0.35,
                acousticness: 0.98,
                dynamic_range_dr: 16.2,
            },
        ),
        (
            DbTrack {
                id: 3,
                title: "Midnight Blue (Acoustic Jazz Quintet)".into(),
                artist: "Kenny Burrell Heritage Trio".into(),
                album: "Blue Note Master Collection".into(),
                duration_seconds: 248.0,
                sample_rate: 96000,
                bit_depth: 24,
                format: "FLAC".into(),
                channels: 2,
                file_path: "demo://midnight_blue_96k.flac".into(),
                is_hi_res: true,
                date_added: 1729270200,
            },
            AcousticVector {
                track_id: 3,
                tempo_bpm: 88.0,
                energy: 0.48,
                spectral_centroid: 2450.0,
                danceability: 0.54,
                valence: 0.56,
                acousticness: 0.82,
                dynamic_range_dr: 13.8,
            },
        ),
        (
            DbTrack {
                id: 4,
                title: "Symphony No. 9 - Scherzo (Direct Master)".into(),
                artist: "Ludwig van Beethoven / BPO".into(),
                album: "The Symphonic Cycle".into(),
                duration_seconds: 685.0,
                sample_rate: 192000,
                bit_depth: 24,
                format: "FLAC".into(),
                channels: 2,
                file_path: "demo://beethoven_9_scherzo.flac".into(),
                is_hi_res: true,
                date_added: 1729270300,
            },
            AcousticVector {
                track_id: 4,
                tempo_bpm: 142.0,
                energy: 0.88,
                spectral_centroid: 4800.0,
                danceability: 0.42,
                valence: 0.68,
                acousticness: 0.74,
                dynamic_range_dr: 17.5,
            },
        ),
    ];

    for (track, features) in sample_tracks {
        let _ = db.insert_track(&track, &features);
    }
}
