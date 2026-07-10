import { motion } from 'framer-motion'
import { useState } from 'react'
import { Star, Calendar, FileText, User, ExternalLink, ChevronDown, ChevronUp, Award, Check } from 'lucide-react'
import { MOCK_SHORTLIST } from '@/data/mockData'
import { ApprovalModal } from '@/components/ApprovalModal'
import { cn } from '@/lib/utils'
import { RankedCandidate } from '@/types'

interface ShortlistPageProps {
  onApprove: (name: string) => void
}

export function ShortlistPage({ onApprove }: ShortlistPageProps) {
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null)
  const [modalCandidate, setModalCandidate] = useState<RankedCandidate | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shortlist</h1>
          <p className="text-gray-400 mt-1">Ranked candidates with evidence-based justifications and interview scheduling.</p>
        </div>
      </div>

      <div className="space-y-6">
        {MOCK_SHORTLIST.map((candidate, i) => {
          const isExpanded = expandedCandidate === candidate.name
          const isTopRank = candidate.rank === 1

          return (
            <motion.div
              key={candidate.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={cn(
                'glass rounded-xl overflow-hidden transition-all duration-300',
                isTopRank && 'ring-1 ring-accent-500/30 shadow-glow-lg'
              )}
            >
              {/* Header */}
              <div className={cn('p-6', isTopRank && 'bg-gradient-to-r from-accent-500/5 to-transparent')}>
                <div className="flex items-center gap-6">
                  {/* Rank Badge */}
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold',
                    candidate.rank === 1 && 'bg-accent-500/10 text-accent-400 border border-accent-500/20',
                    candidate.rank === 2 && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                    candidate.rank === 3 && 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
                  )}>
                    #{candidate.rank}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-white">{candidate.name}</h3>
                      <span className={cn(
                        'text-xs px-3 py-1 rounded-full font-medium',
                        candidate.recommendation === 'INTERVIEW' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                        candidate.recommendation === 'HOLD' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                        candidate.recommendation === 'REJECT' && 'bg-red-500/10 text-red-400 border border-red-500/20',
                      )}>
                        {candidate.recommendation}
                      </span>
                      {isTopRank && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Top Candidate
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-lg font-bold text-white">{candidate.weightedScore.toFixed(2)}</span>
                        <span className="text-sm text-gray-500">/5</span>
                      </div>
                      {candidate.proposedInterview && (
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {candidate.proposedInterview.slot.date} at {candidate.proposedInterview.slot.time}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {candidate.proposedInterview?.status === 'pending_approval' && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setModalCandidate(candidate)}
                        className="px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule Interview
                      </motion.button>
                    )}
                    {candidate.proposedInterview?.status === 'confirmed' && (
                      <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Confirmed
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedCandidate(isExpanded ? null : candidate.name)}
                      className="px-4 py-2 rounded-xl glass glass-hover text-gray-400 text-sm flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Report
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Report */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-card-border"
                >
                  <div className="p-6 space-y-6">
                    {/* Justification */}
                    <div>
                      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">Justification</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{candidate.justification}</p>
                    </div>

                    {/* Score Breakdown */}
                    <div>
                      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-3">Criterion Scores</p>
                      <div className="space-y-3">
                        {candidate.criteriaScores.map((cs) => (
                          <div key={cs.criterion} className="glass rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">{cs.criterion}</span>
                                <span className="text-xs text-gray-500">(weight: {cs.weight})</span>
                              </div>
                              <span className="text-lg font-bold font-mono text-accent-400">{cs.score}/5</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                              <div className="h-full rounded-full bg-accent-500" style={{ width: `${(cs.score / 5) * 100}%` }} />
                            </div>
                            <p className="text-xs text-gray-500">
                              <span className="text-accent-400">Evidence: </span>
                              {cs.evidence}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={modalCandidate !== null}
        onClose={() => setModalCandidate(null)}
        candidate={modalCandidate}
        onApprove={(name) => { onApprove(name); setModalCandidate(null) }}
        onReject={() => setModalCandidate(null)}
      />
    </div>
  )
}