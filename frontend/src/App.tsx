import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/Sidebar'
import { useAgent } from '@/hooks/useAgent'
import { Dashboard } from '@/pages/Dashboard'
import { AgentRun } from '@/pages/AgentRun'
import { CandidatesPage } from '@/pages/CandidatesPage'
import { ShortlistPage } from '@/pages/ShortlistPage'
import { TrajectoryPage } from '@/pages/TrajectoryPage'
import { GuardrailsPage } from '@/pages/GuardrailsPage'

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const { state, runAgent, resetAgent, approveInterview } = useAgent()

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setActivePage}
            onRunAgent={runAgent}
            agentStatus={state.status}
          />
        )
      case 'agent-run':
        return (
          <AgentRun
            state={state}
            onRunAgent={runAgent}
            onResetAgent={resetAgent}
          />
        )
      case 'candidates':
        return <CandidatesPage />
      case 'shortlist':
        return <ShortlistPage onApprove={approveInterview} />
      case 'trajectory':
        return <TrajectoryPage />
      case 'guardrails':
        return <GuardrailsPage />
      case 'upload':
      case 'settings':
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center glass rounded-xl p-8">
              <h2 className="text-xl font-semibold text-white mb-2 capitalize">{activePage.replace('-', ' ')}</h2>
              <p className="text-gray-400">This page is under construction.</p>
            </div>
          </div>
        )
      default:
        return (
          <Dashboard
            onNavigate={setActivePage}
            onRunAgent={runAgent}
            agentStatus={state.status}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-charcoal-900">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="ml-64 p-8 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}