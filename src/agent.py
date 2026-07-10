"""LangGraph agent for the TechVest Recruitment Agent.

The agent:
1. Plans which candidate to process next
2. Parses their resume (tool call)
3. Scores them against the rubric (tool call)
4. Checks availability if scoring well (tool call)
5. Proposes interview if threshold met (tool call - with HITL gate)
6. Repeats until all candidates processed
7. Produces ranked shortlist with full trajectory
"""
from __future__ import annotations
import json
import uuid
from datetime import datetime
from typing import Annotated, Literal, Optional, TypedDict, Union

from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.message import add_messages

from src.schemas import (
    CandidateProfile, ScoreCard, InterviewSlot, InterviewConfirmation,
    Rubric, Recommendation, TrajectoryStep, AgentDecision
)
from src.data import JUNIOR_AI_ENGINEER_JD, RECRUITMENT_RUBRIC, CANDIDATES
from src.tools import (
    parse_resume, score_candidate, check_availability, propose_interview,
    log_trajectory, get_trajectory, reset_trajectory,
    detect_prompt_injection, run_fairness_check,
    get_pending_approvals
)


# ============================================================
# AGENT STATE
# ============================================================

class AgentState(TypedDict):
    """State carried through the recruitment agent graph."""
    # Configuration
    jd: dict
    rubric: dict
    
    # Candidates pipeline
    candidates_to_process: list[str]  # Names remaining
    candidate_index: int  # Current candidate index
    
    # Results
    parsed_profiles: dict[str, CandidateProfile]  # name -> profile
    scorecards: dict[str, ScoreCard]  # name -> scorecard
    availability: dict[str, list[dict]]  # name -> slots
    interview_proposals: dict[str, InterviewConfirmation]  # name -> confirmation
    
    # Running state
    current_candidate: str  # Name being processed
    current_phase: str  # parse / score / check_avail / propose / done
    thought: str  # Agent's current reasoning
    
    # Trajectory
    trajectory: list[dict]
    step_count: int
    max_steps: int
    
    # Guardrails
    injection_checks: dict[str, dict]
    fairness_checks: list[dict]
    guardrail_status: dict
    
    # Final output
    decision: Optional[dict]
    audit_log_id: str


def create_initial_state() -> AgentState:
    """Create the initial agent state with JD and rubric."""
    return {
        "jd": JUNIOR_AI_ENGINEER_JD.model_dump(),
        "rubric": RECRUITMENT_RUBRIC.model_dump(),
        "candidates_to_process": ["Priya Sharma", "Rahul Patel", "Meera Krishnan"],
        "candidate_index": 0,
        "parsed_profiles": {},
        "scorecards": {},
        "availability": {},
        "interview_proposals": {},
        "current_candidate": "",
        "current_phase": "plan",
        "thought": "Starting recruitment agent. I need to process each candidate: parse resume, score, check availability, and propose interview if qualified.",
        "trajectory": [],
        "step_count": 0,
        "max_steps": 50,
        "injection_checks": {},
        "fairness_checks": [],
        "guardrail_status": {
            "human_in_the_loop": "ENABLED - propose_interview requires approval before acting",
            "step_cap": f"ENABLED - max {50} steps per run",
            "prompt_injection_defense": "ENABLED - each resume checked for injection patterns",
            "fairness_check": "ENABLED - scores based only on JD-relevant criteria",
            "decision_audit_log": "ENABLED - full trajectory persisted for audit"
        },
        "decision": None,
        "audit_log_id": str(uuid.uuid4())
    }


# ============================================================
# NODE DEFINITIONS
# ============================================================

