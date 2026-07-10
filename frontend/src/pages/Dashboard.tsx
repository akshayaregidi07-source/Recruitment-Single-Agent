import { motion } from 'framer-motion'
import { Upload, Play, FileText, Cpu, Shield, GitBranch, Eye, Users, ArrowRight, Bot, Zap } from 'lucide-react'
import { MOCK_CANDIDATES, MOCK_JD } from '@/data/mockData'
import { cn } from '@/lib/utils'

interface DashboardProps {
  onNavigate: (page: string) => void
  onRunAgent: () => void
  agentStatus: string
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const features = [
  { icon: Bot, title: 'Autonomous Agent', description: 'Self-directed LangGraph agent that plans, reasons, and executes tool calls autonomously', color: 'text-accent-400' },
  { icon: Zap, title: 'Tool Calling', description: 'Four deterministic tools: parse_resume, score_candidate, check_availability, propose_interview', color: 'text-purple-400' },
  { icon: Eye, title: 'Auditable Decisions', description: 'Every thought, action, and observation logged with full trajectory replay for complete transparency', color: 'text-emerald-400' },
  { icon: Shield, title: 'Guardrails', description: 'HITL gate, injection defense, fairness checks, step caps, and decision audit logs on every run', color: 'text-amber-400' },
]

export function Dashboard({ onNavigate, onRunAgent, agentStatus }: DashboardProps) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div initial="initial" animate="animate" className="space-y-6">
        <motion.div variants={fadeUp} className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            TechVest{' '}
            <span className="text-gradient">Recruitment Agent</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            Autonomous AI Hiring Assistant that parses resumes, evaluates candidates, calls tools autonomously, 
            and produces an auditable hiring recommendation.
          </p>
        </motion.div>

        {/* Info Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
          {[
            { label: 'Candidates Uploaded', value: MOCK_CANDIDATES.length.toString(), icon: Users, color: 'text-accent-400' },
            { label: 'Job Description', value: MOCK_JD.title, icon: FileText, color: 'text-purple-400', meta: MOCK_JD.company },
            { label: 'Framework', value: 'LangGraph', icon: GitBranch, color: 'text-emerald-400', meta: 'Stateful Graph' },
            { label: 'Model', value: 'GPT-4o Mini', icon: Cpu, color: 'text-amber-400', meta: 'Tool Calling' },
          ].map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2, borderColor: 'rgba(46, 168, 255, 0.3)' }}
              className="glass rounded-xl p-5 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                  <card.icon className={cn('w-4 h-4', card.color)} />
                </div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-xl font-semibold text-white">{card.value}</p>
              {card.meta && <p className="text-sm text-gray-500 mt-0.5">{card.meta}</p>}
            </motion.div>
          ))}
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={fadeUp} className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('upload')}
            className="px-6 py-3 rounded-xl glass glass-hover text-gray-200 font-medium text-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Job Description
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('upload')}
            className="px-6 py-3 rounded-xl glass glass-hover text-gray-200 font-medium text-sm flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Upload Resumes
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { onRunAgent(); onNavigate('agent-run') }}
            disabled={agentStatus === 'running'}
            className="px-6 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {agentStatus === 'running' ? 'Running...' : 'Start Agent'}
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Run Status Cards */}
      <motion.div initial="initial" animate="animate" variants={fadeUp}>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Run Status</h2>
        <div className="grid grid-cols-3 gap-4">
          {MOCK_CANDIDATES.map((candidate, i) => (
            <motion.div
              key={candidate.id}
              whileHover={{ y: -2 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-accent-400" />
                  </div>
                  <span className="text-sm font-medium text-white">{candidate.name}</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-gray-600" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Resume</span>
                  <span className="text-emerald-400">Ready</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Current Score</span>
                  <span className="text-gray-300">—</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Stage</span>
                  <span className="text-gray-400">Pending</span>
                </div>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-0 rounded-full bg-accent-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Features */}
      <motion.div initial="initial" animate="animate" variants={fadeUp} className="grid grid-cols-4 gap-4">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -4, borderColor: 'rgba(46, 168, 255, 0.3)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="glass rounded-xl p-5 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <feature.icon className={cn('w-5 h-5', feature.color)} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}