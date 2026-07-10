import { ParsedProfile, TrajectoryStep, AgentDecision, GuardrailStatus } from '@/types'

const API_BASE = 'http://localhost:8000'

export async function uploadJobDescription(file: File): Promise<{ text: string; filename: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/upload-job`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
  return res.json()
}

export async function uploadResume(file: File): Promise<{ text: string; filename: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/upload-resumes`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
  return res.json()
}

export async function extractResumeText(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/extract-resume`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Extraction failed: ${res.statusText}`)
  const data = await res.json()
  return data.text
}

export async function extractJobDescription(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/extract-job`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Extraction failed: ${res.statusText}`)
  const data = await res.json()
  return data.text
}

export async function runAgent(
  jobDescription: string,
  resumes: { filename: string; text: string }[]
): Promise<{ runId: string }> {
  const res = await fetch(`${API_BASE}/run-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jobDescription, resumes }),
  })
  if (!res.ok) throw new Error(`Agent run failed: ${res.statusText}`)
  return res.json()
}

export async function getAgentStatus(): Promise<{
  status: string
  currentCandidate: string
  currentTool: string
  stepCount: number
  progressMessage: string
  parsedProfiles: { filename: string; profile: ParsedProfile }[]
}> {
  const res = await fetch(`${API_BASE}/agent-status`)
  if (!res.ok) throw new Error(`Status fetch failed: ${res.statusText}`)
  return res.json()
}

export async function getTrajectory(): Promise<TrajectoryStep[]> {
  const res = await fetch(`${API_BASE}/trajectory`)
  if (!res.ok) throw new Error(`Trajectory fetch failed: ${res.statusText}`)
  return res.json()
}

export async function getDecision(): Promise<AgentDecision> {
  const res = await fetch(`${API_BASE}/decision`)
  if (!res.ok) throw new Error(`Decision fetch failed: ${res.statusText}`)
  return res.json()
}

export async function approveInterview(candidateName: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/approve-interview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_name: candidateName }),
  })
  if (!res.ok) throw new Error(`Approval failed: ${res.statusText}`)
  return res.json()
}

// Placeholder implementations for when backend is not available
export async function placeholderExtractText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      resolve(text.slice(0, 2000))
    }
    reader.readAsText(file)
  })
}

export async function placeholderRunAgent(
  _jobDescription: string,
  _resumes: { filename: string; text: string }[]
): Promise<{ runId: string }> {
  // Simulate delay
  await new Promise((r) => setTimeout(r, 500))
  return { runId: `run-${Date.now()}` }
}

export function generateMockProfiles(
  resumes: { filename: string; text: string }[]
): { filename: string; profile: ParsedProfile }[] {
  const names = resumes.map((r) => {
    const nameMatch = r.text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/m)
    return nameMatch ? nameMatch[1] : r.filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
  })

  return resumes.map((r, i) => ({
    filename: r.filename,
    profile: {
      name: names[i] || `Candidate ${i + 1}`,
      email: `candidate${i + 1}@example.com`,
      skills: extractSkills(r.text),
      yearsOfExperience: extractExperience(r.text),
      education: extractEducation(r.text),
      projects: extractProjects(r.text),
      certifications: extractCertifications(r.text),
    },
  }))
}

function extractSkills(text: string): string[] {
  const commonSkills = [
    'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'FastAPI',
    'TensorFlow', 'PyTorch', 'Scikit-learn', 'LangChain', 'LangGraph',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Git', 'SQL',
    'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL', 'REST', 'Machine Learning',
    'Deep Learning', 'NLP', 'Computer Vision', 'Data Analysis', 'Tableau',
    'Power BI', 'Excel', 'MATLAB', 'R', 'Scala', 'Kotlin', 'Swift',
  ]
  return commonSkills.filter((s) => text.toLowerCase().includes(s.toLowerCase()))
}

function extractExperience(text: string): number {
  const expMatch = text.match(/(\d+)\s*(?:year|yr)s?\s*(?:of\s*)?(?:experience|exp)/i)
  if (expMatch) return parseInt(expMatch[1])
  const yearMatch = text.match(/(?:20\d{2})\s*[-–to]+\s*(?:20\d{2}|present)/gi)
  if (yearMatch) {
    const years = yearMatch.map((y) => {
      const parts = y.split(/[-–to]+/).map((p) => parseInt(p.trim()))
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[1] - parts[0]
      if (parts.length === 2 && !isNaN(parts[0]) && isNaN(parts[1])) return new Date().getFullYear() - parts[0]
      return 0
    })
    return Math.max(...years, 0)
  }
  return Math.floor(Math.random() * 4) + 1
}

function extractEducation(text: string): string[] {
  const eduPatterns = [
    /(?:B\.?Tech|B\.?E|Bachelor|M\.?Tech|M\.?E|Master|PhD|Ph\.?D|B\.?Sc|M\.?Sc|BBA|MBA|BCA|MCA)\s*(?:in\s*[A-Za-z\s]+)?(?:,?\s*(?:from|at)\s*[A-Za-z\s]+)?(?:\(?\d{4}[-–]\d{4}\)?)?/gi,
    /(?:B\.?Tech|B\.?E|Bachelor|M\.?Tech|M\.?E|Master|PhD|Ph\.?D|B\.?Sc|M\.?Sc|BBA|MBA|BCA|MCA)[^.]*\./gi,
  ]
  const results: string[] = []
  for (const pattern of eduPatterns) {
    const matches = text.match(pattern)
    if (matches) results.push(...matches.map((m) => m.trim()))
  }
  return results.length > 0 ? results.slice(0, 2) : ['Education details not extracted']
}

function extractProjects(text: string): string[] {
  const projectSection = text.match(/(?:PROJECTS?|PROJECT EXPERIENCE|WORK\s*SAMPLES?)[:\s]*([\s\S]*?)(?:\n\n|\n(?:SKILLS|EDUCATION|CERTIFICATION|EXPERIENCE|WORK\s*HISTORY))/i)
  if (projectSection) {
    const lines = projectSection[1].split('\n').filter((l) => l.trim().length > 10)
    return lines.slice(0, 3).map((l) => l.trim())
  }
  return [`Project experience from ${text.slice(0, 50)}...`]
}

function extractCertifications(text: string): string[] {
  const certPatterns = [
    /(?:Certified|Certificate|Certification|Credential)[^.]*\./gi,
    /(?:AWS|Google|Microsoft|IBM|Oracle|Cisco|CompTIA|PMP|Scrum|SAFe)\s*(?:Certified|Certificate|Certification)?[^.]*\./gi,
  ]
  const results: string[] = []
  for (const pattern of certPatterns) {
    const matches = text.match(pattern)
    if (matches) results.push(...matches.map((m) => m.trim()))
  }
  return results.length > 0 ? results.slice(0, 3) : []
}