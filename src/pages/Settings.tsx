import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Eye, EyeOff, ExternalLink, Github, Lock, ChevronDown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings, registerShutdownUpdateTask } from '@/lib/tauri'
import { open } from '@tauri-apps/plugin-shell'
import type { AppSettings } from '@/types/settings'
import { cn } from '@/lib/utils'
import { toast } from '@/components/shared/Toast'

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  ai_provider: 'gemini',
  gemini_api_key: '',
  claude_api_key: '',
  autostart: false,
  minimize_to_tray: true,
  update_check_interval_hours: 24,
  language: 'de',
  auto_cleanup_enabled: true,
  auto_cleanup_interval_days: 7,
  auto_update_scan_enabled: true,
  auto_update_scan_interval_hours: 24,
  install_updates_on_shutdown: false,
  notify_on_updates: true,
  notify_on_cleanup: true,
  notify_on_driver_issues: true,
  driver_update_mode: 'notify_only',
  startup_ram_boost: true,
  ollama_url: 'http://localhost:11434',
  ollama_model: 'llama3.2',
}

export default function Settings() {
  const qc = useQueryClient()
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [local, setLocal] = useState<AppSettings>(DEFAULT_SETTINGS)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  useEffect(() => {
    if (data) setLocal(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: (s: AppSettings) => updateSettings(s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const handleSave = () => mutation.mutate(local)

  const handleShutdownToggle = async (enable: boolean) => {
    update('install_updates_on_shutdown', enable)
    try {
      await registerShutdownUpdateTask(enable)
      toast.success(enable ? 'Aufgabe registriert' : 'Aufgabe entfernt')
    } catch {
      toast.error('UAC-Anfrage abgebrochen oder fehlgeschlagen')
      update('install_updates_on_shutdown', !enable)
    }
  }

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#F1F3F5] rounded w-32" />
          <div className="h-48 bg-[#F1F3F5] rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">Einstellungen</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">Passe everytin nach deinen Wünschen an</p>
      </motion.div>

      <div className="space-y-5">
        {/* AI Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">KI-Assistent</h2>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">Wähle deinen KI-Anbieter für den Assistenten</p>
          </div>
          <div className="px-6 py-5 space-y-5">
            {/* Provider Selection */}
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-2">KI-Anbieter</label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { id: 'gemini', label: 'Gemini (Google)' },
                  { id: 'claude', label: 'Claude (Anthropic)' },
                  { id: 'ollama', label: 'Ollama (Lokal – kostenlos)' },
                ] as const).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => update('ai_provider', p.id)}
                    className={cn(
                      'flex-1 py-2.5 px-4 rounded-lg border text-[13px] font-medium transition-all min-w-[120px]',
                      local.ai_provider === p.id
                        ? 'bg-accent text-white border-accent'
                        : 'border-border text-[#6B7280] hover:border-accent/50',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gemini API Key */}
            {local.ai_provider !== 'ollama' && (
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-2">
                Gemini API Key
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-accent text-[11px] inline-flex items-center gap-0.5 hover:underline"
                >
                  Get key <ExternalLink size={10} />
                </a>
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={local.gemini_api_key}
                  onChange={(e) => update('gemini_api_key', e.target.value)}
                  placeholder="AIza…"
                  className="w-full pr-10 pl-4 py-2.5 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all font-mono"
                />
                <button
                  onClick={() => setShowGeminiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  {showGeminiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            )}

            {/* Claude API Key */}
            {local.ai_provider !== 'ollama' && (
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-2">
                Claude API Key
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-accent text-[11px] inline-flex items-center gap-0.5 hover:underline"
                >
                  Get key <ExternalLink size={10} />
                </a>
              </label>
              <div className="relative">
                <input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={local.claude_api_key}
                  onChange={(e) => update('claude_api_key', e.target.value)}
                  placeholder="sk-ant-…"
                  className="w-full pr-10 pl-4 py-2.5 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all font-mono"
                />
                <button
                  onClick={() => setShowClaudeKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  {showClaudeKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            )}

            {/* Ollama Config */}
            {local.ai_provider === 'ollama' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-[12px] text-emerald-800 dark:text-emerald-300">
                  <strong>Kostenlos & lokal</strong> — Ollama läuft auf deinem PC, kein Konto nötig.<br />
                  Installiere Ollama unter <span className="font-mono">https://ollama.com</span> und lade ein Modell: <span className="font-mono">ollama pull llama3.2</span>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-2">Ollama URL</label>
                  <input
                    type="text"
                    value={local.ollama_url}
                    onChange={(e) => update('ollama_url', e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full pl-4 py-2.5 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-2">Modell</label>
                  <input
                    type="text"
                    value={local.ollama_model}
                    onChange={(e) => update('ollama_model', e.target.value)}
                    placeholder="llama3.2"
                    className="w-full pl-4 py-2.5 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all font-mono"
                  />
                  <p className="text-[11px] text-[#9CA3AF] mt-1">z.B. llama3.2, gemma2, mistral, phi3</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Darstellung</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-2">Design</label>
              <div className="flex gap-2">
                {([
                  { value: 'light', label: 'Hell' },
                  { value: 'dark', label: 'Dunkel' },
                  { value: 'system', label: 'System' },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => update('theme', value)}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg border text-[13px] font-medium transition-all',
                      local.theme === value
                        ? 'bg-accent text-white border-accent'
                        : 'border-border text-[#6B7280] hover:border-accent/50',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* System */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">System</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <ToggleRow
              label="Mit Windows starten"
              description="everytin automatisch beim Anmelden starten"
              value={local.autostart}
              onChange={(v) => update('autostart', v)}
            />
            <ToggleRow
              label="Im Tray minimieren"
              description="everytin läuft im Hintergrund weiter, wenn das Fenster geschlossen wird"
              value={local.minimize_to_tray}
              onChange={(v) => update('minimize_to_tray', v)}
            />
          </div>
        </motion.div>

        {/* Automation */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Automatisierung</h2>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">Steuere, was everytin automatisch im Hintergrund tut</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <ToggleRow
              label="Updates beim Herunterfahren installieren"
              description="Winget-Updates werden automatisch beim Abmelden via Task Scheduler installiert (UAC erforderlich)"
              value={local.install_updates_on_shutdown}
              onChange={handleShutdownToggle}
            />
            <ToggleRow
              label="Automatisches Cleanup"
              description="Temporäre Dateien regelmäßig bereinigen"
              value={local.auto_cleanup_enabled}
              onChange={(v) => update('auto_cleanup_enabled', v)}
            />
            <ToggleRow
              label="RAM-Boost beim Start"
              description="Arbeitsspeicher beim Programmstart optimieren"
              value={local.startup_ram_boost}
              onChange={(v) => update('startup_ram_boost', v)}
            />
            <ToggleRow
              label="Update-Suche"
              description="Automatisch nach App-Updates suchen"
              value={local.auto_update_scan_enabled}
              onChange={(v) => update('auto_update_scan_enabled', v)}
            />
            <ToggleRow
              label="Benachrichtigungen: Updates"
              description="Melde, wenn neue Updates verfügbar sind"
              value={local.notify_on_updates}
              onChange={(v) => update('notify_on_updates', v)}
            />
            <ToggleRow
              label="Benachrichtigungen: Cleanup"
              description="Melde, wenn Cleanup abgeschlossen ist"
              value={local.notify_on_cleanup}
              onChange={(v) => update('notify_on_cleanup', v)}
            />
            <ToggleRow
              label="Benachrichtigungen: Treiber"
              description="Warnung bei veralteten oder unsignierten Treibern"
              value={local.notify_on_driver_issues}
              onChange={(v) => update('notify_on_driver_issues', v)}
            />
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-2">Treiber-Update-Modus</label>
              <select
                value={local.driver_update_mode}
                onChange={(e) => update('driver_update_mode', e.target.value as 'notify_only' | 'auto_install_signed_only')}
                className="w-full px-3 py-2.5 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              >
                <option value="notify_only">Nur benachrichtigen</option>
                <option value="auto_install_signed_only">Signierte Updates automatisch installieren</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Über everytin */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Über everytin</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            {/* Logo + Version */}
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="everytin" className="w-10 h-10 rounded-xl shadow-sm" />
              <div>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">everytin</p>
                <p className="text-[12px] text-[#9CA3AF]">Version 0.1.0 · MIT License</p>
              </div>
            </div>

            {/* Privacy Statement */}
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <Lock size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-emerald-800">
                <strong>Datenschutz:</strong> everytin sendet keine Daten ins Internet.
                Alle Informationen bleiben lokal auf deinem Gerät gespeichert.
                API-Schlüssel werden ausschließlich für direkte Anfragen an die jeweiligen KI-Anbieter verwendet.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-2">
              <button
                onClick={() => open('https://github.com/leodev/everytin').catch(() => null)}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#6B7280] border border-border rounded-lg hover:bg-surface-2 hover:text-[#1A1A1A] transition-colors"
              >
                <Github size={13} /> GitHub
              </button>
              <button
                onClick={() => open('https://github.com/leodev/everytin/blob/main/LICENSE').catch(() => null)}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#6B7280] border border-border rounded-lg hover:bg-surface-2 hover:text-[#1A1A1A] transition-colors"
              >
                <ExternalLink size={13} /> Lizenz anzeigen
              </button>
            </div>

            {/* Open Source Dependencies */}
            <details className="group">
              <summary className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] cursor-pointer hover:text-[#1A1A1A] transition-colors list-none select-none">
                <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
                Open-Source-Abhängigkeiten
              </summary>
              <ul className="mt-2 space-y-1 pl-5">
                {[
                  ['React 19', 'MIT'],
                  ['Tauri v2', 'MIT / Apache-2.0'],
                  ['Tailwind CSS', 'MIT'],
                  ['Framer Motion', 'MIT'],
                  ['TanStack Query', 'MIT'],
                  ['Recharts', 'MIT'],
                  ['Lucide React', 'ISC'],
                  ['sysinfo (Rust)', 'MIT'],
                  ['rusqlite (Rust)', 'MIT'],
                  ['tokio (Rust)', 'MIT'],
                  ['winapi (Rust)', 'MIT'],
                ].map(([lib, lic]) => (
                  <li key={lib} className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                    <span>{lib}</span>
                    <span className="text-[10px] font-semibold text-[#D1D5DB] bg-[#F1F3F5] px-1.5 py-0.5 rounded">{lic}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </motion.div>

        {/* Save button */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex justify-end"
        >
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all',
              saved
                ? 'bg-success text-white'
                : 'bg-accent text-white hover:bg-accent-600',
              mutation.isPending && 'opacity-70',
            )}
          >
            <Save size={15} />
            {saved ? 'Gespeichert!' : mutation.isPending ? 'Speichere…' : 'Einstellungen speichern'}
          </button>
        </motion.div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#1A1A1A]">{label}</p>
        <p className="text-[12px] text-[#9CA3AF] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
          value ? 'bg-accent' : 'bg-[#E5E7EB]',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition duration-200',
            value ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}
