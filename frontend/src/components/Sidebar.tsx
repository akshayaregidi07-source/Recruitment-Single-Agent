import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Upload,
  PlayCircle,
  Users,
  ListChecks,
  GitBranch,
  Shield,
  Settings,
  Bot,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Upload, label: 'Upload', id: 'upload' },
  { icon: PlayCircle, label: 'Agent Run', id: 'agent-run' },
  { icon: Users, label: 'Candidates', id: 'candidates' },
  { icon: ListChecks, label: 'Shortlist', id: 'shortlist' },
  { icon: GitBranch, label: 'Trajectory', id: 'trajectory' },
  { icon: Shield, label: 'Guardrails', id: 'guardrails' },
  { icon: Settings, label: 'Settings', id: 'settings' },
]

interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-screen w-64 bg-charcoal-900/95 backdrop-blur-xl border-r border-card-border z-50 flex flex-col"
    >
      {/* Logo */}
      <div className="p-6 border-b border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">TechVest</h1>
            <p className="text-xs text-gray-500">Recruitment Agent</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              activePage === item.id
                ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20 shadow-glow'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
            {activePage === item.id && (
              <motion.div
                layoutId="activeIndicator"
                className="w-1 h-4 rounded-full bg-accent-400 ml-auto"
              />
            )}
          </motion.button>
        ))}
      </nav>

      {/* Legend */}
      <div className="p-4 border-t border-card-border">
        <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Legend</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-400">Interview</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-gray-400">Hold</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-gray-400">Reject</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-500 animate-pulse" />
            <span className="text-xs text-gray-400">Agent Working</span>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}