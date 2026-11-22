//! Download cover art for tracks saved for offline listening.
//!
//! archive.org serves its audio with CORS headers but its images without them, so the web
//! layer can show those covers but can't read them to keep a copy. A native request isn't
//! bound by CORS. To keep this from being a general-purpose fetcher, it only accepts
//! https URLs on archive.org (redirects included) that return an image of at most 8 MB.

use std::time::Duration;

const MAX_BYTES: usize = 8 * 1024 * 1024;

/// Hosts this command may contact: archive.org and its file servers (ia*.us.archive.org, dn*.ca.archive.org).
fn allowed_host(host: &str) -> bool {
    let host = host.to_ascii_lowercase();
    host == "archive.org" || host.ends_with(".archive.org")
}

/// An https URL on an allowed host, without credentials.
fn allowed_url(url: &reqwest::Url) -> bool {
    url.scheme() == "https"
        && url.username().is_empty()
        && url.password().is_none()
        && url.host_str().is_some_and(allowed_host)
}

fn is_image(content_type: &str) -> bool {
    content_type.trim().to_ascii_lowercase().starts_with("image/")
}

/// Fetch a cover image and return its bytes (an ArrayBuffer on the JavaScript side).
#[tauri::command]
pub async fn fetch_cover(url: String) -> Result<tauri::ipc::Response, String> {
    let parsed = reqwest::Url::parse(&url).map_err(|e| format!("bad cover URL: {e}"))?;
    if !allowed_url(&parsed) {
        return Err("covers can only be fetched from archive.org".into());
    }
    let client = reqwest::Client::builder()
        .user_agent(concat!("Resonix/", env!("CARGO_PKG_VERSION")))
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 5 {
                attempt.error("too many redirects")
            } else if allowed_url(attempt.url()) {
                attempt.follow()
            } else {
                attempt.error("cover redirected away from archive.org")
            }
        }))
        .build()
        .map_err(|e| e.to_string())?;

    let mut res = client.get(parsed).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("cover download failed ({})", res.status().as_u16()));
    }
    let content_type = res
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if !is_image(content_type) {
        return Err("not an image".into());
    }
    if res.content_length().is_some_and(|n| n > MAX_BYTES as u64) {
        return Err("cover is too large".into());
    }
    let mut bytes: Vec<u8> = Vec::new();
    while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
        if bytes.len() + chunk.len() > MAX_BYTES {
            return Err("cover is too large".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(tauri::ipc::Response::new(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ok(u: &str) -> bool {
        allowed_url(&reqwest::Url::parse(u).unwrap())
    }

    #[test]
    fn accepts_archive_org_covers() {
        assert!(ok("https://archive.org/services/img/embrace_783"));
        assert!(ok("https://ia600106.us.archive.org/1/items/x/__ia_thumb.jpg"));
        assert!(ok("https://dn720303.ca.archive.org/0/items/x/__ia_thumb.jpg"));
        assert!(ok("https://ARCHIVE.ORG/services/img/x"));
    }

    #[test]
    fn rejects_other_hosts_and_lookalikes() {
        assert!(!ok("https://example.com/cover.jpg"));
        assert!(!ok("https://evilarchive.org/cover.jpg"));
        assert!(!ok("https://archive.org.evil.com/cover.jpg"));
        assert!(!ok("https://localhost/cover.jpg"));
        assert!(!ok("https://127.0.0.1/cover.jpg"));
    }

    #[test]
    fn rejects_plain_http_and_credentials() {
        assert!(!ok("http://archive.org/services/img/x"));
        assert!(!ok("file:///C:/Windows/win.ini"));
        assert!(!ok("https://user:pw@archive.org/services/img/x"));
    }

    #[test]
    fn only_images() {
        assert!(is_image("image/jpeg"));
        assert!(is_image(" Image/PNG; charset=binary"));
        assert!(!is_image("text/html; charset=UTF-8"));
        assert!(!is_image(""));
    }
}
