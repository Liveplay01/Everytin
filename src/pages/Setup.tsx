import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, CheckCircle, X,
  Activity, Sparkles, RefreshCw, Bot, Shield, Cpu, Zap, Download,
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { getSettings, updateSettings } from '@/lib/tauri'
import { cn } from '@/lib/utils'

type Lang = 'de' | 'en'

const T = {
  de: {
    step0Title: 'Wähle deine Sprache',
    step0Sub: 'Du kannst die Sprache jederzeit in den Einstellungen ändern.',
    step1Title: 'Willkommen bei everytin',
    step1Sub: 'Dein autonomer Windows-Assistent — alles, was dein PC braucht, an einem Ort.',
    step2Title: 'Was kann everytin?',
    step2Sub: 'Alle wichtigen Windows-Funktionen, intelligent vereint.',
    step3Title: 'Schnellstart',
    step3Sub: 'Diese Einstellungen kannst du jederzeit ändern.',
    autostart: 'Mit Windows starten',
    autostartDesc: 'everytin automatisch beim Anmelden starten',
    tray: 'Im Tray minimieren',
    trayDesc: 'Fenster schließen lässt everytin im Hintergrund weiterlaufen',
    finish: 'Los geht\'s!',
    next: 'Weiter',
    back: 'Zurück',
    features: [
      { icon: Activity,     title: 'Performance',     desc: 'CPU, RAM & Prozesse in Echtzeit überwachen' },
      { icon: Sparkles,     title: 'Cleanup & Boost', desc: 'Speicherplatz freigeben, RAM optimieren' },
      { icon: RefreshCw,    title: 'Updates',         desc: 'Windows- & App-Updates automatisch verwalten' },
      { icon: Bot,          title: 'KI-Assistent',    desc: 'Fragen stellen, Software per Sprache installieren' },
      { icon: Shield,       title: 'Sicherheit',      desc: 'Firewall, Security-Score & Bedrohungen' },
      { icon: Cpu,          title: 'Treiber',         desc: 'Treiber prüfen & via Windows Update aktualisieren' },
      { icon: Zap,          title: 'Automation',      desc: 'Hintergrund-Aufgaben automatisch ausführen' },
      { icon: Download,     title: 'App Installer',   desc: 'Tausende Apps per Klick installieren (Winget)' },
    ],
  },
  en: {
    step0Title: 'Choose your language',
    step0Sub: 'You can change the language at any time in settings.',
    step1Title: 'Welcome to everytin',
    step1Sub: 'Your autonomous Windows assistant — everything your PC needs, in one place.',
    step2Title: 'What can everytin do?',
    step2Sub: 'All important Windows features, intelligently unified.',
    step3Title: 'Quick setup',
    step3Sub: 'You can change these settings at any time.',
    autostart: 'Start with Windows',
    autostartDesc: 'Launch everytin automatically when you sign in',
    tray: 'Minimize to tray',
    trayDesc: 'Closing the window keeps everytin running in the background',
    finish: 'Get started!',
    next: 'Next',
    back: 'Back',
    features: [
      { icon: Activity,     title: 'Performance',     desc: 'Monitor CPU, RAM & processes in real-time' },
      { icon: Sparkles,     title: 'Cleanup & Boost', desc: 'Free up storage, optimize RAM' },
      { icon: RefreshCw,    title: 'Updates',         desc: 'Automatically manage Windows & app updates' },
      { icon: Bot,          title: 'AI Assistant',    desc: 'Ask questions, install software by voice' },
      { icon: Shield,       title: 'Security',        desc: 'Firewall, security score & threats' },
      { icon: Cpu,          title: 'Drivers',         desc: 'Check & update drivers via Windows Update' },
      { icon: Zap,          title: 'Automation',      desc: 'Run background tasks automatically' },
      { icon: Download,     title: 'App Installer',   desc: 'Install thousands of apps in one click (Winget)' },
    ],
  },
}

const FEATURE_COLORS = [
  'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-500',
  'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-500',
  'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-500',
  'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-500',
  'from-red-500/20 to-red-500/5 border-red-500/20 text-red-500',
  'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-500',
  'from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-500',
  'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-500',
]

