<div align="center">

<img src="public/logo.jpg" width="96" height="96" style="border-radius:20px" alt="everytin logo" />

<h1>everytin</h1>

<p><strong>Dein autonomer Windows-Assistent — alles, was dein PC braucht, an einem Ort.</strong></p>

[![Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-red?style=for-the-badge&logo=github)](https://github.com/Liveplay01/everytin/releases)
[![Version](https://img.shields.io/badge/version-0.1.0-blueviolet?style=for-the-badge)](https://github.com/Liveplay01/everytin/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078D4?style=for-the-badge&logo=windows)](https://github.com/Liveplay01/everytin)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%20v2-FFC131?style=for-the-badge&logo=tauri)](https://tauri.app)

</div>

---

> [!WARNING]
> **⚠️ Pre-Alpha Software** — everytin befindet sich in aktiver Entwicklung. Features können sich jederzeit ändern, Bugs sind zu erwarten. Nicht für den produktiven Einsatz auf kritischen Systemen empfohlen. Nutzung auf eigene Verantwortung.

---

## Was ist everytin?

everytin ist ein **schlanker, autonomer Windows-Desktop-Assistent**, der alles vereint, was du für einen gepflegten und optimierten PC brauchst — in einer einzigen, modernen App.

Statt zehn verschiedener Tools öffnest du einfach everytin: Updates prüfen, Treiber aktualisieren, Speicher bereinigen, Dienste verwalten, die Systemleistung im Blick behalten — und dabei den integrierten **KI-Assistenten** fragen, was auch immer du über deinen PC wissen möchtest.

---

## ✨ Features

| Feature | Beschreibung |
|---|---|
| 🖥️ **Dashboard** | Live-Systemübersicht mit CPU, RAM, Disk, Uptime, System Score und Activity Feed |
| ⚡ **Performance** | Echtzeit-Monitoring von CPU & RAM, Prozessliste mit Kill-Option, Temperaturen |
| 🧹 **Cleanup & Boost** | Temporäre Dateien bereinigen, RAM-Boost, detaillierte Kategorie-Auswahl |
| 🔄 **Updates** | Windows Update & Winget App-Updates in einer Übersicht, 1-Klick-Installation |
| 🤖 **KI-Assistent** | Vollständiger Streaming-Chat mit Gemini (Google) oder Claude (Anthropic) |
| 🖥️ **Treiber** | Alle installierten Treiber mit Alter & Signaturstatus, Updates via Windows Update API |
| 📦 **App Installer** | Tausende Apps per Winget suchen und installieren |
| ⚙️ **Dienste** | Windows-Dienste durchsuchen, starten, stoppen, Starttyp ändern |
| 🔒 **Sicherheit** | Security Score, Firewall-Status, Windows Defender, UAC-Einstellungen |
| ⚡ **Automation** | Hintergrund-Regeln für automatisches Cleanup, Updates, RAM-Boost & Treiber-Scans |
| 🔋 **Akku & Energie** | Akkugesundheit, Ladezyklen, verbleibende Kapazität (Laptop) |
| 🔔 **System Tray** | Läuft im Hintergrund, zeigt Live CPU/RAM im Tooltip, Benachrichtigungen |

---

## 🚀 Installation

### Voraussetzungen

- **Windows 10** (Version 1903+) oder **Windows 11**
- **Winget** (vorinstalliert ab Windows 11 / über Microsoft Store für Win 10)
- Für Treiber-Updates: Windows Update muss aktiviert sein

### Option A — Installer herunterladen (empfohlen)

1. Gehe zu [**Releases**](https://github.com/Liveplay01/everytin/releases)
2. Lade die neueste `everytin_x.x.x_x64-setup.exe` herunter
3. Führe die Setup-Datei aus
4. Beim ersten Start erscheint der **Setup-Wizard** — Sprache wählen, fertig

> **Hinweis:** Windows SmartScreen kann beim ersten Ausführen eine Warnung anzeigen, da die App noch kein Code-Signing-Zertifikat hat. Klicke auf „Weitere Informationen" → „Trotzdem ausführen".

---

### Option B — Aus dem Quellcode bauen

#### 1. Voraussetzungen installieren

```bash
# Node.js 20+ (https://nodejs.org)
node --version

# Rust (https://rustup.rs)
rustup --version

# Visual Studio Build Tools 2022
# → https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Workload: "Desktop development with C++"
```

#### 2. Repository klonen

```bash
git clone https://github.com/Liveplay01/everytin.git
cd everytin
```

#### 3. Abhängigkeiten installieren

```bash
npm install
```

#### 4. Entwicklungsserver starten

```bash
npm run tauri dev
```

#### 5. Release-Build erstellen

```bash
npm run tauri build
```

Der fertige Installer liegt danach unter:
```
src-tauri/target/release/bundle/nsis/everytin_0.1.0_x64-setup.exe
```

---

## 🎬 Erster Start

Beim ersten Start führt dich everytin durch einen kurzen **Setup-Wizard**:

1. **Sprache wählen** — Deutsch oder English
2. **Features kennenlernen** — Übersicht aller Funktionen
3. **Schnellstart** — Autostart & Tray-Einstellung konfigurieren
4. **Los geht's!** — direkt zum Dashboard

Den Wizard kannst du jederzeit mit dem **×** oben rechts überspringen.

---

## 🤖 KI-Assistent einrichten

everytin unterstützt zwei KI-Anbieter. Du brauchst einen API-Schlüssel von einem der beiden:

| Anbieter | Modell | API Key holen |
|---|---|---|
| **Google Gemini** | Gemini 2.0 Flash | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| **Anthropic Claude** | Claude 3.5 Sonnet | [console.anthropic.com](https://console.anthropic.com/) |

Den Schlüssel trägst du unter **Einstellungen → KI-Assistent** ein.

> 🔒 API-Schlüssel werden ausschließlich lokal gespeichert und nur für direkte Anfragen an den jeweiligen Anbieter verwendet. Es findet keine Telemetrie oder Weitergabe statt.

---

## 🏗️ Tech Stack

```
Frontend          Backend (Rust)
──────────────    ──────────────────────────────
React 19          Tauri v2
TypeScript        sysinfo  (System-Metriken)
Tailwind CSS      rusqlite (SQLite-Datenbank)
Framer Motion     winapi   (Windows-API)
TanStack Query    tokio    (Async Runtime)
Recharts          tauri-plugin-notification
Lucide React      tauri-plugin-shell
                  tauri-plugin-autostart
```

---

## 📁 Projektstruktur

```
everytin/
├── src/                    # React Frontend
│   ├── pages/              # Alle Seiten (Dashboard, Treiber, Updates…)
│   ├── components/         # Wiederverwendbare UI-Komponenten
│   ├── hooks/              # Custom React Hooks
│   ├── lib/                # Tauri-Wrapper, Utilities
│   └── types/              # TypeScript-Typdefinitionen
├── src-tauri/              # Rust Backend
│   ├── src/
│   │   ├── commands/       # Tauri-Commands (cleanup, drivers, updates…)
│   │   ├── db/             # SQLite-Migrationen
│   │   ├── automation.rs   # Hintergrund-Loop
│   │   ├── tray.rs         # System Tray
│   │   └── notifications.rs
│   └── tauri.conf.json
└── public/                 # Statische Assets
```

---

## ⚠️ Bekannte Einschränkungen (Pre-Alpha)

- **Treiber-Updates via Windows Update** können je nach System-Konfiguration 30–60s dauern
- **Shutdown-Updates** (Task Scheduler) erfordern einen einmaligen UAC-Prompt
- **Battery-Page** erscheint nur auf Geräten mit erkanntem Akku
- **KI-Assistent** erfordert einen externen API-Schlüssel — keine eigene KI ist eingebettet
- Das **Code-Signing-Zertifikat** fehlt noch → SmartScreen-Warnung bei Installation

---

## 🤝 Beitragen

Pull Requests sind willkommen! Für größere Änderungen bitte zuerst ein Issue öffnen.

```bash
# Fork → Clone → Branch erstellen
git checkout -b feature/mein-feature

# Änderungen committen
git commit -m "feat: mein neues Feature"

# Push & Pull Request öffnen
git push origin feature/mein-feature
```

---

## 📄 Lizenz

MIT License — © 2025 Leo. Siehe [LICENSE](LICENSE) für Details.

---

<div align="center">

Made with ❤️ and Tauri · Windows only · Pre-Alpha

</div>