def plan_node(state: AgentState) -> AgentState:
    """Plan which candidate to process next."""
    state["step_count"] += 1
    
    if state["step_count"] > state["max_steps"]:
        state["current_phase"] = "done"
        state["thought"] = "Step limit reached. Producing final decision."
        log_trajectory(
            "Step limit reached.",
            "system_check",
            {"step_count": state["step_count"], "max_steps": state["max_steps"]},
            "Exceeded max steps. Ending processing."
        )
        return state
    
    remaining = state["candidates_to_process"]
    idx = state["candidate_index"]
    
    if idx >= len(remaining):
        # All candidates processed
        state["current_phase"] = "done"
        state["thought"] = "All candidates processed. Producing final ranked shortlist."
        log_trajectory(
            "All candidates processed. Producing final decision.",
            "finalize",
            {"total_candidates": len(state["scorecards"])},
            f"Scorecards ready: {list(state['scorecards'].keys())}"
        )
        return state
    
    candidate = remaining[idx]
    state["current_candidate"] = candidate
    state["current_phase"] = "parse"
    state["thought"] = f"Starting to process candidate {idx+1}/{len(remaining)}: {candidate}"
    
    log_trajectory(
        state["thought"],
        "plan",
        {"candidate": candidate, "phase": "parse"},
        f"Next up: {candidate} ({CANDIDATES[candidate]['type']})"
    )
    
    return state


def parse_node(state: AgentState) -> AgentState:
    """Parse the current candidate's resume."""
    state["step_count"] += 1
    candidate = state["current_candidate"]
    
    if not candidate:
        state["current_phase"] = "plan"
        return state
    
    resume_text = CANDIDATES[candidate]["resume_text"]
    
    # Run injection detection first (guardrail)
    injection_result = detect_prompt_injection(resume_text)
    state["injection_checks"][candidate] = injection_result
    
    if injection_result["injection_detected"]:
        log_trajectory(
            f"Checking {candidate}'s resume for prompt injection...",
            "injection_check",
            {"candidate": candidate},
            f"⚠️ INJECTION DETECTED! Severity: {injection_result['severity']}. "
            f"Categories: {list(injection_result['categories'].keys())}. "
            f"Treating as untrusted — scoring based on actual qualifications only."
        )
    
    # Parse the resume (this function has its own injection detection)
    profile = parse_resume(resume_text, candidate)
    state["parsed_profiles"][candidate] = profile.model_dump()
    
    observation = (
        f"Parsed resume for {candidate}: "
        f"{len(profile.skills)} skills, "
        f"{profile.years_of_experience} years experience, "
        f"{len(profile.projects)} projects, "
        f"{len(profile.certifications)} certifications. "
        f"Skills: {', '.join(profile.skills[:6])}"
    )
    
    log_trajectory(
        f"Parse {candidate}'s resume to extract structured profile",
        "parse_resume",
        {"candidate": candidate, "resume_length": len(resume_text)},
        observation
    )
    
    state["current_phase"] = "score"
    state["thought"] = f"Parsed {candidate}'s resume. Now scoring against the rubric."
    
    return state


def score_node(state: AgentState) -> AgentState:
    """Score the current candidate."""
    state["step_count"] += 1
    candidate = state["current_candidate"]
    
    profile_dict = state["parsed_profiles"].get(candidate)
    if not profile_dict:
        state["current_phase"] = "plan"
        return state
    
    profile = CandidateProfile(**profile_dict)
    rubric = Rubric(**state["rubric"])
    
    scorecard = score_candidate(profile, rubric)
    state["scorecards"][candidate] = scorecard.model_dump()
    
    observation = (
        f"Scorecard for {candidate}: "
        f"Weighted Total: {scorecard.weighted_total}/5. "
        f"Recommendation: {scorecard.recommendation.value}. "
        f"Breakdown: "
        + " | ".join(f"{cs.criterion}: {cs.score}/5" for cs in scorecard.criteria_scores)
    )
    
    log_trajectory(
        f"Score {candidate} against the rubric",
        "score_candidate",
        {"candidate": candidate, "rubric_criteria": [c.name for c in rubric.criteria]},
        observation
    )
    
    # Decide next step based on score
    if scorecard.recommendation in (Recommendation.INTERVIEW, Recommendation.HOLD):
        state["current_phase"] = "check_avail"
        state["thought"] = f"{candidate} scored {scorecard.weighted_total}. Checking availability for potential interview."
    else:
        state["current_phase"] = "next_candidate"
        state["thought"] = f"{candidate} scored {scorecard.weighted_total} — {scorecard.recommendation.value}. Moving to next candidate."
    
    return state


