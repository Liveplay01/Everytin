import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { onNavigate, getSettings } from '@/lib/tauri'
import { AnimatePresence, motion } from 'framer-motion'
import AppShell from '@/components/layout/AppShell'
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

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let unlisten: (() => void) | undefined
    onNavigate((route) => navigate(route)).then((fn) => { unlisten = fn })
    return () => unlisten?.()
  }, [navigate])

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
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
          <Route path="/updates" element={<PageWrapper><Updates /></PageWrapper>} />
          <Route path="/assistant" element={<PageWrapper><Assistant /></PageWrapper>} />
          <Route path="/installer" element={<PageWrapper><Installer /></PageWrapper>} />
          <Route path="/performance" element={<PageWrapper><Performance /></PageWrapper>} />
          <Route path="/security" element={<PageWrapper><Security /></PageWrapper>} />
          <Route path="/services" element={<PageWrapper><Services /></PageWrapper>} />
          <Route path="/drivers" element={<PageWrapper><Drivers /></PageWrapper>} />
          <Route path="/cleanup" element={<PageWrapper><Cleanup /></PageWrapper>} />
          <Route path="/automation" element={<PageWrapper><Automation /></PageWrapper>} />
          <Route path="/battery" element={<PageWrapper><Battery /></PageWrapper>} />
          <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
    </AppShell>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
