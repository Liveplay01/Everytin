import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { onNavigate, getSettings } from '@/lib/tauri'
import { AnimatePresence, motion } from 'framer-motion'
import AppShell from '@/components/layout/AppShell'
import CommandBar from '@/components/command-bar/CommandBar'
import { useCommandBarStore } from '@/lib/store'
import Setup from '@/pages/Setup'
import Dashboard from '@/pages/Dashboard'
import Performance from '@/pages/Performance'
import Installer from '@/pages/Installer'
import Settings from '@/pages/Settings'
import Assistant from '@/pages/Assistant'
import Cleanup from '@/pages/Cleanup'
import Updates from '@/pages/Updates'
import Security from '@/pages/Security'
import Services from '@/pages/Services'
import Drivers from '@/pages/Drivers'
import Automation from '@/pages/Automation'
import Battery from '@/pages/Battery'
import FocusMode from '@/pages/FocusMode'
import ClipboardHistory from '@/pages/ClipboardHistory'
import Widgets from '@/pages/Widgets'
import SessionRestore from '@/pages/SessionRestore'
import PluginMarketplace from '@/pages/PluginMarketplace'

function SplashScreen() {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0d0d0f] select-none"
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-accent/20 blur-[80px]"
        />
      </div>

      {/* Logo ring */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-[22px] bg-accent flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)]">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" />
            <circle cx="20" cy="20" r="6" fill="white" />
          </svg>
        </div>
        {/* Spinning outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-2 rounded-[28px] border-2 border-transparent"
          style={{
            background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #6366f1, transparent 50%, #6366f1) border-box',
          }}
        />
      </motion.div>

      {/* App name */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white">
          everytin
        </h1>
        <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500 mt-1">
          System startet…
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[140px]"
      >
        <div className="h-[3px] w-full bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.1 }}
            className="h-full w-1/2 bg-accent rounded-full"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.99 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  )
}

function MainApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toggle: toggleCommandBar } = useCommandBarStore()

  useEffect(() => {
    let unlisten: (() => void) | undefined
    onNavigate((route) => navigate(route)).then((fn) => { unlisten = fn })
    return () => unlisten?.()
  }, [navigate])

  // Global shortcut: Ctrl+K opens Command Bar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandBar()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleCommandBar])

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  useEffect(() => {
    if (!settings) return
    const applyTheme = () => {
      const theme = settings.theme
      const root = document.documentElement
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (theme === 'dark' || (theme === 'system' && systemDark)) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme()

    if (settings.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      media.addEventListener('change', applyTheme)
      return () => media.removeEventListener('change', applyTheme)
    }
  }, [settings])

  return (
    <AppShell>
      <CommandBar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<PageWrapper><Dashboard /></PageWrapper>} />
          <Route path="/updates"     element={<PageWrapper><Updates /></PageWrapper>} />
          <Route path="/assistant"   element={<PageWrapper><Assistant /></PageWrapper>} />
          <Route path="/installer"   element={<PageWrapper><Installer /></PageWrapper>} />
          <Route path="/performance" element={<PageWrapper><Performance /></PageWrapper>} />
          <Route path="/security"    element={<PageWrapper><Security /></PageWrapper>} />
          <Route path="/services"    element={<PageWrapper><Services /></PageWrapper>} />
          <Route path="/drivers"     element={<PageWrapper><Drivers /></PageWrapper>} />
          <Route path="/cleanup"     element={<PageWrapper><Cleanup /></PageWrapper>} />
          <Route path="/automation"  element={<PageWrapper><Automation /></PageWrapper>} />
          <Route path="/battery"     element={<PageWrapper><Battery /></PageWrapper>} />
          <Route path="/focus"       element={<PageWrapper><FocusMode /></PageWrapper>} />
          <Route path="/clipboard"   element={<PageWrapper><ClipboardHistory /></PageWrapper>} />
          <Route path="/widgets"     element={<PageWrapper><Widgets /></PageWrapper>} />
          <Route path="/sessions"    element={<PageWrapper><SessionRestore /></PageWrapper>} />
          <Route path="/plugins"     element={<PageWrapper><PluginMarketplace /></PageWrapper>} />
          <Route path="/settings"    element={<PageWrapper><Settings /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
    </AppShell>
  )
}

function AppRoutes() {
  const setupDone = !!localStorage.getItem('everytin_setup_complete')

  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/*" element={setupDone ? <MainApp /> : <Navigate to="/setup" replace />} />
    </Routes>
  )
}

export default function App() {
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    // Show splash for at least 1.4s, then fade out
    const t = setTimeout(() => setSplash(false), 1400)
    return () => clearTimeout(t)
  }, [])

  return (
    <HashRouter>
      <AnimatePresence>
        {splash && <SplashScreen />}
      </AnimatePresence>
      <AppRoutes />
    </HashRouter>
  )
}
