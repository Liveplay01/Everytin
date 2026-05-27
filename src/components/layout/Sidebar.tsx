import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  RefreshCw,
  Bot,
  Download,
  Activity,
  Shield,
  Sparkles,
  Settings,
  Wrench,
  Cpu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/updates', icon: RefreshCw, label: 'Updates' },
  { to: '/assistant', icon: Bot, label: 'AI Assistant' },
  { to: '/installer', icon: Download, label: 'Installer' },
  { to: '/performance', icon: Activity, label: 'Performance' },
  { to: '/security', icon: Shield, label: 'Security' },
  { to: '/services', icon: Wrench, label: 'Services' },
  { to: '/drivers', icon: Cpu, label: 'Treiber' },
  { to: '/automation', icon: Sparkles, label: 'Cleanup' },
] as const

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

export default function Sidebar() {
  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full bg-surface border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <motion.img
          src="/logo.png"
          alt="everytin"
          animate={{ rotate: [0, 3, -3, 0] }}
          transition={{ duration: 0.6, delay: 1, ease: "easeInOut" }}
          className="w-7 h-7 rounded-lg"
        />
        <span className="text-[15px] font-semibold text-[#1A1A1A] tracking-tight">
          everytin
        </span>
      </div>

      {/* Navigation */}
      <motion.nav 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
      >
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <motion.div key={to} variants={itemVariants}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-150 group',
                  isActive ? 'text-accent-700' : 'text-[#6B7280]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-accent-50 rounded-lg -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <motion.div
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    whileHover={!isActive ? { x: 2 } : {}}
                    className="flex items-center gap-3 w-full"
                  >
                    <Icon
                      size={16}
                      className={cn(
                        'flex-shrink-0',
                        isActive ? 'text-accent-600' : 'text-current group-hover:text-[#1A1A1A]',
                      )}
                    />
                    {label}
                  </motion.div>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      {/* Settings at bottom */}
      <div className="px-3 py-4 border-t border-border">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-150 group',
              isActive ? 'text-accent-700' : 'text-[#6B7280]'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-accent-50 rounded-lg -z-10"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                whileHover={!isActive ? { x: 2 } : {}}
                className="flex items-center gap-3 w-full"
              >
                <Settings
                  size={16}
                  className={cn(
                    'flex-shrink-0',
                    isActive ? 'text-accent-600' : 'text-current group-hover:text-[#1A1A1A]',
                  )}
                />
                Settings
              </motion.div>
            </>
          )}
        </NavLink>
      </div>
    </aside>
  )
}
