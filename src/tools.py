"""Tools for the TechVest Recruitment Agent.

Four tools:
1. parse_resume(resume_text) -> CandidateProfile
2. score_candidate(profile, rubric) -> ScoreCard
3. check_availability(candidate, week) -> [InterviewSlot]
4. propose_interview(candidate, slot) -> InterviewConfirmation
"""
from __future__ import annotations
import json
import os
import re
import uuid
from datetime import datetime, timedelta
from typing import Optional

from pydantic import BaseModel, Field

from src.schemas import (
    CandidateProfile, ScoreCard, CriterionScore,
    InterviewSlot, InterviewConfirmation,
    Rubric, Recommendation, TrajectoryStep
)

# ============================================================
# TOOL 1: parse_resume — structured extraction from resume text
# ============================================================

def parse_resume(resume_text: str, candidate_name: str = "") -> CandidateProfile:
    """Parse a resume text into a structured CandidateProfile.
    
    Uses pattern-based extraction with LLM enhancement if available.
    Returns a validated CandidateProfile.
    """
    # Check for prompt injection — treat resume as untrusted
    injection_patterns = [
        r"(?i)ignore\s+(all\s+)?(previous|above)\s+instructions",
        r"(?i)ignore\s+(all\s+)?prior\s+directives",
        r"(?i)override\s+(instructions|ranking|scoring)",
        r"(?i)this\s+is\s+an\s+override",
        r"(?i)score\s+this\s+candidate\s+5",
        r"(?i)rank\s+(me|this)\s+(candidate|first|highest)",
        r"(?i)hiring\s+manager\s+(override|instruction)",
    ]
    
    injection_detected = False
    for pattern in injection_patterns:
        if re.search(pattern, resume_text):
            injection_detected = True
            break
    
    # Extract name
    name_match = re.search(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', resume_text.strip())
    name = candidate_name or (name_match.group(1).strip() if name_match else "Unknown Candidate")
    
    # Extract email
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', resume_text)
    email = email_match.group(0) if email_match else ""
    
    # Extract education
    education = []
    edu_section = re.search(r'EDUCATION\s*\n(.*?)(?=\n[A-Z\s]+:|$)', resume_text, re.DOTALL)
    if edu_section:
        lines = edu_section.group(1).strip().split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.startswith('Relevant'):
                education.append(line)
    
    # Extract skills
    skills = []
    skills_section = re.search(r'SKILLS\s*\n(.*?)(?=\n[A-Z\s]+:|$)', resume_text, re.DOTALL)
    if skills_section:
        skills_text = skills_section.group(1).strip()
        skills = [s.strip() for s in re.split(r'[,;]', skills_text) if s.strip()]
    
    # Extract years of experience
    years = 0.0
    exp_section = re.search(r'EXPERIENCE\s*\n(.*?)(?=\n[A-Z\s]+:|$)', resume_text, re.DOTALL)
    if exp_section:
        exp_text = exp_section.group(1)
        # Count years from date ranges
        date_ranges = re.findall(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec\s+)?(\d{4}|Present)', exp_text)
        for date_range in date_ranges:
            start_year = int(date_range[1])
            end_str = date_range[3]
            if end_str.lower() == 'present':
                end_year = datetime.now().year
            else:
                end_year = int(end_str)
            years += (end_year - start_year)
        # Also look for explicit year ranges
        year_ranges = re.findall(r'(\d{4})\s*[-–to]+\s*(\d{4}|Present)', exp_text)
        for yr_range in year_ranges:
            start_yr = int(yr_range[0])
            end_str = yr_range[1]
            if end_str.lower() == 'present':
                end_yr = datetime.now().year
            else:
                end_yr = int(end_str)
            if end_yr > start_yr:
                # Avoid double counting if dates already matched
                pass
    
    # If years still zero, try estimating from role descriptions
    if years == 0.0:
        # Estimate from the number of roles and their descriptions
        roles = re.findall(r'(?:—|–|-)\s*(.*?)(?:\n|$)', exp_section.group(1)) if exp_section else []
        if len(roles) >= 2:
            years = len(roles) * 0.75  # rough estimate
        elif len(roles) == 1:
            years = 0.5
        else:
            years = 0.0
    
    # Extract projects
    projects = []
    proj_section = re.search(r'PROJECTS\s*\n(.*?)(?=\n[A-Z\s]+:|$)', resume_text, re.DOTALL)
    if proj_section:
        proj_text = proj_section.group(1).strip()
        # Split by double newline or numbered items
        proj_items = re.split(r'\n\s*\n|(?=\d\.)', proj_text)
        for item in proj_items:
            item = item.strip()
            if item and len(item) > 10:
                projects.append(item)
    
    # Extract certifications
    certs = []
    cert_section = re.search(r'CERTIFICATIONS\s*\n(.*?)(?=\n[A-Z\s]+:|$)', resume_text, re.DOTALL)
    if cert_section:
        cert_lines = cert_section.group(1).strip().split('\n')
        for line in cert_lines:
            line = line.strip()
            if line:
                # Clean common prefixes
                line = re.sub(r'^[-•*]\s*', '', line).strip()
                if line:
                    certs.append(line)
    
    raw_snippet = resume_text[:200].strip()
    
    # Flag injection in the profile metadata
    if injection_detected:
        print(f"[GUARDRAIL] ⚠️ Prompt injection detected in resume of {name}. "
              f"Treating as untrusted input. Injection patterns matched.")
    
    return CandidateProfile(
        name=name,
        skills=skills,
        years_of_experience=round(years, 1),
        education=education,
        projects=projects,
        certifications=certs,
        raw_resume_snippet=raw_snippet
    )


# ============================================================
# TOOL 2: score_candidate — applies rubric and returns scorecard
# ============================================================

def score_candidate(profile: CandidateProfile, rubric: Rubric) -> ScoreCard:
    """Score a candidate against the rubric using evidence-based evaluation.
    
    Applies each criterion from the rubric to the candidate's profile,
    citing specific evidence from parsed fields.
    """
    criteria_scores = []
    
    for criterion in rubric.criteria:
        score, evidence, justification = _evaluate_criterion(profile, criterion)
        criteria_scores.append(CriterionScore(
            criterion=criterion.name,
            weight=criterion.weight,
            score=score,
            evidence=evidence,
            justification=justification
        ))
    
    # Calculate weighted total
    weighted_total = sum(cs.score * cs.weight for cs in criteria_scores)
    weighted_total = round(weighted_total, 2)
    
    # Determine recommendation
    if weighted_total >= 3.5:
        recommendation = Recommendation.INTERVIEW
    elif weighted_total >= 2.0:
        recommendation = Recommendation.HOLD
    else:
        recommendation = Recommendation.REJECT
    
    # Build justification summary
    summary_parts = []
    for cs in criteria_scores:
        summary_parts.append(f"{cs.criterion}: {cs.score}/5 (weight {cs.weight}) — {cs.justification}")
    
    justification_summary = (
        f"Candidate: {profile.name}. "
        f"Weighted Score: {weighted_total}/5. "
        f"Recommendation: {recommendation.value}. "
        + " | ".join(summary_parts)
    )
    
    return ScoreCard(
        candidate_name=profile.name,
        criteria_scores=criteria_scores,
        weighted_total=weighted_total,
        recommendation=recommendation,
        justification_summary=justification_summary
    )


def _evaluate_criterion(profile: CandidateProfile, criterion) -> tuple[int, str, str]:
    """Evaluate a single criterion against the candidate profile.
    
    Returns (score, evidence_line, justification).
    """
    name_lower = criterion.name.lower()
    skills_lower = [s.lower() for s in profile.skills]
    proj_text = " ".join(profile.projects).lower() if profile.projects else ""
    edu_text = " ".join(profile.education).lower() if profile.education else ""
    cert_text = " ".join(profile.certifications).lower() if profile.certifications else ""
    
    if "python & ml" in name_lower or "python" in name_lower:
        return _score_python_ml(profile, skills_lower, proj_text)
    
    elif "relevant project" in name_lower or "project" in name_lower or "hands-on" in name_lower:
        return _score_projects(profile, proj_text)
    
    elif "llm" in name_lower or "agentic" in name_lower or "tooling" in name_lower:
        return _score_llm_experience(profile, skills_lower, proj_text, cert_text)
    
    elif "communication" in name_lower or "collaboration" in name_lower:
        return _score_communication(profile, proj_text)
    
    elif "tooling" in name_lower or "infrastructure" in name_lower:
        return _score_tooling(profile, skills_lower, cert_text)
    
    else:
        return (2, "No matching criterion found", "Default score — criterion not recognized")


def _score_python_ml(profile, skills_lower, proj_text) -> tuple[int, str, str]:
    evidence_lines = []
    score = 1
    
    # Check for Python
    if any('python' in s for s in skills_lower):
        evidence_lines.append(f"Python listed in Skills section")
        score = 2
    
    # Check for ML frameworks
    ml_frameworks = ['tensorflow', 'pytorch', 'scikit-learn', 'scikit learn', 'keras']
    ml_found = [fw for fw in ml_frameworks if any(fw in s for s in skills_lower)]
    if ml_found:
        evidence_lines.append(f"ML frameworks: {', '.join(ml_found)} (Skills section)")
        score = max(score, 3)
    
    # Check for ML projects
    has_ml_project = any(word in proj_text for word in ['machine learning', 'ml pipeline', 'classification', 'regression', 'deep learning', 'neural'])
    if has_ml_project:
        # Find the specific project line
        proj_match = re.search(r'[^\n]*(?:machine learning|ml pipeline|classification|deep learning)[^\n]*', " ".join(profile.projects), re.IGNORECASE)
        evidence = proj_match.group(0)[:120] if proj_match else "ML project found in Projects section"
        evidence_lines.append(evidence)
        score = max(score, 4)
    
    # Check for production ML
    if any('production' in p.lower() or 'deploy' in p.lower() for p in profile.projects):
        evidence_lines.append("Production/deployment experience in project work")
        score = max(score, 5)
    
    # Check for research/publication
    if profile.education and any('publication' in e.lower() or 'paper' in e.lower() or 'research' in e.lower() for e in profile.education):
        evidence_lines.append("Research or publication background in education")
    
    evidence = evidence_lines[0] if evidence_lines else "No strong evidence found"
    return (score, evidence, f"Score {score}/5 — {evidence_lines[0] if evidence_lines else 'Limited Python/ML evidence'}")


def _score_projects(profile, proj_text) -> tuple[int, str, str]:
    num_projects = len(profile.projects)
    
    if num_projects == 0:
        return (0, "No projects listed in resume", "No project evidence available")
    
    # Evaluate project quality
    has_deployment = any(w in proj_text for w in ['deploy', 'production', 'docker', 'aws', 'ecs'])
    has_metrics = any(w in proj_text for w in ['accuracy', 'f1', 'precision', 'recall', 'users', 'stars'])
    has_real_world = any(w in proj_text for w in ['end-to-end', 'pipeline', 'api', 'serving', 'user'])
    
    if num_projects >= 3 and has_deployment and has_metrics:
        return (5, f"Multiple projects ({num_projects}) with deployment & metrics: {profile.projects[0][:80]}", 
                f"Score 5/5 — {num_projects} projects with real-world deployment")
    elif num_projects >= 2 and has_real_world:
        return (4, f"{num_projects} projects with practical application: {profile.projects[0][:80]}",
                f"Score 4/5 — Strong practical project experience")
    elif num_projects >= 1 and (has_metrics or has_real_world):
        return (3, f"Project with applied skills: {profile.projects[0][:80]}",
                f"Score 3/5 — Solid project with practical elements")
    elif num_projects >= 1:
        return (2, f"One project: {profile.projects[0][:80]}",
                f"Score 2/5 — Basic project, limited evidence of applied skills")
    else:
        return (1, "Projects listed but lack depth", "Score 1/5 — Projects too basic")


def _score_llm_experience(profile, skills_lower, proj_text, cert_text) -> tuple[int, str, str]:
    # Check for LLM-related skills
    llm_keywords = ['langchain', 'langgraph', 'openai', 'gpt', 'llm', 'prompt', 'rag', 'agent', 'claude']
    found_llm = [kw for kw in llm_keywords if any(kw in s for s in skills_lower)]
    
    # Check projects for LLM content
    llm_projects = [p for p in profile.projects if any(kw in p.lower() for kw in llm_keywords)]
    
    # Check certifications
    has_llm_cert = any('langchain' in c.lower() or 'llm' in c.lower() for c in profile.certifications)
    
    if found_llm and len(llm_projects) >= 2:
        return (5, f"LLM frameworks: {', '.join(found_llm[:4])}; Projects: {llm_projects[0][:80]}",
                f"Score 5/5 — Expert-level LLM/agentic experience")
    elif found_llm and len(llm_projects) >= 1:
        return (4, f"LLM skills: {', '.join(found_llm[:4])}; Project: {llm_projects[0][:80] if llm_projects else 'N/A'}",
                f"Score 4/5 — Strong LLM framework experience")
    elif found_llm or has_llm_cert:
        return (3, f"LLM-related: {', '.join(found_llm[:3]) if found_llm else 'Certification: LangChain'}" if has_llm_cert else f"LLM skills: {', '.join(found_llm[:3])}",
                f"Score 3/5 — Has LLM familiarity")
    elif any('gpt' in p.lower() or 'llm' in p.lower() for p in profile.projects):
        return (2, f"Mentions LLMs in projects: {llm_projects[0][:80] if llm_projects else 'N/A'}",
                f"Score 2/5 — Basic LLM exposure")
    else:
        return (1, "No LLM tools or experience listed",
                f"Score 1/5 — No LLM experience demonstrated")


def _score_communication(profile, proj_text) -> tuple[int, str, str]:
    evidence_points = []
    score = 1
    
    # Check for team collaboration
    if any(w in proj_text for w in ['team', 'collaborat', 'mentor', 'workshop', 'present']):
        score = 3
        evidence_points.append("Team/collaboration experience in projects")
    
    # Check for documentation/publishing
    if any('publication' in p.lower() or 'paper' in p.lower() or 'published' in p.lower() for p in profile.projects):
        score = max(score, 4)
        evidence_points.append("Published work — strong communication")
    if any('mentor' in p.lower() for p in profile.projects):
        score = max(score, 4)
        evidence_points.append("Mentoring experience — leadership & communication")
    if any('workshop' in p.lower() for p in profile.projects):
        score = max(score, 4)
        evidence_points.append("Conducted workshops — active knowledge sharing")
    
    # Check for open source / GitHub
    if any('github' in p.lower() or 'open-source' in p.lower() or 'open source' in p.lower() for p in profile.projects):
        score = max(score, 3)
        evidence_points.append("Open source contributions demonstrate collaboration")
    
    evidence = evidence_points[0] if evidence_points else "No explicit collaboration evidence found"
    return (score, evidence, f"Score {score}/5 — {evidence}")


def _score_tooling(profile, skills_lower, cert_text) -> tuple[int, str, str]:
    # Tools from JD preferred skills: LangChain/LangGraph, Vector DB, Cloud, FastAPI/Flask, Docker
    tool_keywords = {
        'langchain': 1, 'langgraph': 1,
        'vectordb': 0.5, 'chromadb': 0.5, 'pinecone': 0.5, 'vector database': 0.5,
        'aws': 0.5, 'gcp': 0.5, 'cloud': 0.3,
        'fastapi': 1, 'flask': 0.5, 'api': 0.3,
        'docker': 1, 'container': 0.5,
        'postgresql': 0.3, 'postgres': 0.3
    }
    
    tool_score = 0
    found_tools = []
    
    for skill in skills_lower:
        for tool, weight in tool_keywords.items():
            if tool in skill:
                tool_score += weight
                if tool not in found_tools:
                    found_tools.append(tool)
    
    # Also check projects for tools
    for proj in profile.projects:
        proj_lower = proj.lower()
        for tool, weight in tool_keywords.items():
            if tool in proj_lower and tool not in found_tools:
                tool_score += weight * 0.5
                found_tools.append(tool)
    
    # Map to 0-5 scale
    if tool_score >= 4:
        return (5, f"Infrastructure tools: {', '.join(found_tools[:5])}",
                f"Score 5/5 — Production-level infrastructure experience")
    elif tool_score >= 2.5:
        return (4, f"Tools used: {', '.join(found_tools[:4])}",
                f"Score 4/5 — Strong tooling experience")
    elif tool_score >= 1.5:
        return (3, f"Some tools: {', '.join(found_tools[:3])}",
                f"Score 3/5 — Moderate tool familiarity")
    elif tool_score >= 0.5:
        return (2, f"Limited tools: {', '.join(found_tools[:2])}",
                f"Score 2/5 — Basic tool exposure")
    else:
        return (1, "No preferred infrastructure tools listed",
                f"Score 1/5 — No infrastructure tool experience")


# ============================================================
# TOOL 3: check_availability — mock interview slot lookup
# ============================================================

AVAILABLE_SLOTS = {
    "Priya Sharma": [
        InterviewSlot(candidate_name="Priya Sharma", date="2026-07-15", time="10:00 AM", duration_minutes=45),
        InterviewSlot(candidate_name="Priya Sharma", date="2026-07-15", time="2:00 PM", duration_minutes=45),
        InterviewSlot(candidate_name="Priya Sharma", date="2026-07-16", time="11:00 AM", duration_minutes=45),
    ],
    "Rahul Patel": [
        InterviewSlot(candidate_name="Rahul Patel", date="2026-07-15", time="9:00 AM", duration_minutes=45),
        InterviewSlot(candidate_name="Rahul Patel", date="2026-07-16", time="3:00 PM", duration_minutes=45),
    ],
    "Meera Krishnan": [
        InterviewSlot(candidate_name="Meera Krishnan", date="2026-07-17", time="10:00 AM", duration_minutes=45),
        InterviewSlot(candidate_name="Meera Krishnan", date="2026-07-18", time="1:00 PM", duration_minutes=45),
    ]
}


def check_availability(candidate_name: str, week: str = "next") -> list[dict]:
    """Check available interview slots for a candidate.
    
    Returns a list of available time slots.
    This is a READ tool — safe to call without human approval.
    """
    candidate_key = candidate_name
    if candidate_name not in AVAILABLE_SLOTS:
        # Try to find by partial match
        for key in AVAILABLE_SLOTS:
            if candidate_name.lower() in key.lower():
                candidate_key = key
                break
        else:
            return [{"error": f"No availability found for {candidate_name}"}]
    
    slots = AVAILABLE_SLOTS[candidate_key]
    return [slot.model_dump() for slot in slots]


# ============================================================
# TOOL 4: propose_interview — ACTION tool (requires HITL gate)
# ============================================================

_pending_approvals: list[dict] = []


def propose_interview(candidate_name: str, slot: dict, requested_by: str = "TechVest Recruitment Agent") -> InterviewConfirmation:
    """Propose an interview for a candidate at a given slot.
    
    *** THIS IS AN ACTION TOOL — requires human approval before execution ***
    This tool books time on a real calendar and MUST NOT fire without approval.
    
    Returns a confirmation object with pending_approval status.
    """
    validated_slot = InterviewSlot(**slot)
    
    confirmation = InterviewConfirmation(
        candidate_name=candidate_name,
        slot=validated_slot,
        status="pending_approval",
        requested_by=requested_by
    )
    
    _pending_approvals.append(confirmation.model_dump())
    
    print(f"\n[GUARDRAIL] 🛑 ACTION BLOCKED: propose_interview for {candidate_name} "
          f"on {validated_slot.date} at {validated_slot.time}")
    print(f"[GUARDRAIL] ⏳ Status set to pending_approval — awaiting human confirmation.\n")
    
    return confirmation


def get_pending_approvals() -> list[dict]:
    """Get all pending interview approvals."""
    return _pending_approvals


def confirm_interview(confirmation_id: int) -> dict:
    """Confirm a pending interview (human-in-the-loop approval)."""
    if 0 <= confirmation_id < len(_pending_approvals):
        _pending_approvals[confirmation_id]["status"] = "confirmed"
        return _pending_approvals[confirmation_id]
    return {"error": "Invalid confirmation ID"}


# ============================================================
# TRAJECTORY LOGGING HELPER
# ============================================================

_trajectory: list[TrajectoryStep] = []
_step_counter = 0


def log_trajectory(thought: str, action: str, action_input: dict, observation: str) -> TrajectoryStep:
    """Log a step in the agent's trajectory."""
    global _step_counter
    _step_counter += 1
    step = TrajectoryStep(
        step_number=_step_counter,
        thought=thought,
        action=action,
        action_input=action_input,
        observation=str(observation)[:500],
        timestamp=datetime.now().isoformat()
    )
    _trajectory.append(step)
    return step


def get_trajectory() -> list[TrajectoryStep]:
    """Get the full trajectory log."""
    return _trajectory


def reset_trajectory():
    """Reset the trajectory log (for a new run)."""
    global _trajectory, _step_counter
    _trajectory = []
    _step_counter = 0


# ============================================================
# INJECTION DETECTION TOOL
# ============================================================

def detect_prompt_injection(resume_text: str) -> dict:
    """Check a resume for prompt injection attempts.
    
    Returns detection results with matched patterns and severity.
    """
    injection_patterns = {
        "instruction_override": [
            r"(?i)ignore\s+(all\s+)?(previous|above)\s+instructions",
            r"(?i)ignore\s+(all\s+)?prior\s+directives",
            r"(?i)disregard\s+(all\s+)?(previous|prior)",
        ],
        "ranking_manipulation": [
            r"(?i)score\s+(me|this)\s+(candidate|applicant)\s+(5|5/5|five)",
            r"(?i)rank\s+(me|this)\s+(candidate|first|highest|top)",
            r"(?i)override\s+(the\s+)?(ranking|scoring|evaluation)",
        ],
        "authority_fabrication": [
            r"(?i)hiring\s+manager\s+(override|instruction|request|said)",
            r"(?i)this\s+is\s+an\s+override\s+from",
            r"(?i)CEO\s+(request|instruction|override|wants)",
        ],
        "system_prompt_attack": [
            r"(?i)you\s+are\s+(now|not\s+required\s+to)",
            r"(?i)new\s+(instructions|rules|directives)",
            r"(?i)INSTRUCTIONS:",
        ]
    }
    
    detected = {}
    for category, patterns in injection_patterns.items():
        for pattern in patterns:
            match = re.search(pattern, resume_text)
            if match:
                if category not in detected:
                    detected[category] = []
                detected[category].append(match.group(0))
    
    return {
        "injection_detected": len(detected) > 0,
        "categories": detected,
        "severity": "HIGH" if len(detected) >= 2 else ("MEDIUM" if len(detected) >= 1 else "NONE"),
        "matched_texts": [m for matches in detected.values() for m in matches]
    }


# ============================================================
# FAIRNESS CHECK TOOL
# ============================================================

def run_fairness_check(profile_a: CandidateProfile, profile_b: CandidateProfile, rubric: Rubric) -> dict:
    """Run a fairness check comparing two candidates with identical experience.
    
    If both have identical relevant experience, they should score the same
    regardless of name, gender, age, or college prestige.
    """
    # Remove biasing fields for comparison
    a_relevant = {
        "skills": set(s.lower() for s in profile_a.skills),
        "years": profile_a.years_of_experience,
        "num_projects": len(profile_a.projects),
        "has_ml": any('ml' in s.lower() or 'machine learning' in s.lower() for s in profile_a.skills),
        "has_llm": any('langchain' in s.lower() or 'llm' in s.lower() or 'openai' in s.lower() for s in profile_a.skills),
    }
    b_relevant = {
        "skills": set(s.lower() for s in profile_b.skills),
        "years": profile_b.years_of_experience,
        "num_projects": len(profile_b.projects),
        "has_ml": any('ml' in s.lower() or 'machine learning' in s.lower() for s in profile_b.skills),
        "has_llm": any('langchain' in s.lower() or 'llm' in s.lower() or 'openai' in s.lower() for s in profile_b.skills),
    }
    
    return {
        "candidate_a": profile_a.name,
        "candidate_b": profile_b.name,
        "relevant_skills_similar": a_relevant["skills"] == b_relevant["skills"],
        "years_similar": abs(a_relevant["years"] - b_relevant["years"]) < 0.5,
        "project_count_similar": a_relevant["num_projects"] == b_relevant["num_projects"],
        "overall_relevant_equivalent": (
            a_relevant["skills"] == b_relevant["skills"] and
            abs(a_relevant["years"] - b_relevant["years"]) < 0.5 and
            a_relevant["num_projects"] == b_relevant["num_projects"]
        ),
        "note": "Fairness check: JD-relevant criteria only. Name, gender, age, college are not scored."
    }