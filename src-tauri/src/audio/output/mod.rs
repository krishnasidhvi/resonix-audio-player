pub mod windows;
pub mod android;
pub mod macos;
pub mod linux;

use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub is_usb_dac: bool,
    pub supports_exclusive_mode: bool,
    pub max_sample_rate: u32,
    pub supported_formats: Vec<String>,
}

pub trait AudioOutputStream {
    fn start(&mut self) -> Result<(), anyhow::Error>;
    fn pause(&mut self) -> Result<(), anyhow::Error>;
    fn stop(&mut self) -> Result<(), anyhow::Error>;
}
