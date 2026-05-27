import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import Performance from '@/pages/Performance'
import Installer from '@/pages/Installer'
import Settings from '@/pages/Settings'
import Assistant from '@/pages/Assistant'
import Cleanup from '@/pages/Cleanup'
import Placeholder from '@/pages/Placeholder'

export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/updates" element={<Placeholder name="Updates" description="Windows Update scanning and management – coming in Phase 2." />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/installer" element={<Installer />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/security" element={<Placeholder name="Security" description="Security scanning, Defender status, and CVE alerts – coming in Phase 3." />} />
          <Route path="/automation" element={<Cleanup />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
    </HashRouter>
  )
}
