use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

pub const TRAY_ID: &str = "everytin-tray";

pub fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show_hide", "Show / Hide", true, None::<&str>)?;
    let updates_item =
        MenuItem::with_id(app, "open_updates", "Check Updates", true, None::<&str>)?;
    let cleanup_item =
        MenuItem::with_id(app, "open_cleanup", "Run Cleanup", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit everytin", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &show_item,
            &sep1,
            &updates_item,
            &cleanup_item,
            &sep2,
            &quit_item,
        ],
    )?;

    TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .menu_on_left_click(false)
        .tooltip("everytin")
        .icon(app.default_window_icon().unwrap().clone())
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "show_hide" => toggle_window(app),
            "open_updates" => {
                show_window(app);
                app.emit("app://navigate", "/updates").ok();
            }
            "open_cleanup" => {
                show_window(app);
                app.emit("app://navigate", "/cleanup").ok();
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

pub fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            window.hide().ok();
        } else {
            window.show().ok();
            window.set_focus().ok();
        }
    }
}

pub fn show_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        window.show().ok();
        window.set_focus().ok();
    }
}

/// Update the tray tooltip with live CPU/RAM stats (called from metrics loop).
pub fn update_tray_tooltip(app: &tauri::AppHandle, cpu: f32, ram_used: u64, ram_total: u64) {
    let ram_pct = if ram_total > 0 {
        ram_used as f64 / ram_total as f64 * 100.0
    } else {
        0.0
    };
    let tooltip = format!("everytin  —  CPU {cpu:.0}%  RAM {ram_pct:.0}%");
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_tooltip(Some(&tooltip)).ok();
    }
}
