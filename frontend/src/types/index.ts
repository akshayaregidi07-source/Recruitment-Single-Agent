export interface Candidate {
  id: string
  name: string
  email: string
  skills: string[]
  yearsOfExperience: number
  education: string[]
  projects: string[]
  certifications: string[]
  resumeText: string
}

export interface CriterionScore {
  criterion: string
  weight: number
  score: number
  evidence: string
  justification: string
}

export interface ScoreCard {
  candidateName: string
  criteriaScores: CriterionScore[]
  weightedTotal: number
  recommendation: 'INTERVIEW' | 'HOLD' | 'REJECT'
  justificationSummary: string
}

export interface InterviewSlot {
  candidateName: string
  date: string
  time: string
  durationMinutes: number
}

export interface InterviewConfirmation {
  candidateName: string
  slot: InterviewSlot
  status: 'pending_approval' | 'confirmed' | 'rejected'
  requestedBy: string
}

export interface TrajectoryStep {
  stepNumber: number
  thought: string
  action: string
  actionInput: Record<string, unknown>
  observation: string
  timestamp: string
}

export interface GuardrailStatus {
  humanInTheLoop: { status: string; details: string }
  stepCap: { status: string; details: string }
  promptInjectionDefense: { status: string; details: unknown }
  fairnessCheck: { status: string; details: unknown }
  decisionAuditLog: { status: string; details: string }
}

export interface AgentDecision {
  rankedShortlist: RankedCandidate[]
  trajectory: TrajectoryStep[]
  guardrailStatus: GuardrailStatus
  fairnessCheck: { results: unknown[]; note: string }
  auditLogId: string
}

export interface RankedCandidate {
  rank: number
  name: string
  weightedScore: number
  recommendation: 'INTERVIEW' | 'HOLD' | 'REJECT'
  justification: string
  criteriaScores: CriterionScore[]
  proposedInterview: InterviewConfirmation | null
}

export interface RubricCriterion {
  name: string
  weight: number
  description: string
  scale0: string
  scale5: string
}

export interface JobDescription {
  title: string
  company: string
  description: string
  requiredSkills: string[]
  preferredSkills: string[]
  responsibilities: string[]
}

export interface AgentState {
  status: 'idle' | 'running' | 'completed' | 'error'
  currentCandidate: string
  currentTool: string
  currentScore: number
  currentNode: string
  remainingCandidates: string[]
  stepCount: number
  totalSteps: number
  trajectory: TrajectoryStep[]
  decision: AgentDecision | null
}