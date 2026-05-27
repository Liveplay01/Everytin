import { type ReactNode } from 'react'
import Sidebar from './Sidebar'
import { ToastContainer } from '@/components/shared/Toast'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative flex h-screen bg-background text-foreground overflow-hidden">
      {/* Dynamic Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-80 dark:opacity-40 select-none">
        <div className="absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#4F46E5]/15 to-[#8B5CF6]/15 blur-[120px] animate-blob" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#10B981]/10 to-[#06B6D4]/15 blur-[130px] animate-blob" style={{ animationDelay: '-6s' }} />
        <div className="absolute top-[20%] right-[10%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-bl from-[#EC4899]/10 to-[#F59E0B]/10 blur-[110px] animate-blob" style={{ animationDelay: '-12s' }} />
      </div>

      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0 relative">
        {children}
      </main>
      <ToastContainer />
    </div>
  )
}
