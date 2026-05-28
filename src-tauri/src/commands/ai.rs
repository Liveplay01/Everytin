// Phase 2 – AI assistant (Gemini / Claude)
use crate::error::{AppError, AppResult};
use crate::state::AppState;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct AiSystemContext {
    pub hostname: String,
    pub os_version: String,
    pub cpu_usage: f32,
    pub ram_used_gb: f32,
    pub ram_total_gb: f32,
    pub uptime_hours: u64,
    pub disk_free_gb: f32,
}

#[tauri::command]
pub async fn get_system_context(
    state: tauri::State<'_, AppState>,
) -> AppResult<AiSystemContext> {
    let snap = super::system::get_system_snapshot(state).await?;
    Ok(AiSystemContext {
        hostname: snap.hostname,
        os_version: snap.os_version,
        cpu_usage: snap.cpu_usage,
        ram_used_gb: snap.ram_used as f32 / 1024.0 / 1024.0 / 1024.0,
        ram_total_gb: snap.ram_total as f32 / 1024.0 / 1024.0 / 1024.0,
        uptime_hours: snap.uptime / 3600,
        disk_free_gb: (snap.disk_total - snap.disk_used) as f32 / 1024.0 / 1024.0 / 1024.0,
    })
}

#[tauri::command]
pub async fn send_message(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    message: String,
    history: Vec<AiMessage>,
    api_key: String,
    provider: String,
) -> AppResult<String> {
    use tauri::Emitter;

    let is_ollama = provider == "ollama";

    if !is_ollama && api_key.trim().is_empty() {
        return Err(AppError::System("Kein API-Key konfiguriert. Gehe zu Einstellungen und füge einen Gemini- oder Claude-API-Key hinzu.".to_string()));
    }

    // For Ollama: read URL + model from settings
    let (ollama_url, ollama_model) = if is_ollama {
        let settings = {
            let db = state.db.lock().map_err(|e| AppError::System(e.to_string()))?;
            let row: Option<String> = db
                .query_row("SELECT value FROM settings WHERE key = 'app_settings'", [], |r| r.get(0))
                .ok();
            row.and_then(|j| serde_json::from_str::<super::settings::AppSettings>(&j).ok())
                .unwrap_or_default()
        };
        (settings.ollama_url, settings.ollama_model)
    } else {
        (String::new(), String::new())
    };

    let ctx = get_system_context(state).await?;
    let stream_id = uuid::Uuid::new_v4().to_string();
    let sid = stream_id.clone();

    tauri::async_runtime::spawn(async move {
        let result = match provider.as_str() {
            "claude" => call_claude_api(&app, &sid, &api_key, &ctx, &history, &message).await,
            "ollama" => call_ollama_api(&app, &sid, &ollama_url, &ollama_model, &ctx, &history, &message).await,
            _ => call_gemini_api(&app, &sid, &api_key, &ctx, &history, &message).await,
        };
        if let Err(e) = result {
            app.emit("ai://stream-error", serde_json::json!({ "stream_id": sid, "error": e.to_string() })).ok();
        }
    });

    Ok(stream_id)
}

async fn call_ollama_api(
    app: &tauri::AppHandle,
    stream_id: &str,
    ollama_url: &str,
    ollama_model: &str,
    ctx: &AiSystemContext,
    history: &[AiMessage],
    message: &str,
) -> AppResult<()> {
    use tauri::Emitter;

    let system_prompt = build_system_prompt(ctx).await;
    let client = reqwest::Client::new();

    let mut messages: Vec<serde_json::Value> = vec![
        serde_json::json!({"role": "system", "content": system_prompt}),
    ];
    for msg in history {
        messages.push(serde_json::json!({"role": msg.role, "content": msg.content}));
    }
    messages.push(serde_json::json!({"role": "user", "content": message}));

    let body = serde_json::json!({
        "model": ollama_model,
        "messages": messages,
        "stream": true,
    });

    let url = format!("{}/api/chat", ollama_url.trim_end_matches('/'));

    let mut response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::System(format!("Ollama nicht erreichbar: {e}. Ist Ollama installiert und läuft?")))?;

    let mut full_text = String::new();

    while let Some(chunk) = response.chunk().await.map_err(|e| AppError::System(e.to_string()))? {
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() { continue; }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(delta) = json["message"]["content"].as_str() {
                    if !delta.is_empty() {
                        full_text.push_str(delta);
                        app.emit("ai://stream-chunk", serde_json::json!({
                            "stream_id": stream_id,
                            "delta": delta,
                        })).ok();
                    }
                }
                if json["done"].as_bool().unwrap_or(false) { break; }
            }
        }
    }

    app.emit("ai://stream-done", serde_json::json!({ "stream_id": stream_id, "full_text": full_text })).ok();
    Ok(())
}