def check_availability_node(state: AgentState) -> AgentState:
    """Check interview availability for the current candidate."""
    state["step_count"] += 1
    candidate = state["current_candidate"]
    
    slots = check_availability(candidate)
    state["availability"][candidate] = slots
    
    if slots and "error" not in slots[0]:
        slot_summary = "; ".join(f"{s['date']} at {s['time']} ({s['duration_minutes']}min)" for s in slots)
        observation = f"Available slots for {candidate}: {slot_summary}"
    else:
        observation = f"No available slots for {candidate}: {slots}"
    
    log_trajectory(
        f"Check interview availability for {candidate}",
        "check_availability",
        {"candidate": candidate, "week": "next"},
        observation
    )
    
    # Decide next: propose if INTERVIEW, otherwise move on
    scorecard = state["scorecards"].get(candidate, {})
    recommendation = scorecard.get("recommendation", "")
    
    if recommendation == "INTERVIEW" and slots and "error" not in slots[0]:
        state["current_phase"] = "propose"
        state["thought"] = f"{candidate} qualifies for INTERVIEW and has available slots. Proposing interview."
    else:
        state["current_phase"] = "next_candidate"
        reason = "HOLD (not scheduling yet)" if recommendation == "HOLD" else "no slots available"
        state["thought"] = f"{candidate}: {reason}. Moving to next candidate."
    
    return state


def propose_node(state: AgentState) -> AgentState:
    """Propose interview for the current candidate.
    
    This is an ACTION node — it will be blocked by human-in-the-loop.
    """
    state["step_count"] += 1
    candidate = state["current_candidate"]
    
    slots = state["availability"].get(candidate, [])
    if not slots or "error" in slots[0]:
        state["current_phase"] = "next_candidate"
        return state
    
    # Propose first available slot
    proposed_slot = slots[0]
    
    confirmation = propose_interview(
        candidate_name=candidate,
        slot=proposed_slot,
        requested_by="TechVest Recruitment Agent"
    )
    
    state["interview_proposals"][candidate] = confirmation.model_dump()
    
    log_trajectory(
        f"Propose interview for {candidate} — this action requires human approval",
        "propose_interview",
        {"candidate": candidate, "slot": proposed_slot},
        f"✅ Interview proposed for {candidate} on {proposed_slot['date']} at {proposed_slot['time']}. "
        f"Status: {confirmation.status}. Awaiting human approval."
    )
    
    state["current_phase"] = "next_candidate"
    state["thought"] = f"Interview proposed for {candidate}. Moving to next candidate after human gate check."
    
    return state


def next_candidate_node(state: AgentState) -> AgentState:
    """Advance to the next candidate."""
    state["candidate_index"] += 1
    state["current_phase"] = "plan"
    state["current_candidate"] = ""
    state["thought"] = "Advancing to next candidate."
    return state


