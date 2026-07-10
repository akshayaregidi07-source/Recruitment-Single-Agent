import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Clock, User, Star, Calendar } from 'lucide-react'
import { RankedCandidate } from '@/types'
import { cn } from '@/lib/utils'

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: RankedCandidate | null
  onApprove: (name: string) => void
  onReject: (name: string) => void
}

export function ApprovalModal({ isOpen, onClose, candidate, onApprove, onReject }: ApprovalModalProps) {
  if (!candidate) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg glass rounded-2xl shadow-glow-lg overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-card-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Interview Proposal</h2>
                    <p className="text-sm text-gray-400">The AI requests your approval before scheduling</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-accent-500/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-accent-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{candidate.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-sm text-gray-400">{candidate.weightedScore}/5 Overall Score</span>
                    </div>
                  </div>
                </div>

                {candidate.proposedInterview && (
                  <div className="p-4 rounded-xl bg-accent-500/5 border border-accent-500/10">
                    <div className="flex items-center gap-2 text-accent-400 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Suggested Interview Slot</span>
                    </div>
                    <p className="text-white text-lg font-semibold">
                      {candidate.proposedInterview.slot.date} at {candidate.proposedInterview.slot.time}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Duration: {candidate.proposedInterview.slot.durationMinutes} minutes
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-gray-400 mb-2">Recommendation</p>
                  <span className={cn(
                    'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                    candidate.recommendation === 'INTERVIEW' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                    candidate.recommendation === 'HOLD' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                    candidate.recommendation === 'REJECT' && 'bg-red-500/10 text-red-400 border border-red-500/20',
                  )}>
                    {candidate.recommendation}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-card-border flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onReject(candidate.name); onClose() }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors font-medium text-sm"
                >
                  Reject
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onApprove(candidate.name); onClose() }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}