async fn build_system_prompt(ctx: &AiSystemContext) -> String {
    format!(
        "You are everytin, an intelligent Windows system assistant. \
        Current system state: Host={}, OS={}, CPU={:.1}%, RAM={:.1}/{:.1}GB, \
        Disk free={:.1}GB, Uptime={}h. \
        Help the user with system-related tasks. When proposing an action, \
        include a JSON action block like {{\"action\": \"install_package\", \"params\": {{\"id\": \"...\"}}}}.
        Respond in the same language the user writes in.",
        ctx.hostname,
        ctx.os_version,
        ctx.cpu_usage,
        ctx.ram_used_gb,
        ctx.ram_total_gb,
        ctx.disk_free_gb,
        ctx.uptime_hours,
    )
}

async fn call_gemini_api(
    app: &tauri::AppHandle,
    stream_id: &str,
    api_key: &str,
    ctx: &AiSystemContext,
    history: &[AiMessage],
    message: &str,
) -> AppResult<()> {
    use tauri::Emitter;

    let system_prompt = build_system_prompt(ctx).await;
    let client = reqwest::Client::new();

    let mut contents: Vec<serde_json::Value> = vec![
        serde_json::json!({"role": "user", "parts": [{"text": system_prompt}]}),
        serde_json::json!({"role": "model", "parts": [{"text": "Understood. I'm ready to help you manage your Windows system."}]}),
    ];

    for msg in history {
        let role = if msg.role == "assistant" { "model" } else { "user" };
        contents.push(serde_json::json!({"role": role, "parts": [{"text": msg.content}]}));
    }
    contents.push(serde_json::json!({"role": "user", "parts": [{"text": message}]}));

    let body = serde_json::json!({
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
        }
    });

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key={}",
        api_key
    );

    let mut response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::System(format!("Gemini API error: {e}")))?;

    let mut full_text = String::new();

    while let Some(chunk) = response.chunk().await.map_err(|e| AppError::System(e.to_string()))? {
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            if let Some(data) = line.strip_prefix("data: ") {
                if data.trim() == "[DONE]" { break; }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(delta) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                        full_text.push_str(delta);
                        app.emit("ai://stream-chunk", serde_json::json!({
                            "stream_id": stream_id,
                            "delta": delta
                        })).ok();
                    }
                }
            }
        }
    }

    app.emit("ai://stream-done", serde_json::json!({ "stream_id": stream_id, "full_text": full_text })).ok();
    Ok(())
}

async fn call_claude_api(
    app: &tauri::AppHandle,
    stream_id: &str,
    api_key: &str,
    ctx: &AiSystemContext,
    history: &[AiMessage],
    message: &str,
) -> AppResult<()> {
    use tauri::Emitter;

    let system_prompt = build_system_prompt(ctx).await;
    let client = reqwest::Client::new();

    let mut messages: Vec<serde_json::Value> = history
        .iter()
        .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
        .collect();
    messages.push(serde_json::json!({"role": "user", "content": message}));

    let body = serde_json::json!({
        "model": "claude-sonnet-4-6",
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": messages,
        "stream": true
    });

    let mut response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::System(format!("Claude API error: {e}")))?;

    let mut full_text = String::new();

    while let Some(chunk) = response.chunk().await.map_err(|e| AppError::System(e.to_string()))? {
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            if let Some(data) = line.strip_prefix("data: ") {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if json["type"] == "content_block_delta" {
                        if let Some(delta) = json["delta"]["text"].as_str() {
                            full_text.push_str(delta);
                            app.emit("ai://stream-chunk", serde_json::json!({
                                "stream_id": stream_id,
                                "delta": delta
                            })).ok();
                        }
                    }
                }
            }
        }
    }

    app.emit("ai://stream-done", serde_json::json!({ "stream_id": stream_id, "full_text": full_text })).ok();
    Ok(())
}