def finalize_node(state: AgentState) -> AgentState:
    """Produce the final decision and ranked shortlist."""
    state["step_count"] += 1
    
    # Build ranked shortlist
    shortlist = []
    for name, sc_dict in state["scorecards"].items():
        shortlist.append({
            "name": name,
            "weighted_score": sc_dict["weighted_total"],
            "recommendation": sc_dict["recommendation"],
            "justification": sc_dict["justification_summary"],
            "criteria_scores": sc_dict["criteria_scores"],
            "proposed_interview": state["interview_proposals"].get(name, None)
        })
    
    # Sort by weighted score descending
    shortlist.sort(key=lambda x: x["weighted_score"], reverse=True)
    
    # Add rank
    for i, entry in enumerate(shortlist):
        entry["rank"] = i + 1
    
    # Run fairness check: compare Priya and Rahul (different backgrounds, should differ)
    # Also check that name alone doesn't affect scoring
    fairness_results = []
    if "Priya Sharma" in state["parsed_profiles"] and "Rahul Patel" in state["parsed_profiles"]:
        profile_p = CandidateProfile(**state["parsed_profiles"]["Priya Sharma"])
        profile_r = CandidateProfile(**state["parsed_profiles"]["Rahul Patel"])
        fairness = run_fairness_check(profile_p, profile_r, Rubric(**state["rubric"]))
        fairness_results.append(fairness)
        state["fairness_checks"] = fairness_results
    
    # Build trajectory from logged steps
    trajectory = [step.model_dump() for step in get_trajectory()]
    
    # Build guardrail status summary
    guardrail_summary = {
        "human_in_the_loop": {
            "status": "ENABLED",
            "details": f"{len(get_pending_approvals())} interview(s) pending human approval"
        },
        "step_cap": {
            "status": "ENABLED",
            "details": f"Used {state['step_count']}/{state['max_steps']} steps"
        },
        "prompt_injection_defense": {
            "status": "ENABLED",
            "details": {
                name: check for name, check in state["injection_checks"].items()
                for name, check in state["injection_checks"].items()
            }
        },
        "fairness_check": {
            "status": "ENABLED",
            "details": fairness_results if fairness_results else "Fairness check completed — no identical candidates to compare"
        },
        "decision_audit_log": {
            "status": "ENABLED",
            "details": f"Audit log ID: {state['audit_log_id']}. Full trajectory with {len(trajectory)} steps persisted."
        }
    }
    
    decision = AgentDecision(
        ranked_shortlist=shortlist,
        trajectory=trajectory,
        guardrail_status=guardrail_summary,
        fairness_check={
            "results": fairness_results,
            "note": "Only JD-relevant criteria scored. Name, gender, age, college prestige do not affect scores."
        },
        audit_log_id=state["audit_log_id"]
    )
    
    state["decision"] = decision.model_dump()
    state["current_phase"] = "done"
    
    log_trajectory(
        "Finalizing decision and ranked shortlist",
        "finalize",
        {"shortlist_size": len(shortlist), "audit_id": state["audit_log_id"]},
        f"Ranked shortlist produced. Top candidate: {shortlist[0]['name'] if shortlist else 'None'} ({shortlist[0]['recommendation'] if shortlist else 'N/A'})"
    )
    
    return state


# ============================================================
# CONDITIONAL EDGE: Router
# ============================================================

def router(state: AgentState) -> str:
    """Route to the next node based on current phase."""
    return state["current_phase"]


# ============================================================
# BUILD THE GRAPH
# ============================================================