const STEPS = 4

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
  }),
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        value ? 'bg-accent' : 'bg-white/20',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition duration-200',
          value ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export default function Setup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [lang, setLang] = useState<Lang>('de')
  const [autostart, setAutostart] = useState(false)
  const [minimizeToTray, setMinimizeToTray] = useState(true)

  const t = T[lang]

  function skip() {
    localStorage.setItem('everytin_setup_complete', '1')
    navigate('/dashboard', { replace: true })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settings = await getSettings()
      return updateSettings({
        ...settings,
        language: lang,
        autostart,
        minimize_to_tray: minimizeToTray,
      })
    },
    onSettled: () => {
      localStorage.setItem('everytin_setup_complete', '1')
      navigate('/dashboard', { replace: true })
    },
  })

  function go(next: number) {
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  function finish() {
    localStorage.setItem('everytin_setup_complete', '1')
    saveMutation.mutate()
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#0B0A12]">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/20 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[780px] mx-4 bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Top bar: logo + step dots + skip */}
        <div className="flex items-center justify-between px-8 pt-7 pb-0">
          <div className="flex items-center gap-2.5">
            <motion.img
              src="/logo.jpg"
              alt="everytin"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
              className="w-7 h-7 rounded-xl shadow-lg"
            />
            <span className="text-[15px] font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
              everytin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: STEPS }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    width: i === step ? 20 : 6,
                    backgroundColor: i < step ? '#22c55e' : i === step ? '#6366f1' : 'rgba(255,255,255,0.2)',
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-1.5 rounded-full"
                />
              ))}
            </div>
            <button
              onClick={skip}
              title="Überspringen"
              className="w-6 h-6 flex items-center justify-center rounded-md text-white/25 hover:text-white/60 hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-8 min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col"
            >
              {/* ── Step 0: Language ── */}
              {step === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="text-[28px] font-extrabold text-white mb-2 tracking-tight"
                  >
                    {t.step0Title}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-[13px] text-white/50 mb-10"
                  >
                    {t.step0Sub}
                  </motion.p>
                  <div className="flex gap-5">
                    {([
                      { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
                      { code: 'en', flag: '🇺🇸', name: 'English' },
                    ] as const).map(({ code, flag, name }, i) => (
                      <motion.button
                        key={code}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.06 }}
                        onClick={() => { setLang(code); go(1) }}
                        className={cn(
                          'flex flex-col items-center gap-3 px-12 py-7 rounded-2xl border-2 transition-all duration-200 hover:scale-105 active:scale-95',
                          lang === code
                            ? 'border-accent bg-accent/15 shadow-[0_0_24px_rgba(99,102,241,0.3)]'
                            : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8',
                        )}
                      >
                        <span className="text-5xl">{flag}</span>
                        <span className="text-[14px] font-semibold text-white">{name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 1: Welcome ── */}
              {step === 1 && (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.04, type: 'spring', stiffness: 280, damping: 20 }}
                    className="w-20 h-20 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(99,102,241,0.4)] mb-6 border border-white/10"
                  >
                    <img src="/logo.jpg" alt="everytin" className="w-full h-full object-cover" />
                  </motion.div>
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="text-[32px] font-extrabold tracking-tight leading-tight mb-3"
                  >
                    <span className="text-white">{lang === 'de' ? 'Willkommen bei ' : 'Welcome to '}</span>
                    <span className="bg-gradient-to-r from-accent to-violet-400 bg-clip-text text-transparent">everytin</span>
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.12 }}
                    className="text-[14px] text-white/55 max-w-[480px] leading-relaxed mb-10"
                  >
                    {t.step1Sub}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    className="flex flex-wrap justify-center gap-2"
                  >
                    {(['Treiber', 'Updates', 'KI-Assistent', 'Cleanup', 'Performance', 'Sicherheit', 'Automation'].map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-[11px] font-semibold text-white/50 bg-white/5 border border-white/10 rounded-full"
                      >
                        {tag}
                      </span>
                    )))}
                  </motion.div>
                </div>
              )}

              {/* ── Step 2: Features ── */}
              {step === 2 && (
                <div className="flex-1 flex flex-col">
                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[22px] font-extrabold text-white mb-1 tracking-tight"
                  >
                    {t.step2Title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.06 }}
                    className="text-[12px] text-white/45 mb-6"
                  >
                    {t.step2Sub}
                  </motion.p>
                  <div className="grid grid-cols-4 gap-2.5">
                    {t.features.map(({ icon: Icon, title, desc }, i) => (
                      <motion.div
                        key={title}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 + i * 0.04 }}
                        className={cn(
                          'flex flex-col gap-2 p-3.5 rounded-xl border bg-gradient-to-br',
                          FEATURE_COLORS[i],
                        )}
                      >
                        <Icon size={16} />
                        <div>
                          <p className="text-[12px] font-bold text-white">{title}</p>
                          <p className="text-[10.5px] text-white/50 leading-tight mt-0.5">{desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 3: Settings + Finish ── */}
              {step === 3 && (
                <div className="flex flex-col flex-1">
                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[22px] font-extrabold text-white mb-1 tracking-tight"
                  >
                    {t.step3Title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.06 }}
                    className="text-[12px] text-white/45 mb-8"
                  >
                    {t.step3Sub}
                  </motion.p>

                  <div className="space-y-3 mb-8">
                    {[
                      {
                        label: t.autostart,
                        desc: t.autostartDesc,
                        value: autostart,
                        onChange: setAutostart,
                        delay: 0.08,
                      },
                      {
                        label: t.tray,
                        desc: t.trayDesc,
                        value: minimizeToTray,
                        onChange: setMinimizeToTray,
                        delay: 0.13,
                      },
                    ].map(({ label, desc, value, onChange, delay }) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay }}
                        className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div>
                          <p className="text-[13px] font-semibold text-white">{label}</p>
                          <p className="text-[11px] text-white/45 mt-0.5">{desc}</p>
                        </div>
                        <ToggleSwitch value={value} onChange={onChange} />
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    className="mt-auto"
                  >
                    <button
                      onClick={finish}
                      disabled={saveMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-accent to-violet-500 text-white text-[14px] font-bold shadow-[0_8px_24px_rgba(99,102,241,0.4)] hover:shadow-[0_8px_32px_rgba(99,102,241,0.55)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    >
                      {saveMutation.isPending ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      {t.finish}
                    </button>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom nav (for steps 1–2) */}
        {step > 0 && step < 3 && (
          <div className="flex items-center justify-between px-8 pb-7">
            <button
              onClick={() => go(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft size={14} /> {t.back}
            </button>
            <button
              onClick={() => go(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-bold bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(99,102,241,0.25)]"
            >
              {t.next} <ArrowRight size={14} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
