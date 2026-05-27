import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings, registerShutdownUpdateTask } from '@/lib/tauri'
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
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">Settings</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">Configure everytin to your preferences</p>
      </motion.div>

      <div className="space-y-5">
        {/* AI Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">AI Assistant</h2>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">Configure the AI provider for the assistant</p>
          </div>
          <div className="px-6 py-5 space-y-5">
            {/* Provider Selection */}
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-2">AI Provider</label>
              <div className="flex gap-2">
                {(['gemini', 'claude'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => update('ai_provider', p)}
                    className={cn(
                      'flex-1 py-2.5 px-4 rounded-lg border text-[13px] font-medium transition-all',
                      local.ai_provider === p
                        ? 'bg-accent text-white border-accent'
                        : 'border-border text-[#6B7280] hover:border-accent/50',
                    )}
                  >
                    {p === 'gemini' ? 'Gemini (Google)' : 'Claude (Anthropic)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Gemini API Key */}
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

            {/* Claude API Key */}
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
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Appearance</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-2">Theme</label>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => update('theme', t)}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg border text-[13px] font-medium capitalize transition-all',
                      local.theme === t
                        ? 'bg-accent text-white border-accent'
                        : 'border-border text-[#6B7280] hover:border-accent/50',
                    )}
                  >
                    {t}
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
              label="Start with Windows"
              description="Launch everytin automatically when you sign in"
              value={local.autostart}
              onChange={(v) => update('autostart', v)}
            />
            <ToggleRow
              label="Minimize to system tray"
              description="Keep everytin running in the background when closed"
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
            {saved ? 'Saved!' : mutation.isPending ? 'Saving…' : 'Save Settings'}
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
