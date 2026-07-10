import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, Terminal, Brain, Zap, Eye, GitBranch, User, ArrowRight, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { AgentState, TrajectoryStep } from '@/types'
import { cn } from '@/lib/utils'

interface AgentRunProps {
  state: AgentState
  onRunAgent: () => void
  onResetAgent: () => void
}

const actionColors: Record<string, string> = {
  plan: 'text-accent-400 border-accent-500/20 bg-accent-500/5',
  parse_resume: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
  score_candidate: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
  check_availability: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  propose_interview: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
  finalize: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
}

const actionIcons: Record<string, typeof Brain> = {
  plan: Brain,
  parse_resume: User,
  score_candidate: Zap,
  check_availability: Eye,
  propose_interview: ArrowRight,
  finalize: CheckCircle,
}

export function AgentRun({ state, onRunAgent, onResetAgent }: AgentRunProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Execution</h1>
          <p className="text-gray-400 mt-1">Watch the AI agent think, reason, call tools, and build a shortlist in real time.</p>
        </div>
        <div className="flex gap-2">
          {state.status === 'idle' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRunAgent}
              className="px-5 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-medium text-sm flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Agent
            </motion.button>
          )}
          {state.status === 'completed' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onResetAgent}
              className="px-5 py-2.5 rounded-xl glass glass-hover text-gray-200 font-medium text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Agent
            </motion.button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {state.status === 'running' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-accent-400 animate-spin" />
              <span className="text-sm text-gray-300">
                Step {state.stepCount} / {state.totalSteps}
              </span>
            </div>
            <span className="text-sm text-accent-400">
              {Math.round((state.stepCount / state.totalSteps) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400"
              animate={{ width: `${(state.stepCount / state.totalSteps) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Trajectory Timeline */}
        <div className="col-span-2 space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Trajectory Timeline</h2>
          
          {state.status === 'idle' && (
            <div className="glass rounded-xl p-12 text-center">
              <Terminal className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Click <span className="text-accent-400">Start Agent</span> to begin the execution</p>
            </div>
          )}

          <AnimatePresence>
            {state.trajectory.map((step) => {
              const Icon = actionIcons[step.action] || Brain
              const colorClass = actionColors[step.action] || 'text-gray-400 border-gray-500/20 bg-gray-500/5'
              
              return (
                <motion.div
                  key={step.stepNumber}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="glass rounded-xl overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center', colorClass)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {step.stepNumber < state.trajectory.length && (
                          <div className="w-px h-full bg-white/5 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500 font-mono">Step {step.stepNumber}</span>
                          <span className="text-xs text-gray-600">|</span>
                          <span className="text-xs text-gray-500">{new Date(step.timestamp).toLocaleTimeString()}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', colorClass)}>
                            {step.action}
                          </span>
                        </div>
                        
                        {/* Thought */}
                        <div className="mt-2 p-3 rounded-lg bg-accent-500/5 border border-accent-500/10">
                          <div className="flex items-center gap-2 text-accent-400 text-xs font-medium mb-1">
                            <Brain className="w-3 h-3" />
                            Thought
                          </div>
                          <p className="text-sm text-gray-200">{step.thought}</p>
                        </div>

                        {/* Observation */}
                        <div className="mt-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium mb-1">
                            <Eye className="w-3 h-3" />
                            Observation
                          </div>
                          <p className="text-sm text-gray-300">{step.observation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {state.status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4 border-emerald-500/20"
            >
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Agent execution completed successfully</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Current State */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Current State</h2>
          
          <div className="glass rounded-xl p-5 space-y-4">
            {[
              { label: 'Status', value: state.status, color: 
                state.status === 'running' ? 'text-accent-400' : 
                state.status === 'completed' ? 'text-emerald-400' : 'text-gray-400' },
              { label: 'Current Candidate', value: state.currentCandidate || '—', color: 'text-gray-200' },
              { label: 'Current Tool', value: state.currentTool || '—', color: 'text-gray-200' },
              { label: 'Current Score', value: state.currentScore ? `${state.currentScore}/5` : '—', color: 'text-gray-200' },
              { label: 'Current Node', value: state.currentNode || '—', color: 'text-gray-200' },
              { label: 'Remaining', value: state.remainingCandidates.length > 0 ? state.remainingCandidates.join(', ') : 'None', color: 'text-gray-400' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
                <p className={cn('text-sm font-mono', item.color)}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Terminal-style logs */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-card-border flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500 font-mono">agent.log</span>
            </div>
            <div className="p-4 bg-black/40 font-mono text-xs space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {state.trajectory.length === 0 ? (
                <p className="text-gray-600">Waiting for execution...</p>
              ) : (
                state.trajectory.map((step) => (
                  <p key={step.stepNumber} className="text-emerald-400/80">
                    <span className="text-gray-500">[{new Date(step.timestamp).toLocaleTimeString()}]</span>{' '}
                    <span className="text-accent-400">→</span> {step.action}
                  </p>
                ))
              )}
              {state.status === 'running' && (
                <p className="text-accent-400 animate-pulse">_</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}