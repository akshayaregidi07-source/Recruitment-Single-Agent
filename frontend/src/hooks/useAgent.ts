import { useState, useCallback } from 'react'
import { AgentState, AgentDecision, TrajectoryStep } from '@/types'
import { MOCK_DECISION, MOCK_TRAJECTORY } from '@/data/mockData'

export function useAgent() {
  const [state, setState] = useState<AgentState>({
    status: 'idle',
    currentCandidate: '',
    currentTool: '',
    currentScore: 0,
    currentNode: '',
    remainingCandidates: ['Priya Sharma', 'Rahul Patel', 'Meera Krishnan'],
    stepCount: 0,
    totalSteps: 12,
    trajectory: [],
    decision: null,
  })

  const runAgent = useCallback(() => {
    setState(prev => ({ ...prev, status: 'running', trajectory: [] }))

    // Simulate agent execution with real-time updates
    MOCK_TRAJECTORY.forEach((step, index) => {
      setTimeout(() => {
        setState(prev => {
          const isLast = index === MOCK_TRAJECTORY.length - 1
          const remaining = ['Priya Sharma', 'Rahul Patel', 'Meera Krishnan']
          const processedCount = Math.floor(index / 4)
          
          return {
            ...prev,
            stepCount: step.stepNumber,
            currentNode: step.action,
            currentTool: step.action,
            currentCandidate: step.actionInput?.candidate as string || prev.currentCandidate,
            currentScore: index === 2 ? 4.85 : index === 7 ? 2.15 : index === 10 ? 1.55 : prev.currentScore,
            remainingCandidates: remaining.slice(processedCount + 1),
            trajectory: [...prev.trajectory, step],
            status: isLast ? 'completed' : 'running',
            decision: isLast ? MOCK_DECISION : null,
          }
        })
      }, (index + 1) * 800)
    })
  }, [])

  const resetAgent = useCallback(() => {
    setState({
      status: 'idle',
      currentCandidate: '',
      currentTool: '',
      currentScore: 0,
      currentNode: '',
      remainingCandidates: ['Priya Sharma', 'Rahul Patel', 'Meera Krishnan'],
      stepCount: 0,
      totalSteps: 12,
      trajectory: [],
      decision: null,
    })
  }, [])

  const approveInterview = useCallback((candidateName: string) => {
    setState(prev => {
      if (!prev.decision) return prev
      const updatedShortlist = prev.decision.rankedShortlist.map(c =>
        c.name === candidateName && c.proposedInterview
          ? { ...c, proposedInterview: { ...c.proposedInterview, status: 'confirmed' as const } }
          : c
      )
      return {
        ...prev,
        decision: { ...prev.decision, rankedShortlist: updatedShortlist },
      }
    })
  }, [])

  return {
    state,
    runAgent,
    resetAgent,
    approveInterview,
  }
}