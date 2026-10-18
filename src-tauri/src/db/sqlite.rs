//! Local Embedded SQLite Database for Metadata & Acoustic Feature Vectors
//! Stores library tracks, audio file signatures, and high-dimensional acoustic vectors for local smart recommendations.

use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Serialize, Deserialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbTrack {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_seconds: f64,
    pub sample_rate: u32,
    pub bit_depth: u32,
    pub format: String,
    pub channels: u32,
    pub file_path: String,
    pub is_hi_res: bool,
    pub date_added: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcousticVector {
    pub track_id: i64,
    pub tempo_bpm: f32,
    pub energy: f32,
    pub spectral_centroid: f32,
    pub danceability: f32,
    pub valence: f32,
    pub acousticness: f32,
    pub dynamic_range_dr: f32,
}

impl AcousticVector {
    pub fn as_slice(&self) -> [f32; 7] {
        [
            self.tempo_bpm / 200.0, // normalized
            self.energy,
            self.spectral_centroid / 8000.0, // normalized
            self.danceability,
            self.valence,
            self.acousticness,
            self.dynamic_range_dr / 20.0,
        ]
    }
}

pub struct ResonixDatabase {
    conn: Connection,
}

impl ResonixDatabase {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, anyhow::Error> {
        let conn = Connection::open(path)?;
        let db = Self { conn };
        db.init_schema()?;
        Ok(db)
    }

    pub fn open_in_memory() -> Result<Self, anyhow::Error> {
        let conn = Connection::open_in_memory()?;
        let db = Self { conn };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<(), anyhow::Error> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT NOT NULL,
                duration_seconds REAL NOT NULL,
                sample_rate INTEGER NOT NULL,
                bit_depth INTEGER NOT NULL,
                format TEXT NOT NULL,
                channels INTEGER NOT NULL,
                file_path TEXT UNIQUE NOT NULL,
                is_hi_res INTEGER NOT NULL DEFAULT 0,
                date_added INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS acoustic_features (
                track_id INTEGER PRIMARY KEY,
                tempo_bpm REAL NOT NULL,
                energy REAL NOT NULL,
                spectral_centroid REAL NOT NULL,
                danceability REAL NOT NULL,
                valence REAL NOT NULL,
                acousticness REAL NOT NULL,
                dynamic_range_dr REAL NOT NULL,
                FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
            CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
            CREATE INDEX IF NOT EXISTS idx_tracks_hi_res ON tracks(is_hi_res);
            "
        )?;
        Ok(())
    }

    pub fn insert_track(&self, track: &DbTrack, features: &AcousticVector) -> Result<i64, anyhow::Error> {
        self.conn.execute(
            "INSERT OR REPLACE INTO tracks 
            (title, artist, album, duration_seconds, sample_rate, bit_depth, format, channels, file_path, is_hi_res, date_added)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                track.title,
                track.artist,
                track.album,
                track.duration_seconds,
                track.sample_rate,
                track.bit_depth,
                track.format,
                track.channels,
                track.file_path,
                if track.is_hi_res { 1 } else { 0 },
                track.date_added
            ],
        )?;

        let track_id = self.conn.last_insert_rowid();

        self.conn.execute(
            "INSERT OR REPLACE INTO acoustic_features
            (track_id, tempo_bpm, energy, spectral_centroid, danceability, valence, acousticness, dynamic_range_dr)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                track_id,
                features.tempo_bpm,
                features.energy,
                features.spectral_centroid,
                features.danceability,
                features.valence,
                features.acousticness,
                features.dynamic_range_dr
            ],
        )?;

        Ok(track_id)
    }

    pub fn get_all_tracks(&self) -> Result<Vec<DbTrack>, anyhow::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, artist, album, duration_seconds, sample_rate, bit_depth, format, channels, file_path, is_hi_res, date_added 
             FROM tracks ORDER BY artist, album, title"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(DbTrack {
                id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                duration_seconds: row.get(4)?,
                sample_rate: row.get(5)?,
                bit_depth: row.get(6)?,
                format: row.get(7)?,
                channels: row.get(8)?,
                file_path: row.get(9)?,
                is_hi_res: row.get::<_, i64>(10)? == 1,
                date_added: row.get(11)?,
            })
        })?;

        let mut tracks = Vec::new();
        for r in rows {
            tracks.push(r?);
        }
        Ok(tracks)
    }

    pub fn get_acoustic_features(&self, track_id: i64) -> Result<Option<AcousticVector>, anyhow::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT track_id, tempo_bpm, energy, spectral_centroid, danceability, valence, acousticness, dynamic_range_dr
             FROM acoustic_features WHERE track_id = ?1"
        )?;

        let mut rows = stmt.query(params![track_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(AcousticVector {
                track_id: row.get(0)?,
                tempo_bpm: row.get(1)?,
                energy: row.get(2)?,
                spectral_centroid: row.get(3)?,
                danceability: row.get(4)?,
                valence: row.get(5)?,
                acousticness: row.get(6)?,
                dynamic_range_dr: row.get(7)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_all_vectors(&self) -> Result<Vec<AcousticVector>, anyhow::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT track_id, tempo_bpm, energy, spectral_centroid, danceability, valence, acousticness, dynamic_range_dr
             FROM acoustic_features"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AcousticVector {
                track_id: row.get(0)?,
                tempo_bpm: row.get(1)?,
                energy: row.get(2)?,
                spectral_centroid: row.get(3)?,
                danceability: row.get(4)?,
                valence: row.get(5)?,
                acousticness: row.get(6)?,
                dynamic_range_dr: row.get(7)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }
}