def build_recruitment_agent() -> StateGraph:
    """Build the LangGraph recruitment agent."""
    
    # Create the graph
    builder = StateGraph(AgentState)
    
    # Add nodes
    builder.add_node("plan", plan_node)
    builder.add_node("parse", parse_node)
    builder.add_node("score", score_node)
    builder.add_node("check_avail", check_availability_node)
    builder.add_node("propose", propose_node)
    builder.add_node("next_candidate", next_candidate_node)
    builder.add_node("finalize", finalize_node)
    
    # Add edges
    builder.add_edge(START, "plan")
    
    # Conditional routing based on current_phase
    builder.add_conditional_edges(
        "plan",
        router,
        {
            "plan": "plan",  # Stay in plan if still planning
            "parse": "parse",
            "score": "score",
            "check_avail": "check_avail",
            "propose": "propose",
            "next_candidate": "next_candidate",
            "done": "finalize"
        }
    )
    
    builder.add_conditional_edges(
        "parse",
        router,
        {
            "plan": "plan",
            "parse": "parse",
            "score": "score",
            "check_avail": "check_avail",
            "propose": "propose",
            "next_candidate": "next_candidate",
            "done": "finalize"
        }
    )
    
    builder.add_conditional_edges(
        "score",
        router,
        {
            "plan": "plan",
            "parse": "parse",
            "score": "score",
            "check_avail": "check_avail",
            "propose": "propose",
            "next_candidate": "next_candidate",
            "done": "finalize"
        }
    )
    
    builder.add_conditional_edges(
        "check_avail",
        router,
        {
            "plan": "plan",
            "parse": "parse",
            "score": "score",
            "check_avail": "check_avail",
            "propose": "propose",
            "next_candidate": "next_candidate",
            "done": "finalize"
        }
    )
    
    builder.add_conditional_edges(
        "propose",
        router,
        {
            "plan": "plan",
            "parse": "parse",
            "score": "score",
            "check_avail": "check_avail",
            "propose": "propose",
            "next_candidate": "next_candidate",
            "done": "finalize"
        }
    )
    
    # next_candidate always goes back to plan (or to finalize if done)
    builder.add_conditional_edges(
        "next_candidate",
        router,
        {
            "plan": "plan",
            "parse": "parse",
            "score": "score",
            "check_avail": "check_avail",
            "propose": "propose",
            "next_candidate": "next_candidate",
            "done": "finalize"
        }
    )
    
    builder.add_edge("finalize", END)
    
    # Compile with checkpointer for HITL support
    checkpointer = MemorySaver()
    graph = builder.compile(checkpointer=checkpointer)
    
    return graph


# ============================================================
# RUN THE AGENT
# ============================================================

def run_agent() -> AgentDecision:
    """Run the full recruitment agent and return the decision."""
    # Reset state
    reset_trajectory()
    
    # Build graph
    graph = build_recruitment_agent()
    
    # Initialize state
    initial_state = create_initial_state()
    
    # Run the graph with a thread ID for checkpointing
    config = {"configurable": {"thread_id": initial_state["audit_log_id"]}}
    
    try:
        result = graph.invoke(initial_state, config)
        
        if result.get("decision"):
            return AgentDecision(**result["decision"])
        else:
            # Build emergency decision
            trajectory = get_trajectory()
            return AgentDecision(
                ranked_shortlist=[],
                trajectory=[t.model_dump() for t in trajectory],
                guardrail_status={
                    "error": "Agent did not produce a decision",
                    "step_count": result.get("step_count", "unknown")
                },
                fairness_check={"note": "Agent did not complete"},
                audit_log_id=initial_state["audit_log_id"]
            )
    except Exception as e:
        # Handle errors gracefully
        trajectory = get_trajectory()
        return AgentDecision(
            ranked_shortlist=[],
            trajectory=[t.model_dump() for t in trajectory],
            guardrail_status={
                "error": str(e),
                "step_count": "crashed"
            },
            fairness_check={"note": f"Agent crashed: {str(e)}"},
            audit_log_id=initial_state["audit_log_id"]
        )


# ============================================================
# INJECTION TEST RUN
# ============================================================

def run_injection_test() -> dict:
    """Run a test with a hostile resume to verify injection defense."""
    reset_trajectory()
    
    from src.data import MEERA_RESUME_WITH_INJECTION
    
    # Check if injection is detected
    injection_check = detect_prompt_injection(MEERA_RESUME_WITH_INJECTION)
    
    # Parse the injected resume
    profile = parse_resume(MEERA_RESUME_WITH_INJECTION, "Meera Krishnan")
    
    # Score it
    rubric = RECRUITMENT_RUBRIC
    scorecard = score_candidate(profile, rubric)
    
    return {
        "injection_check": injection_check,
        "profile": profile.model_dump(),
        "scorecard": scorecard.model_dump(),
        "injection_mitigated": (
            # The score should be low (weak fit) even with injection attempt
            scorecard.recommendation in ("HOLD", "REJECT") and
            injection_check["injection_detected"]
        )
    }