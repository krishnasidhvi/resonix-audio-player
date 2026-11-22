//! Resonix desktop shell. It hosts the same web app that runs in the browser.
//! All playback, analysis and storage happen in the web layer (see ../src).
//! Native extras: auto-update, and publishing lyrics to LRCLIB (see lrclib.rs),
//! which browsers can't do because of LRCLIB's CORS policy, and keeping archive.org cover
//! art for offline listening (see cover.rs), which archive.org serves without CORS headers.

mod cover;
mod lrclib;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![lrclib::lrclib_publish, cover::fetch_cover])
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Resonix");
}
