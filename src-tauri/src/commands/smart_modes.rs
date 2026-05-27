use crate::error::AppResult;
use serde::Serialize;

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ModeId {
    Work,
    Gaming,
    Study,
    Night,
    Idle,
}

#[derive(Serialize, Clone, Debug)]
pub struct DetectedMode {
    pub mode: ModeId,
    pub confidence: f32,
    pub reason: String,
}

/// Detect the current PC mode based on active foreground window + time of day.
#[tauri::command]
pub async fn get_current_mode() -> AppResult<DetectedMode> {
    detect_mode()
}

fn detect_mode() -> AppResult<DetectedMode> {
    #[cfg(target_os = "windows")]
    {
        use chrono::Timelike;
        let hour = chrono::Local::now().hour();

        // Night: 22:00 – 06:00
        if hour >= 22 || hour < 6 {
            return Ok(DetectedMode {
                mode: ModeId::Night,
                confidence: 0.95,
                reason: format!("Uhrzeit {}:00 — Nacht erkannt", hour),
            });
        }

        // Check foreground window title for process context
        let title = get_foreground_title().unwrap_or_default().to_lowercase();

        // Gaming keywords
        let gaming_hints = ["steam", "game", "battle.net", "epic games", "origin", "valorant",
                            "league of legends", "minecraft", "fortnite", "roblox", "gta",
                            "pubg", "overwatch", "counter-strike", "cs2"];
        if gaming_hints.iter().any(|k| title.contains(k)) {
            return Ok(DetectedMode {
                mode: ModeId::Gaming,
                confidence: 0.90,
                reason: format!("Spielfenster erkannt: '{}'", truncate(&title, 40)),
            });
        }

        // Work keywords
        let work_hints = ["visual studio", "vscode", "code", "intellij", "figma", "photoshop",
                          "teams", "outlook", "slack", "notion", "excel", "word", "powerpoint",
                          "zoom", "webex", "terminal", "powershell", "cmd"];
        if work_hints.iter().any(|k| title.contains(k)) {
            return Ok(DetectedMode {
                mode: ModeId::Work,
                confidence: 0.85,
                reason: format!("Arbeits-App erkannt: '{}'", truncate(&title, 40)),
            });
        }

        // Study keywords
        let study_hints = ["anki", "notion", "obsidian", "logseq", "evernote",
                           "studocu", "wikipedia", "lecture", "coursera", "udemy"];
        if study_hints.iter().any(|k| title.contains(k)) {
            return Ok(DetectedMode {
                mode: ModeId::Study,
                confidence: 0.80,
                reason: format!("Lernumgebung erkannt: '{}'", truncate(&title, 40)),
            });
        }

        Ok(DetectedMode {
            mode: ModeId::Idle,
            confidence: 0.60,
            reason: "Kein spezifischer Kontext erkannt".to_string(),
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(DetectedMode {
            mode: ModeId::Idle,
            confidence: 1.0,
            reason: "Nicht-Windows-System".to_string(),
        })
    }
}

#[cfg(target_os = "windows")]
fn get_foreground_title() -> Option<String> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

    unsafe {
        let hwnd = winapi::um::winuser::GetForegroundWindow();
        if hwnd.is_null() {
            return None;
        }
        let mut buf = vec![0u16; 256];
        let len = winapi::um::winuser::GetWindowTextW(hwnd, buf.as_mut_ptr(), 256);
        if len == 0 {
            return None;
        }
        buf.truncate(len as usize);
        Some(OsString::from_wide(&buf).to_string_lossy().into_owned())
    }
}

fn truncate(s: &str, max: usize) -> &str {
    if s.len() <= max { s } else { &s[..max] }
}
