import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/updates" element={<Updates />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/installer" element={<Installer />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/security" element={<Security />} />
          <Route path="/services" element={<Services />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/automation" element={<Cleanup />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
    </HashRouter>
  )
}
