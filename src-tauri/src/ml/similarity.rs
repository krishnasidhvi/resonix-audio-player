//! Local Acoustic Vector Cosine Similarity Recommendation Engine
//! Powers 100% private, on-device smart track recommendations, flow matching, and smart playlist generation.

use crate::db::sqlite::AcousticVector;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackRecommendation {
    pub track_id: i64,
    pub similarity_score: f32, // 0.0 to 1.0 (1.0 = identical sonic profile)
    pub match_reason: String,
}

pub struct VectorSimilarityEngine;

impl VectorSimilarityEngine {
    /// Computes the exact Cosine Similarity between two 7-dimensional normalized acoustic vectors:
    /// cos(θ) = (A · B) / (||A|| * ||B||)
    pub fn cosine_similarity(v1: &[f32; 7], v2: &[f32; 7]) -> f32 {
        let mut dot_product = 0.0_f32;
        let mut norm1 = 0.0_f32;
        let mut norm2 = 0.0_f32;

        for i in 0..7 {
            dot_product += v1[i] * v2[i];
            norm1 += v1[i] * v1[i];
            norm2 += v2[i] * v2[i];
        }

        let denom = norm1.sqrt() * norm2.sqrt();
        if denom < 1e-6 {
            0.0
        } else {
            (dot_product / denom).clamp(0.0, 1.0)
        }
    }

    /// Finds the top-k most sonically similar tracks in the local database
    pub fn find_similar_tracks(
        target_vector: &AcousticVector,
        all_vectors: &[AcousticVector],
        limit: usize,
    ) -> Vec<TrackRecommendation> {
        let target_slice = target_vector.as_slice();

        let mut scored: Vec<TrackRecommendation> = all_vectors
            .iter()
            .filter(|v| v.track_id != target_vector.track_id)
            .map(|candidate| {
                let sim = Self::cosine_similarity(&target_slice, &candidate.as_slice());

                // Derive intelligent human-readable match reason
                let match_reason = if (candidate.tempo_bpm - target_vector.tempo_bpm).abs() < 5.0 && (candidate.energy - target_vector.energy).abs() < 0.15 {
                    "Matching Tempo & Energy Cadence".into()
                } else if (candidate.spectral_centroid - target_vector.spectral_centroid).abs() < 500.0 {
                    "Harmonic & Timbre Resonance".into()
                } else if (candidate.dynamic_range_dr - target_vector.dynamic_range_dr).abs() < 1.5 {
                    "Audiophile High-Dynamic Master Match".into()
                } else {
                    "Acoustic Valence & Mood Match".into()
                };

                TrackRecommendation {
                    track_id: candidate.track_id,
                    similarity_score: sim,
                    match_reason,
                }
            })
            .collect();

        // Sort descending by similarity score
        scored.sort_by(|a, b| b.similarity_score.partial_cmp(&a.similarity_score).unwrap_or(std::cmp::Ordering::Equal));
        scored.truncate(limit);
        scored
    }
}
