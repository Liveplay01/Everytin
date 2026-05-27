import { type ReactNode } from 'react'
import Sidebar from './Sidebar'
import { ToastContainer } from '@/components/shared/Toast'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
      <ToastContainer />
    </div>
  )
}
