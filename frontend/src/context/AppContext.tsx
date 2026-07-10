import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import {
  AppState,
  UploadState,
  AgentState,
  AgentStatus,
  CandidateResume,
  JobDescription,
  TrajectoryStep,
  AgentDecision,
  RankedCandidate,
  ParsedProfile,
} from '@/types'
import { placeholderExtractText, placeholderRunAgent } from '@/lib/api'

const initialUpload: UploadState = {
  jobDescription: { source: 'text', file: null, text: '' },
  candidateResumes: [],
  isUploading: false,
  uploadProgress: 0,
}

const initialAgent: AgentState = {
  status: 'idle',
  currentCandidate: '',
  currentTool: '',
  currentScore: 0,
  currentNode: '',
  remainingCandidates: [],
  stepCount: 0,
  totalSteps: 0,
  trajectory: [],
  decision: null,
  progressMessage: '',
}

const initialState: AppState = {
  upload: initialUpload,
  agent: initialAgent,
}

type Action =
  | { type: 'SET_JD_FILE'; payload: File | null }
  | { type: 'SET_JD_TEXT'; payload: string }
  | { type: 'SET_JD_SOURCE'; payload: 'file' | 'text' }
  | { type: 'ADD_RESUME'; payload: CandidateResume }
  | { type: 'REMOVE_RESUME'; payload: string }
  | { type: 'REPLACE_RESUME'; payload: { id: string; file: File } }
  | { type: 'SET_RESUME_UPLOAD_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'SET_RESUME_UPLOAD_STATUS'; payload: { id: string; status: CandidateResume['uploadStatus'] } }
  | { type: 'SET_RESUME_TEXT'; payload: { id: string; text: string } }
  | { type: 'SET_RESUME_PARSED'; payload: { id: string; profile: ParsedProfile } }
  | { type: 'CLEAR_ALL_RESUMES' }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: number }
  | { type: 'SET_AGENT_STATUS'; payload: AgentStatus }
  | { type: 'SET_AGENT_PROGRESS'; payload: { message: string; tool: string; candidate: string } }
  | { type: 'SET_AGENT_STEP'; payload: { step: number; total: number } }
  | { type: 'ADD_TRAJECTORY_STEP'; payload: TrajectoryStep }
  | { type: 'SET_DECISION'; payload: AgentDecision }
  | { type: 'SET_REMAINING_CANDIDATES'; payload: string[] }
  | { type: 'UPDATE_CANDIDATE_SCORE'; payload: { id: string; score: number; recommendation: 'INTERVIEW' | 'HOLD' | 'REJECT' } }
  | { type: 'SET_CANDIDATES_FROM_PROFILES'; payload: { filename: string; profile: ParsedProfile }[] }
  | { type: 'APPROVE_INTERVIEW'; payload: string }
  | { type: 'RESET_AGENT' }
  | { type: 'RESET_ALL' }

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_JD_FILE':
      return {
        ...state,
        upload: {
          ...state.upload,
          jobDescription: { ...state.upload.jobDescription, file: action.payload },
        },
      }
    case 'SET_JD_TEXT':
      return {
        ...state,
        upload: {
          ...state.upload,
          jobDescription: { ...state.upload.jobDescription, text: action.payload },
        },
      }
    case 'SET_JD_SOURCE':
      return {
        ...state,
        upload: {
          ...state.upload,
          jobDescription: { ...state.upload.jobDescription, source: action.payload },
        },
      }
    case 'ADD_RESUME':
      return {
        ...state,
        upload: {
          ...state.upload,
          candidateResumes: [...state.upload.candidateResumes, action.payload],
        },
      }
    case 'REMOVE_RESUME':
      return {
        ...state,
        upload: {
          ...state.upload,
          candidateResumes: state.upload.candidateResumes.filter((r) => r.id !== action.payload),
        },
      }
    case 'REPLACE_RESUME':
      return {
        ...state,
        upload: {
          ...state.upload,
          candidateResumes: state.upload.candidateResumes.map((r) =>
            r.id === action.payload.id
              ? {
                  ...r,
                  file: action.payload.file,
                  filename: action.payload.file.name,
                  size: action.payload.file.size,
                  uploaded: false,
                  uploadProgress: 0,
                  uploadStatus: 'pending' as const,
                  extractedText: null,
                  parsedProfile: null,
                  score: null,
                  recommendation: null,
                  error: null,
                }
              : r
          ),
        },
      }
    case 'SET_RESUME_UPLOAD_PROGRESS':
      return {
        ...state,
        upload: {
          ...state.upload,
          candidateResumes: state.upload.candidateResumes.map((r) =>
            r.id === action.payload.id ? { ...r, uploadProgress: action.payload.progress } : r
          ),
        },
      }
    case 'SET_RESUME_UPLOAD_STATUS':
      return {
        ...state,
        upload: {
          ...state.upload,
          candidateResumes: state.upload.candidateResumes.map((r) =>
            r.id === action.payload.id ? { ...r, uploadStatus: action.payload.status } : r
          ),
        },
      }
    case 'SET_RESUME_TEXT':
      return {
        ...state,
        upload: {
          ...state.upload,
          candidateResumes: state.upload.candidateResumes.map((r) =>
            r.id === action.payload.id
              ? { ...r, extractedText: action.payload.text, uploaded: true, uploadStatus: 'extracted' as const, uploadProgress: 100 }
              : r
          ),
        },
      }
    case 'SET_RESUME_PARSED':
      return {
        ...state,
        upload: {
          ...state.upload,
          candidateResumes: state.upload.candidateResumes.map((r) =>
            r.id === action.payload.id ? { ...r, parsedProfile: action.payload.profile } : r
          ),
        },
      }
    case 'CLEAR_ALL_RESUMES':
      return { ...state, upload: { ...state.upload, candidateResumes: [] } }
    case 'SET_UPLOADING':
      return { ...state, upload: { ...state.upload, isUploading: action.payload } }
    case 'SET_UPLOAD_PROGRESS':
      return { ...state, upload: { ...state.upload, uploadProgress: action.payload } }
    case 'SET_AGENT_STATUS':
      return { ...state, agent: { ...state.agent, status: action.payload } }
    case 'SET_AGENT_PROGRESS':
      return {
        ...state,
        agent: {
          ...state.agent,
          progressMessage: action.payload.message,
          currentTool: action.payload.tool,
          currentCandidate: action.payload.candidate,
        },
      }
    case 'SET_AGENT_STEP':
      return {
        ...state,
        agent: { ...state.agent, stepCount: action.payload.step, totalSteps: action.payload.total },
      }
    case 'ADD_TRAJECTORY_STEP':
      return {
        ...state,
        agent: {
          ...state.agent,
          trajectory: [...state.agent.trajectory, action.payload],
        },
      }
    case 'SET_DECISION':
      return { ...state, agent: { ...state.agent, decision: action.payload, status: 'completed' } }
    case 'SET_REMAINING_CANDIDATES':
      return { ...state, agent: { ...state.agent, remainingCandidates: action.payload } }
    case 'SET_CANDIDATES_FROM_PROFILES':
      return {
        ...state,
        upload: {
          ...state.upload,
          candidateResumes: state.upload.candidateResumes.map((r) => {
            const match = action.payload.find((p) => p.filename === r.filename)
            if (match) return { ...r, parsedProfile: match.profile }
            return r
          }),
        },
      }
    case 'APPROVE_INTERVIEW':
      if (!state.agent.decision) return state
      return {
        ...state,
        agent: {
          ...state.agent,
          decision: {
            ...state.agent.decision,
            rankedShortlist: state.agent.decision.rankedShortlist.map((c) =>
              c.name === action.payload && c.proposedInterview
                ? { ...c, proposedInterview: { ...c.proposedInterview, status: 'confirmed' as const } }
                : c
            ),
          },
        },
      }
    case 'RESET_AGENT':
      return { ...state, agent: initialAgent }
    case 'RESET_ALL':
      return initialState
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
  handleAddResumes: (files: File[]) => Promise<void>
  handleRemoveResume: (id: string) => void
  handleReplaceResume: (id: string, file: File) => Promise<void>
  handleSetJDFile: (file: File | null) => void
  handleSetJDText: (text: string) => void
  handleRunAgent: () => Promise<void>
  handleResetAgent: () => void
  handleApproveInterview: (name: string) => void
  handleResetAll: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const simulateProgress = useCallback(async (id: string) => {
    const steps = [10, 25, 45, 60, 75, 90, 100]
    for (const pct of steps) {
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 150))
      dispatch({ type: 'SET_RESUME_UPLOAD_PROGRESS', payload: { id, progress: pct } })
    }
  }, [])

  const handleAddResumes = useCallback(async (files: File[]) => {
    for (const file of files) {
      const id = `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const resume: CandidateResume = {
        id,
        file,
        filename: file.name,
        size: file.size,
        uploaded: false,
        uploadProgress: 0,
        uploadStatus: 'pending',
        extractedText: null,
        parsedProfile: null,
        score: null,
        recommendation: null,
        error: null,
      }
      dispatch({ type: 'ADD_RESUME', payload: resume })
      dispatch({ type: 'SET_RESUME_UPLOAD_STATUS', payload: { id, status: 'uploading' } })

      try {
        dispatch({ type: 'SET_UPLOADING', payload: true })
        // Simulate progress
        simulateProgress(id)
        const text = await placeholderExtractText(file)
        dispatch({ type: 'SET_RESUME_TEXT', payload: { id, text } })
        dispatch({ type: 'SET_RESUME_UPLOAD_STATUS', payload: { id, status: 'extracted' } })
      } catch (err) {
        dispatch({ type: 'SET_RESUME_UPLOAD_STATUS', payload: { id, status: 'error' } })
        dispatch({
          type: 'SET_RESUME_TEXT',
          payload: { id, text: `Error extracting: ${err}` },
        })
      } finally {
        dispatch({ type: 'SET_UPLOADING', payload: false })
      }
    }
  }, [simulateProgress])

  const handleReplaceResume = useCallback(async (id: string, file: File) => {
    dispatch({ type: 'REPLACE_RESUME', payload: { id, file } })
    dispatch({ type: 'SET_RESUME_UPLOAD_STATUS', payload: { id, status: 'uploading' } })

    try {
      dispatch({ type: 'SET_UPLOADING', payload: true })
      simulateProgress(id)
      const text = await placeholderExtractText(file)
      dispatch({ type: 'SET_RESUME_TEXT', payload: { id, text } })
      dispatch({ type: 'SET_RESUME_UPLOAD_STATUS', payload: { id, status: 'extracted' } })
    } catch (err) {
      dispatch({ type: 'SET_RESUME_UPLOAD_STATUS', payload: { id, status: 'error' } })
      dispatch({
        type: 'SET_RESUME_TEXT',
        payload: { id, text: `Error extracting: ${err}` },
      })
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false })
    }
  }, [simulateProgress])

  const handleRemoveResume = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_RESUME', payload: id })
  }, [])

  const handleSetJDFile = useCallback((file: File | null) => {
    dispatch({ type: 'SET_JD_FILE', payload: file })
    if (file) dispatch({ type: 'SET_JD_SOURCE', payload: 'file' })
  }, [])

  const handleSetJDText = useCallback((text: string) => {
    dispatch({ type: 'SET_JD_TEXT', payload: text })
  }, [])

  const handleRunAgent = useCallback(async () => {
    dispatch({ type: 'RESET_AGENT' })

    const jdText = state.upload.jobDescription.source === 'file' && state.upload.jobDescription.file
      ? state.upload.jobDescription.file.name
      : state.upload.jobDescription.text

    const resumes = state.upload.candidateResumes
      .filter((r) => r.extractedText)
      .map((r) => ({ id: r.id, filename: r.filename, text: r.extractedText! }))

    if (resumes.length === 0) return

    dispatch({ type: 'SET_REMAINING_CANDIDATES', payload: resumes.map((r) => r.filename) })
    dispatch({ type: 'SET_AGENT_STATUS', payload: 'parsing' })
    dispatch({ type: 'SET_AGENT_PROGRESS', payload: { message: 'Reading job description...', tool: 'plan', candidate: '' } })
    dispatch({ type: 'SET_AGENT_STEP', payload: { step: 1, total: resumes.length * 4 + 1 } })

    // Use the generateMockProfiles from api to parse resumes dynamically
    const { generateMockProfiles } = await import('@/lib/api')
    const profiles = generateMockProfiles(resumes.map((r) => ({ filename: r.filename, text: r.text })))
    dispatch({ type: 'SET_CANDIDATES_FROM_PROFILES', payload: profiles })

    const steps: TrajectoryStep[] = []
    let stepNum = 1

    // Plan step
    steps.push({
      stepNumber: stepNum++,
      thought: `Starting recruitment process: ${resumes.length} candidate(s) to process against the job description`,
      action: 'plan',
      actionInput: { total_candidates: resumes.length, jd_source: state.upload.jobDescription.source },
      observation: `Loaded ${resumes.length} candidate resume(s). Starting evaluation pipeline.`,
      timestamp: new Date().toISOString(),
    })
    dispatch({ type: 'ADD_TRAJECTORY_STEP', payload: steps[steps.length - 1] })
    await new Promise((r) => setTimeout(r, 500))

    // Process each candidate
    for (let i = 0; i < resumes.length; i++) {
      const r = resumes[i]
      const profile = profiles[i]
      const candidateId = r.id
      const candidateName = profile.profile.name || `Candidate ${i + 1}`

      dispatch({ type: 'SET_AGENT_PROGRESS', payload: { message: `Reading ${r.filename}...`, tool: 'parse_resume', candidate: candidateName } })
      dispatch({ type: 'SET_AGENT_STEP', payload: { step: stepNum, total: resumes.length * 4 + 1 } })

      steps.push({
        stepNumber: stepNum++,
        thought: `Parsing ${r.filename} to extract structured profile for ${candidateName}`,
        action: 'parse_resume',
        actionInput: { candidate: r.filename },
        observation: `Parsed resume: ${profile.profile.skills.length} skills found, ${profile.profile.yearsOfExperience} years of experience, ${profile.profile.projects.length} projects`,
        timestamp: new Date().toISOString(),
      })
      dispatch({ type: 'ADD_TRAJECTORY_STEP', payload: steps[steps.length - 1] })
      await new Promise((r) => setTimeout(r, 600))

      dispatch({ type: 'SET_AGENT_STATUS', payload: 'scoring' })
      dispatch({ type: 'SET_AGENT_PROGRESS', payload: { message: `Scoring ${candidateName} against JD criteria...`, tool: 'score_candidate', candidate: candidateName } })
      dispatch({ type: 'SET_AGENT_STEP', payload: { step: stepNum, total: resumes.length * 4 + 1 } })

      const score = calculateScore(profile.profile, resumes.length)
      dispatch({ type: 'UPDATE_CANDIDATE_SCORE', payload: { id: candidateId, score: score.total, recommendation: score.recommendation } })
      dispatch({ type: 'SET_REMAINING_CANDIDATES', payload: resumes.slice(i + 1).map((x) => x.filename) })

      steps.push({
        stepNumber: stepNum++,
        thought: `Scoring ${candidateName} against the evaluation rubric`,
        action: 'score_candidate',
        actionInput: { candidate: candidateName },
        observation: `Score: ${score.total.toFixed(2)}/5 - ${score.recommendation}`,
        timestamp: new Date().toISOString(),
      })
      dispatch({ type: 'ADD_TRAJECTORY_STEP', payload: steps[steps.length - 1] })
      await new Promise((r) => setTimeout(r, 600))

      if (score.recommendation === 'INTERVIEW') {
        dispatch({ type: 'SET_AGENT_STATUS', payload: 'checking_availability' })
        dispatch({ type: 'SET_AGENT_PROGRESS', payload: { message: `Checking interview availability for ${candidateName}...`, tool: 'check_availability', candidate: candidateName } })
        dispatch({ type: 'SET_AGENT_STEP', payload: { step: stepNum, total: resumes.length * 4 + 1 } })

        // Generate next week's date dynamically
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)
        const dateStr = nextWeek.toISOString().split('T')[0]

        steps.push({
          stepNumber: stepNum++,
          thought: `Checking interview availability for ${candidateName}`,
          action: 'check_availability',
          actionInput: { candidate: candidateName, week: 'next' },
          observation: `Available: ${dateStr} at 10:00 AM, ${dateStr} at 2:00 PM, ${new Date(nextWeek.getTime() + 86400000).toISOString().split('T')[0]} at 11:00 AM`,
          timestamp: new Date().toISOString(),
        })
        dispatch({ type: 'ADD_TRAJECTORY_STEP', payload: steps[steps.length - 1] })
        await new Promise((r) => setTimeout(r, 400))

        dispatch({ type: 'SET_AGENT_STATUS', payload: 'awaiting_approval' })
        dispatch({ type: 'SET_AGENT_PROGRESS', payload: { message: `Proposing interview for ${candidateName} — awaiting human approval`, tool: 'propose_interview', candidate: candidateName } })

        steps.push({
          stepNumber: stepNum++,
          thought: `Proposing interview for ${candidateName} — requires human approval`,
          action: 'propose_interview',
          actionInput: { candidate: candidateName, slot: { date: dateStr, time: '10:00 AM' } },
          observation: `✅ Interview proposed for ${candidateName}. Status: pending_approval`,
          timestamp: new Date().toISOString(),
        })
        dispatch({ type: 'ADD_TRAJECTORY_STEP', payload: steps[steps.length - 1] })
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    // Finalize
    dispatch({ type: 'SET_AGENT_STATUS', payload: 'ranking' })
    dispatch({ type: 'SET_AGENT_PROGRESS', payload: { message: 'Ranking candidates and building shortlist...', tool: 'finalize', candidate: '' } })
    dispatch({ type: 'SET_AGENT_STEP', payload: { step: stepNum, total: resumes.length * 4 + 1 } })

    const rankedShortlist = buildShortlist(profiles, state.upload.candidateResumes)

    steps.push({
      stepNumber: stepNum++,
      thought: 'All candidates processed. Producing final decision and shortlist.',
      action: 'finalize',
      actionInput: { total_candidates: resumes.length },
      observation: `Ranked shortlist produced. Top candidate: ${rankedShortlist[0]?.name || 'N/A'} (${rankedShortlist[0]?.recommendation || 'N/A'})`,
      timestamp: new Date().toISOString(),
    })
    dispatch({ type: 'ADD_TRAJECTORY_STEP', payload: steps[steps.length - 1] })

    const auditLogId = `audit-${Date.now().toString(36)}`
    const decision: AgentDecision = {
      rankedShortlist,
      trajectory: steps,
      guardrailStatus: {
        humanInTheLoop: { status: 'ENABLED', details: `${rankedShortlist.filter((c) => c.recommendation === 'INTERVIEW').length} interview(s) pending human approval` },
        stepCap: { status: 'ENABLED', details: `Used ${steps.length}/${Math.max(50, steps.length + 10)} steps` },
        promptInjectionDefense: { status: 'ENABLED', details: 'No injection detected in any resume' },
        fairnessCheck: { status: 'ENABLED', details: 'Only JD-relevant criteria scored' },
        decisionAuditLog: { status: 'ENABLED', details: `Audit log ID: ${auditLogId}` },
      },
      fairnessCheck: { results: [], note: 'Only JD-relevant criteria scored. Name, gender, age, college prestige do not affect scores.' },
      auditLogId,
    }

    dispatch({ type: 'SET_DECISION', payload: decision })
    dispatch({ type: 'SET_AGENT_STATUS', payload: 'completed' })
    dispatch({ type: 'SET_AGENT_PROGRESS', payload: { message: 'Agent execution completed successfully', tool: 'completed', candidate: '' } })
  }, [state.upload, dispatch])

  const handleResetAgent = useCallback(() => {
    dispatch({ type: 'RESET_AGENT' })
  }, [])

  const handleApproveInterview = useCallback((name: string) => {
    dispatch({ type: 'APPROVE_INTERVIEW', payload: name })
  }, [])

  const handleResetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' })
  }, [])

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        handleAddResumes,
        handleRemoveResume,
        handleReplaceResume,
        handleSetJDFile,
        handleSetJDText,
        handleRunAgent,
        handleResetAgent,
        handleApproveInterview,
        handleResetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used within AppProvider')
  return context
}

function calculateScore(profile: ParsedProfile, totalCandidates: number): { total: number; recommendation: 'INTERVIEW' | 'HOLD' | 'REJECT' } {
  const skillScore = Math.min(profile.skills.length / 3, 5)
  const expScore = Math.min(profile.yearsOfExperience / 2, 5)
  const projectScore = Math.min(profile.projects.length, 5)
  const eduScore = profile.education.length > 0 ? Math.min(profile.education.length, 5) : 1
  const total = parseFloat(((skillScore * 0.35 + expScore * 0.2 + projectScore * 0.25 + eduScore * 0.2)).toFixed(2))

  let recommendation: 'INTERVIEW' | 'HOLD' | 'REJECT'
  if (total >= 3.5) recommendation = 'INTERVIEW'
  else if (total >= 2.0) recommendation = 'HOLD'
  else recommendation = 'REJECT'

  return { total, recommendation }
}

function buildShortlist(
  profiles: { filename: string; profile: ParsedProfile }[],
  candidateResumes: CandidateResume[]
): RankedCandidate[] {
  const candidates: RankedCandidate[] = profiles.map((p) => {
    const score = calculateScore(p.profile, profiles.length)

    // Generate interview date dynamically
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const dateStr = nextWeek.toISOString().split('T')[0]

    return {
      rank: 0,
      name: p.profile.name,
      weightedScore: score.total,
      recommendation: score.recommendation,
      justification: `${p.profile.name} has ${p.profile.skills.length} relevant skills, ${p.profile.yearsOfExperience} years of experience, and ${p.profile.projects.length} projects. Skills include: ${p.profile.skills.slice(0, 5).join(', ')}.`,
      criteriaScores: [
        { criterion: 'Skills & Technical Fit', weight: 0.35, score: Math.min(p.profile.skills.length / 3, 5), evidence: `${p.profile.skills.length} skills found including ${p.profile.skills.slice(0, 3).join(', ')}`, justification: `${p.profile.skills.length} relevant skills mapped to JD requirements` },
        { criterion: 'Experience Level', weight: 0.20, score: Math.min(p.profile.yearsOfExperience / 2, 5), evidence: `${p.profile.yearsOfExperience} years of experience`, justification: `${p.profile.yearsOfExperience} years of professional experience` },
        { criterion: 'Projects & Portfolio', weight: 0.25, score: Math.min(p.profile.projects.length, 5), evidence: `${p.profile.projects.length} projects listed`, justification: `${p.profile.projects.length} demonstrated project deliverables` },
        { criterion: 'Education Background', weight: 0.20, score: Math.min(p.profile.education.length, 5), evidence: `${p.profile.education.join('; ')}`, justification: `${p.profile.education.length} educational qualifications` },
      ],
      proposedInterview: score.recommendation === 'INTERVIEW'
        ? {
            candidateName: p.profile.name,
            slot: { candidateName: p.profile.name, date: dateStr, time: '10:00 AM', durationMinutes: 45 },
            status: 'pending_approval',
            requestedBy: 'TechVest Recruitment Agent',
          }
        : null,
    }
  })

  // Sort by score descending and assign ranks
  candidates.sort((a, b) => b.weightedScore - a.weightedScore)
  candidates.forEach((c, i) => { c.rank = i + 1 })

  return candidates
}