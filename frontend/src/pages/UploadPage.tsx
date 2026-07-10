import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  File,
  Clipboard,
  Trash2,
  ArrowRight,
  Loader2,
  FileUp,
  Users,
  Play,
  Bot,
  Brain,
  RefreshCw,
} from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { cn } from '@/lib/utils'

export function UploadPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const {
    state,
    handleAddResumes,
    handleRemoveResume,
    handleReplaceResume,
    handleSetJDFile,
    handleSetJDText,
    handleRunAgent,
  } = useAppContext()

  const { jobDescription, candidateResumes, isUploading } = state.upload
  const { status: agentStatus } = state.agent
  const jdFileInputRef = useRef<HTMLInputElement>(null)
  const resumeFileInputRef = useRef<HTMLInputElement>(null)
  const replaceFileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [jdTab, setJdTab] = useState<'upload' | 'paste'>(
    jobDescription.source === 'file' ? 'upload' : 'paste'
  )

  const handleJDFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleSetJDFile(file)
        setJdTab('upload')
      }
    },
    [handleSetJDFile]
  )

  const handleResumeFilesSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        const remaining = 10 - candidateResumes.length
        const filesToAdd = Array.from(files).slice(0, remaining)
        if (filesToAdd.length > 0) {
          handleAddResumes(filesToAdd)
        }
      }
      // Reset the input so the same file can be selected again
      if (e.target) e.target.value = ''
    },
    [handleAddResumes, candidateResumes.length]
  )

  const handleReplaceFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && replacingId) {
        handleReplaceResume(replacingId, file)
        setReplacingId(null)
      }
      if (e.target) e.target.value = ''
    },
    [replacingId, handleReplaceResume]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      const resumeFiles = files.filter(
        (f) =>
          f.type === 'application/pdf' ||
          f.type.includes('officedocument') ||
          f.name.endsWith('.docx') ||
          f.name.endsWith('.txt') ||
          f.name.endsWith('.pdf')
      )
      if (resumeFiles.length > 0) {
        const remaining = 10 - candidateResumes.length
        handleAddResumes(resumeFiles.slice(0, remaining))
      }
    },
    [handleAddResumes, candidateResumes.length]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleReplaceClick = useCallback((id: string) => {
    setReplacingId(id)
    // Open the file picker for replace
    setTimeout(() => replaceFileInputRef.current?.click(), 0)
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const canRunAgent =
    (jobDescription.text.trim().length > 0 || (jobDescription.source === 'file' && jobDescription.file)) &&
    candidateResumes.length >= 3

  return (
    <div className="space-y-8">
      {/* Hidden file input for replace operations */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleReplaceFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Upload</h1>
        <p className="text-gray-400 mt-1">
          Upload a job description and at least 3 candidate resumes to begin the recruitment process.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* LEFT: Job Description */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-accent-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Job Description</h2>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-card-border">
            <button
              onClick={() => setJdTab('upload')}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                jdTab === 'upload'
                  ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              <FileUp className="w-4 h-4 inline mr-2" />
              Upload File
            </button>
            <button
              onClick={() => setJdTab('paste')}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                jdTab === 'paste'
                  ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              <Clipboard className="w-4 h-4 inline mr-2" />
              Paste Text
            </button>
          </div>

          {/* Upload File */}
          {jdTab === 'upload' && (
            <div
              onClick={() => jdFileInputRef.current?.click()}
              className={cn(
                'glass rounded-xl p-8 text-center cursor-pointer transition-all duration-200 border-2 border-dashed',
                jobDescription.file
                  ? 'border-accent-500/30 bg-accent-500/5'
                  : 'border-card-border hover:border-accent-500/30 hover:bg-accent-500/5'
              )}
            >
              <input
                ref={jdFileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleJDFileSelect}
                className="hidden"
              />
              {jobDescription.file ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6 text-accent-400" />
                  </div>
                  <p className="text-white font-medium">{jobDescription.file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(jobDescription.file.size)}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetJDFile(null)
                    }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-400">
                    <span className="text-accent-400">Click to browse</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF, DOCX, or TXT</p>
                </div>
              )}
            </div>
          )}

          {/* Paste Text */}
          {jdTab === 'paste' && (
            <div className="space-y-3">
              <textarea
                value={jobDescription.text}
                onChange={(e) => handleSetJDText(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-64 glass rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-accent-500/30 border border-card-border transition-colors"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{jobDescription.text.length} characters</span>
                {jobDescription.text.length > 0 && (
                  <button
                    onClick={() => handleSetJDText('')}
                    className="text-red-400 hover:text-red-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Candidate Resumes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Candidate Resumes
                <span className="text-sm text-gray-500 ml-2 font-normal">
                  ({candidateResumes.length}/10)
                </span>
              </h2>
            </div>
            {candidateResumes.length > 0 && (
              <button
                onClick={() => {
                  candidateResumes.forEach((r) => handleRemoveResume(r.id))
                }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>

          {/* Drop Zone */}
          {candidateResumes.length < 10 && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => resumeFileInputRef.current?.click()}
              className={cn(
                'glass rounded-xl p-6 text-center cursor-pointer transition-all duration-200 border-2 border-dashed',
                isDragOver
                  ? 'border-accent-500/50 bg-accent-500/10'
                  : 'border-card-border hover:border-accent-500/30 hover:bg-accent-500/5'
              )}
            >
              <input
                ref={resumeFileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleResumeFilesSelect}
                className="hidden"
              />
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-400">
                  <span className="text-accent-400">Click to browse</span> or drag and drop resumes
                </p>
                <p className="text-xs text-gray-500">PDF, DOCX, or TXT · Up to 10 files</p>
              </div>
            </div>
          )}

          {/* Uploaded Resume List */}
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            <AnimatePresence>
              {candidateResumes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <p className="text-sm text-gray-600">No resumes uploaded yet</p>
                </motion.div>
              ) : (
                candidateResumes.map((resume, index) => (
                  <motion.div
                    key={resume.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    className="glass rounded-xl p-3 flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                      <File className="w-4 h-4 text-accent-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">Resume {index + 1}</span>
                        <p className="text-sm text-white truncate">{resume.filename}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{formatFileSize(resume.size)}</span>
                        
                        {/* Upload progress bar */}
                        {resume.uploadStatus === 'uploading' && (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <motion.div 
                                className="h-full rounded-full bg-accent-500"
                                animate={{ width: `${resume.uploadProgress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <span className="text-xs text-accent-400">{resume.uploadProgress}%</span>
                          </div>
                        )}
                        
                        {resume.uploadStatus === 'extracted' && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Extracted
                          </span>
                        )}
                        {resume.uploadStatus === 'error' && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Error
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Replace button */}
                      <button
                        onClick={() => handleReplaceClick(resume.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
                        title="Replace"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveResume(resume.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Minimum requirement warning */}
          {candidateResumes.length > 0 && candidateResumes.length < 3 && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Minimum 3 resumes required. {3 - candidateResumes.length} more needed.</span>
            </div>
          )}
        </div>
      </div>

      {/* Run Agent Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center pt-4 border-t border-card-border"
      >
        <div className="flex items-center gap-4">
          <div className="space-y-1 text-right">
            <p className="text-sm text-gray-400">
              {candidateResumes.length} resume{candidateResumes.length !== 1 ? 's' : ''} uploaded
            </p>
            {!canRunAgent && (
              <p className="text-xs text-amber-400">
                {!jobDescription.text && !jobDescription.file
                  ? 'Add a job description'
                  : 'Upload at least 3 resumes'}
              </p>
            )}
          </div>
          <motion.button
            whileHover={canRunAgent ? { scale: 1.02 } : {}}
            whileTap={canRunAgent ? { scale: 0.98 } : {}}
            onClick={() => {
              if (canRunAgent) {
                handleRunAgent()
                onNavigate('agent-run')
              }
            }}
            disabled={!canRunAgent || agentStatus === 'parsing' || agentStatus === 'scoring' || agentStatus === 'checking_availability' || agentStatus === 'ranking' || agentStatus === 'awaiting_approval'}
            className={cn(
              'px-8 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition-all',
              canRunAgent && !(agentStatus === 'parsing' || agentStatus === 'scoring' || agentStatus === 'checking_availability' || agentStatus === 'ranking' || agentStatus === 'awaiting_approval')
                ? 'bg-accent-500 hover:bg-accent-600 text-white shadow-glow'
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            )}
          >
            {agentStatus === 'parsing' || agentStatus === 'scoring' || agentStatus === 'checking_availability' || agentStatus === 'ranking' || agentStatus === 'awaiting_approval' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Agent
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}