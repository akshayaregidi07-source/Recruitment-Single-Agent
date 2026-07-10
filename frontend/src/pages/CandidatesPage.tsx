import { motion } from 'framer-motion'
import { User, Star, Briefcase, GraduationCap, Award, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { MOCK_CANDIDATES, MOCK_SHORTLIST } from '@/data/mockData'
import { cn } from '@/lib/utils'

export function CandidatesPage() {
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Candidates</h1>
        <p className="text-gray-400 mt-1">Detailed profiles for all candidates with extracted skills and scoring evidence.</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {MOCK_CANDIDATES.map((candidate, i) => {
          const shortlistEntry = MOCK_SHORTLIST.find(s => s.name === candidate.name)
          const isExpanded = expandedCandidate === candidate.id
          const score = shortlistEntry?.weightedScore ?? 0
          const rec = shortlistEntry?.recommendation ?? 'PENDING'

          return (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -2 }}
              className="glass rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-card-border">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-accent-500/10 flex items-center justify-center">
                    <User className="w-7 h-7 text-accent-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        rec === 'INTERVIEW' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                        rec === 'HOLD' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                        rec === 'REJECT' && 'bg-red-500/10 text-red-400 border border-red-500/20',
                        rec === 'PENDING' && 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
                      )}>
                        {rec}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{candidate.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span className="text-xl font-bold">{score.toFixed(2)}</span>
                      <span className="text-sm text-gray-500">/5</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill) => (
                      <span key={skill} className="text-xs px-2.5 py-1 rounded-full bg-accent-500/5 text-accent-300 border border-accent-500/10">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span className="text-xs">Experience</span>
                    </div>
                    <p className="text-sm text-white font-medium">{candidate.yearsOfExperience} years</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span className="text-xs">Education</span>
                    </div>
                    <p className="text-sm text-white font-medium">{candidate.education[0]?.split('(')[0] || 'N/A'}</p>
                  </div>
                </div>

                {/* Expandable sections */}
                <button
                  onClick={() => setExpandedCandidate(isExpanded ? null : candidate.id)}
                  className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors py-2"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isExpanded ? 'Show Less' : 'Show More'}
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-2 border-t border-card-border"
                  >
                    {/* Projects */}
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Projects</p>
                      <ul className="space-y-2">
                        {candidate.projects.map((project, idx) => (
                          <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-accent-400 mt-1">•</span>
                            {project}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Certifications */}
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Certifications</p>
                      <div className="flex flex-wrap gap-2">
                        {candidate.certifications.map((cert) => (
                          <span key={cert} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/5 text-amber-300 border border-amber-500/10 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Criterion Scores */}
                    {shortlistEntry?.criteriaScores && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Criterion Scores</p>
                        <div className="space-y-3">
                          {shortlistEntry.criteriaScores.map((cs) => (
                            <div key={cs.criterion} className="p-3 rounded-lg bg-white/5">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-gray-200">{cs.criterion}</span>
                                <span className="text-sm font-mono text-accent-400">{cs.score}/5</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
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
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}