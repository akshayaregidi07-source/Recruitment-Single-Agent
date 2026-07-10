import { motion } from 'framer-motion'
import { Brain, Eye, ArrowDown, Download, FileJson, User, Zap, CheckCircle, GitBranch } from 'lucide-react'
import { MOCK_TRAJECTORY, MOCK_DECISION } from '@/data/mockData'
import { cn } from '@/lib/utils'

const nodeColors: Record<string, { bg: string; border: string; icon: typeof Brain }> = {
  plan: { bg: 'bg-accent-500/10', border: 'border-accent-500/30', icon: Brain },
  parse_resume: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: User },
  score_candidate: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Zap },
  check_availability: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: GitBranch },
  propose_interview: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: ArrowDown },
  finalize: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: CheckCircle },
}

export function TrajectoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trajectory</h1>
          <p className="text-gray-400 mt-1">Complete LangGraph execution trace showing every thought, action, and observation.</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-xl glass glass-hover text-gray-200 text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-xl glass glass-hover text-gray-200 text-sm flex items-center gap-2"
          >
            <FileJson className="w-4 h-4" />
            Audit Report
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="col-span-2 space-y-0">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-accent-500/50 via-accent-500/20 to-transparent" />

            <div className="space-y-0">
              {MOCK_TRAJECTORY.map((step, index) => {
                const colors = nodeColors[step.action] || { bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: Brain }
                const Icon = colors.icon
                const isLast = index === MOCK_TRAJECTORY.length - 1

                return (
                  <motion.div
                    key={step.stepNumber}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex gap-6 pb-8"
                  >
                    {/* Node icon */}
                    <div className="relative z-10">
                      <div className={cn(
                        'w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-lg',
                        colors.bg, colors.border
                      )}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 glass rounded-xl p-5 -mt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono text-gray-500">Step {step.stepNumber}</span>
                        <span className="text-xs text-gray-600">|</span>
                        <span className="text-xs text-gray-500">{new Date(step.timestamp).toLocaleTimeString()}</span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-mono',
                          colors.bg, colors.border, 'text-white/80'
                        )}>
                          {step.action}
                        </span>
                      </div>

                      {/* Thought → Action → Observation */}
                      <div className="space-y-3">
                        {/* Thought */}
                        <div className="p-3 rounded-lg bg-accent-500/5 border border-accent-500/10">
                          <div className="flex items-center gap-2 text-accent-400 text-xs font-medium mb-1">
                            <Brain className="w-3.5 h-3.5" />
                            Thought
                          </div>
                          <p className="text-sm text-gray-200">{step.thought}</p>
                        </div>

                        {/* Action */}
                        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                          <div className="flex items-center gap-2 text-purple-400 text-xs font-medium mb-1">
                            <Zap className="w-3.5 h-3.5" />
                            Action
                          </div>
                          <p className="text-sm font-mono text-purple-200">
                            {step.action}({JSON.stringify(step.actionInput, null, 0)})
                          </p>
                        </div>

                        {/* Observation */}
                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium mb-1">
                            <Eye className="w-3.5 h-3.5" />
                            Observation
                          </div>
                          <p className="text-sm text-gray-300">{step.observation}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: State JSON */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Current State (JSON)</h2>
          
          <div className="glass rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-card-border flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">state.json</span>
              <span className="text-xs text-emerald-400">✓ Valid</span>
            </div>
            <div className="p-4 bg-black/40 font-mono text-xs overflow-x-auto max-h-[600px] scrollbar-thin">
              <pre className="text-gray-300">
{`{
  "status": "completed",
  "stepCount": 12,
  "totalSteps": 12,
  "currentPhase": "done",
  "candidatesProcessed": 3,
  "shortlist": [
    {
      "name": "Priya Sharma",
      "score": 4.85,
      "recommendation": "INTERVIEW"
    },
    {
      "name": "Rahul Patel", 
      "score": 2.15,
      "recommendation": "HOLD"
    },
    {
      "name": "Meera Krishnan",
      "score": 1.55,
      "recommendation": "REJECT"
    }
  ],
  "guardrails": {
    "hitl": "ENABLED",
    "stepCap": "ENABLED",
    "injectionDefense": "ENABLED",
    "fairness": "ENABLED",
    "auditLog": "ENABLED"
  }
}`}
              </pre>
            </div>
          </div>

          {/* Stats */}
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Execution Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Steps</span>
                <span className="text-white font-mono">12</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Candidates</span>
                <span className="text-white font-mono">3</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tools Called</span>
                <span className="text-white font-mono">6</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="text-white font-mono">2.3s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Audit ID</span>
                <span className="text-accent-400 font-mono text-xs">abc-123-def-456</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}