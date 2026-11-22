//! Publish synced lyrics to LRCLIB (https://lrclib.net) from the desktop app.
//!
//! LRCLIB accepts anonymous submissions protected by a proof-of-work challenge.
//! The website can't do this (LRCLIB's CORS policy doesn't allow the
//! `X-Publish-Token` header from web pages), but a native request can.
//! Protocol, as implemented by LRCLIB's own LRCGET app:
//!   1. POST /api/request-challenge → { prefix, target } (64 hex chars, valid 5 minutes)
//!   2. find the smallest nonce where SHA-256(prefix + nonce) ≤ target (bytewise)
//!   3. POST /api/publish with header `X-Publish-Token: {prefix}:{nonce}`

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Duration;

const LRCLIB: &str = "https://lrclib.net";

fn user_agent() -> String {
    format!(
        "Resonix v{} (https://github.com/krishnasidhvi/resonix-audio-player)",
        env!("CARGO_PKG_VERSION")
    )
}

#[derive(Deserialize)]
struct Challenge {
    prefix: String,
    target: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PublishRequest {
    pub track_name: String,
    pub artist_name: String,
    pub album_name: String,
    pub duration: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plain_lyrics: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub synced_lyrics: Option<String>,
}

fn decode_hex(s: &str) -> Result<Vec<u8>, String> {
    if s.len() % 2 != 0 {
        return Err("odd-length hex target".into());
    }
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).map_err(|e| format!("bad hex target: {e}")))
        .collect()
}

/// Bytewise big-endian comparison: is `hash` ≤ `target`?
fn meets_target(hash: &[u8], target: &[u8]) -> bool {
    if hash.len() != target.len() {
        return false;
    }
    for (h, t) in hash.iter().zip(target) {
        if h > t {
            return false;
        }
        if h < t {
            return true;
        }
    }
    true
}

/// Find the nonce for a challenge. Takes a few seconds for LRCLIB's usual difficulty.
pub fn solve_challenge(prefix: &str, target_hex: &str) -> Result<String, String> {
    let target = decode_hex(target_hex)?;
    let mut nonce: u64 = 0;
    loop {
        let hash = Sha256::digest(format!("{prefix}{nonce}").as_bytes());
        if meets_target(&hash, &target) {
            return Ok(nonce.to_string());
        }
        nonce += 1;
        if nonce == u64::from(u32::MAX) {
            return Err("could not solve LRCLIB's challenge".into());
        }
    }
}

fn validate(r: &PublishRequest) -> Result<(), String> {
    if r.track_name.trim().is_empty() || r.artist_name.trim().is_empty() {
        return Err("track and artist names are required".into());
    }
    if !(1.0..=3600.0).contains(&r.duration.round()) {
        return Err("the track duration must be between 1 second and 1 hour".into());
    }
    let has = |o: &Option<String>| o.as_deref().is_some_and(|s| !s.trim().is_empty());
    if !has(&r.synced_lyrics) && !has(&r.plain_lyrics) {
        return Err("there are no lyrics to publish".into());
    }
    Ok(())
}

#[derive(Deserialize)]
struct LrclibError {
    message: Option<String>,
}

/// Publish lyrics to LRCLIB. Called from the web layer with `invoke("lrclib_publish", { request })`.
#[tauri::command]
pub async fn lrclib_publish(request: PublishRequest) -> Result<(), String> {
    validate(&request)?;
    let client = reqwest::Client::builder()
        .user_agent(user_agent())
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let challenge: Challenge = client
        .post(format!("{LRCLIB}/api/request-challenge"))
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| format!("LRCLIB is unreachable: {e}"))?
        .json()
        .await
        .map_err(|e| format!("unexpected challenge from LRCLIB: {e}"))?;

    // CPU-bound: keep it off the async runtime's worker threads
    let (prefix, target) = (challenge.prefix.clone(), challenge.target.clone());
    let nonce = tauri::async_runtime::spawn_blocking(move || solve_challenge(&prefix, &target))
        .await
        .map_err(|e| e.to_string())??;

    let body = PublishRequest { duration: request.duration.round(), ..request };
    let res = client
        .post(format!("{LRCLIB}/api/publish"))
        .header("X-Publish-Token", format!("{}:{}", challenge.prefix, nonce))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("LRCLIB is unreachable: {e}"))?;

    if res.status().is_success() {
        return Ok(());
    }
    let status = res.status();
    let message = res.json::<LrclibError>().await.ok().and_then(|e| e.message);
    Err(match message {
        Some(m) => format!("LRCLIB answered {status}: {m}"),
        None => format!("LRCLIB answered {status}"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_round_trip() {
        assert_eq!(decode_hex("00ff10").unwrap(), vec![0, 255, 16]);
        assert!(decode_hex("abc").is_err());
    }

    #[test]
    fn target_comparison_is_bytewise() {
        assert!(meets_target(&[0, 0, 9], &[0, 1, 0]));
        assert!(meets_target(&[0, 1, 0], &[0, 1, 0])); // equal counts as a solution
        assert!(!meets_target(&[0, 2, 0], &[0, 1, 255]));
        assert!(!meets_target(&[0, 0], &[0, 0, 0]));
    }

    #[test]
    fn solves_an_easy_challenge_and_the_answer_verifies() {
        // first byte must be ≤ 0x0F: about 1 in 16 hashes qualifies
        let target = format!("0F{}", "F".repeat(62));
        let nonce = solve_challenge("RESONIXTEST", &target).unwrap();
        let hash = Sha256::digest(format!("RESONIXTEST{nonce}").as_bytes());
        assert!(hash[0] <= 0x0F);
        // and it is the *first* such nonce
        for n in 0..nonce.parse::<u64>().unwrap() {
            assert!(Sha256::digest(format!("RESONIXTEST{n}").as_bytes())[0] > 0x0F);
        }
    }

    #[test]
    fn validation() {
        let ok = PublishRequest {
            track_name: "Song".into(),
            artist_name: "Artist".into(),
            album_name: "Album".into(),
            duration: 200.4,
            plain_lyrics: None,
            synced_lyrics: Some("[00:01.00]hi".into()),
        };
        assert!(validate(&ok).is_ok());
        assert!(validate(&PublishRequest { duration: 0.2, ..ok.clone() }).is_err());
        assert!(validate(&PublishRequest { synced_lyrics: None, ..ok.clone() }).is_err());
        assert!(validate(&PublishRequest { artist_name: " ".into(), ..ok }).is_err());
    }

    #[test]
    fn request_serialises_like_lrclib_expects() {
        let r = PublishRequest {
            track_name: "T".into(),
            artist_name: "A".into(),
            album_name: "B".into(),
            duration: 120.0,
            plain_lyrics: None,
            synced_lyrics: Some("[00:01.00]x".into()),
        };
        let json = serde_json::to_string(&r).unwrap();
        assert_eq!(json, r#"{"trackName":"T","artistName":"A","albumName":"B","duration":120.0,"syncedLyrics":"[00:01.00]x"}"#);
    }
}
