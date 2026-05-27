// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Headless mode: run winget updates silently then exit (called by Task Scheduler at logoff)
    if args.iter().any(|a| a == "--run-updates-task") {
        run_shutdown_updates();
        return;
    }

    everytin_lib::run();
}

fn run_shutdown_updates() {
    // Give Task Scheduler some time, then install all winget upgrades silently.
    // This runs without a UI — output goes to nowhere.
    let _ = std::process::Command::new("winget")
        .args(["upgrade", "--all", "--silent", "--accept-source-agreements", "--accept-package-agreements"])
        .output();
}
