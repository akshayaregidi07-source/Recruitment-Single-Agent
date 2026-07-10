"""Pydantic schemas for the TechVest Recruitment Agent."""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class Recommendation(str, Enum):
    INTERVIEW = "INTERVIEW"
    HOLD = "HOLD"
    REJECT = "REJECT"


class CriterionScore(BaseModel):
    criterion: str = Field(description="Name of the scoring criterion")
    weight: float = Field(description="Weight of this criterion (0-1)")
    score: int = Field(description="Score 0-5")
    evidence: str = Field(description="Specific line/resume evidence for this score")
    justification: str = Field(description="Why this score was given")


class ScoreCard(BaseModel):
    candidate_name: str = Field(description="Candidate name")
    criteria_scores: list[CriterionScore] = Field(description="Scores per criterion")
    weighted_total: float = Field(description="Weighted total score out of 5")
    recommendation: Recommendation = Field(description="Final recommendation")
    justification_summary: str = Field(description="Overall justification citing resume evidence")


class CandidateProfile(BaseModel):
    name: str = Field(description="Candidate full name")
    skills: list[str] = Field(description="Technical skills listed")
    years_of_experience: float = Field(description="Total years of professional experience")
    education: list[str] = Field(description="Education entries")
    projects: list[str] = Field(description="Project descriptions")
    certifications: list[str] = Field(description="Certifications")
    raw_resume_snippet: str = Field(description="First 200 chars of raw resume for audit")


class InterviewSlot(BaseModel):
    candidate_name: str = Field(description="Candidate name")
    date: str = Field(description="Proposed interview date")
    time: str = Field(description="Proposed interview time")
    duration_minutes: int = Field(default=45)


class InterviewConfirmation(BaseModel):
    candidate_name: str = Field(description="Candidate name")
    slot: InterviewSlot = Field(description="The confirmed slot")
    status: str = Field(description="pending_approval / confirmed / rejected")
    requested_by: str = Field(default="TechVest Recruitment Agent")


class TrajectoryStep(BaseModel):
    step_number: int = Field(description="Step number in the trajectory")
    thought: str = Field(description="What the agent decided to do")
    action: str = Field(description="Tool called")
    action_input: dict = Field(description="Arguments passed to tool")
    observation: str = Field(description="What the tool returned")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class AgentDecision(BaseModel):
    ranked_shortlist: list[dict] = Field(description="Ranked list with candidate, score, recommendation")
    trajectory: list[TrajectoryStep] = Field(description="Full reasoning trace")
    guardrail_status: dict = Field(description="Status of all guardrails")
    fairness_check: dict = Field(description="Fairness check results")
    audit_log_id: str = Field(description="Unique ID for this decision audit log")


class RubricCriterion(BaseModel):
    name: str = Field(description="Criterion name from JD")
    weight: float = Field(description="Weight (0-1, must sum to 1)")
    description: str = Field(description="What this criterion measures")
    scale_0: str = Field(description="Descriptor for score 0")
    scale_1: str = Field(description="Descriptor for score 1")
    scale_2: str = Field(description="Descriptor for score 2")
    scale_3: str = Field(description="Descriptor for score 3")
    scale_4: str = Field(description="Descriptor for score 4")
    scale_5: str = Field(description="Descriptor for score 5")


class Rubric(BaseModel):
    criteria: list[RubricCriterion] = Field(description="List of scoring criteria")
    evidence_rule: str = Field(default="Every score must cite a specific line from the resume.")


class JobDescription(BaseModel):
    title: str = Field(description="Job title")
    company: str = Field(description="Company name")
    description: str = Field(description="Full job description text")
    required_skills: list[str] = Field(description="Required skills")
    preferred_skills: list[str] = Field(description="Preferred/nice-to-have skills")
    responsibilities: list[str] = Field(description="Key responsibilities")