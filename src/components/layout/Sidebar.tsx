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
  Zap,
  BatteryCharging,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const NAVIGATION_GROUPS = [
  {
    title: 'Übersicht',
    items: [
      { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',       tooltip: 'Systemübersicht und Aktivitäten' },
      { to: '/assistant',   icon: Bot,              label: 'AI Assistant',    tooltip: 'Fragen stellen, Software installieren lassen' },
    ]
  },
  {
    title: 'Systempflege',
    items: [
      { to: '/performance', icon: Activity,         label: 'Performance',     tooltip: 'CPU, RAM und Prozesse in Echtzeit' },
      { to: '/cleanup',     icon: Sparkles,         label: 'Cleanup & Boost', tooltip: 'Speicherplatz freigeben und RAM optimieren' },
      { to: '/automation',  icon: Zap,              label: 'Automation',      tooltip: 'Automatische Hintergrundaufgaben verwalten' },
      { to: '/battery',     icon: BatteryCharging,  label: 'Akku & Energie',  tooltip: 'Akkugesundheit und Energieverbrauch' },
    ]
  },
  {
    title: 'Verwaltung',
    items: [
      { to: '/updates',     icon: RefreshCw,        label: 'Updates',         tooltip: 'Windows- und App-Updates installieren' },
      { to: '/installer',   icon: Download,         label: 'App Installer',   tooltip: 'Software suchen und installieren' },
      { to: '/services',    icon: Wrench,           label: 'Dienste',         tooltip: 'Windows-Dienste aktivieren oder deaktivieren' },
      { to: '/drivers',     icon: Cpu,              label: 'Treiber',         tooltip: 'Treiber prüfen und via Windows Update aktualisieren' },
      { to: '/security',    icon: Shield,           label: 'Sicherheit',      tooltip: 'Sicherheitsstatus und Firewall-Übersicht' },
    ]
  }
] as const

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

export default function Sidebar() {
  return (
    <aside className="w-[230px] flex-shrink-0 flex flex-col h-full bg-surface/50 dark:bg-[#0F0D16]/50 backdrop-blur-xl border-r border-border/80">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/60">
        <motion.img
          src="/logo.jpg"
          alt="everytin"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="w-7 h-7 rounded-lg shadow-sm"
        />
        <span className="text-[16px] font-bold bg-gradient-to-r from-accent to-[#8B5CF6] bg-clip-text text-transparent tracking-tight">
          everytin
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2 select-none">
              {group.title}
            </h3>
            <motion.nav
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-0.5"
            >
              {group.items.map(({ to, icon: Icon, label, tooltip }) => (
                <motion.div key={to} variants={itemVariants}>
                  <NavLink
                    to={to}
                    title={tooltip}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 group overflow-hidden',
                        isActive ? 'text-accent dark:text-[#A5B4FC]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div
                            layoutId="nav-indicator"
                            className="absolute inset-0 bg-accent/8 dark:bg-[#8B5CF6]/15 border-l-2 border-accent dark:border-[#8B5CF6] rounded-lg -z-10"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}
                        <motion.div
                          animate={{ scale: isActive ? 1.03 : 1 }}
                          whileHover={!isActive ? { x: 2 } : {}}
                          className="flex items-center gap-3 w-full"
                        >
                          <Icon
                            size={15}
                            className={cn(
                              'flex-shrink-0 transition-transform group-hover:scale-110',
                              isActive ? 'text-accent dark:text-[#A5B4FC]' : 'text-slate-400 dark:text-slate-500 group-hover:text-accent dark:group-hover:text-[#A5B4FC]',
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
          </div>
        ))}
      </div>

      {/* Settings at bottom */}
      <div className="px-3 py-4 border-t border-border/60">
        <NavLink
          to="/settings"
          title="Einstellungen"
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 group',
              isActive ? 'text-accent dark:text-[#A5B4FC]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-accent/8 dark:bg-[#8B5CF6]/15 border-l-2 border-accent dark:border-[#8B5CF6] rounded-lg -z-10"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.03 : 1 }}
                whileHover={!isActive ? { x: 2 } : {}}
                className="flex items-center gap-3 w-full"
              >
                <Settings
                  size={15}
                  className={cn(
                    'flex-shrink-0 transition-transform group-hover:scale-110',
                    isActive ? 'text-accent dark:text-[#A5B4FC]' : 'text-slate-400 dark:text-slate-500 group-hover:text-accent dark:group-hover:text-[#A5B4FC]',
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
