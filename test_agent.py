"""Test script for the TechVest Recruitment Agent."""
from src.agent import run_agent, run_injection_test
from src.tools import get_trajectory, get_pending_approvals


def test_full_agent():
    """Test the full recruitment agent pipeline."""
    print("=" * 70)
    print("TECHVEST RECRUITMENT AGENT - FULL TEST")
    print("=" * 70)
    
    decision = run_agent()
    
    print(f"\n📊 DECISION PRODUCED: {len(decision.ranked_shortlist)} candidates")
    print(f"   Audit ID: {decision.audit_log_id}")
    print(f"   Trajectory Steps: {len(decision.trajectory)}")
    
    print("\n🏆 RANKED SHORTLIST:")
    for s in decision.ranked_shortlist:
        print(f"   #{s['rank']} {s['name']}: {s['weighted_score']}/5 - {s['recommendation']}")
    
    print("\n🛡️ GUARDRAIL STATUS:")
    for name, details in decision.guardrail_status.items():
        status = details.get("status", "UNKNOWN")
        print(f"   {name}: {status}")
    
    print("\n⚖️ FAIRNESS CHECK:")
    fc = decision.fairness_check
    print(f"   {fc.get('note', 'N/A')}")
    
    print("\n📝 TRAJECTORY SAMPLE (first 5 steps):")
    for step in decision.trajectory[:5]:
        step_num = step.step_number if hasattr(step, 'step_number') else step.get('step_number', '?')
        action = step.action if hasattr(step, 'action') else step.get('action', '?')
        thought = step.thought if hasattr(step, 'thought') else step.get('thought', '?')
        print(f"   Step {step_num}: {action} - {thought[:60]}")
    
    # Verify
    assert len(decision.ranked_shortlist) > 0, "No candidates in shortlist!"
    assert decision.audit_log_id, "No audit log ID!"
    assert len(decision.trajectory) > 0, "No trajectory recorded!"
    
    print("\n✅ FULL AGENT TEST PASSED!")
    return decision


def test_injection_defense():
    """Test that prompt injection is detected and mitigated."""
    print("\n" + "=" * 70)
    print("PROMPT INJECTION DEFENSE TEST")
    print("=" * 70)
    
    result = run_injection_test()
    
    injection_check = result.get("injection_check", {})
    scorecard = result.get("scorecard", {})
    mitigated = result.get("injection_mitigated", False)
    
    print(f"\n🔍 Injection Detected: {injection_check.get('injection_detected', False)}")
    print(f"   Severity: {injection_check.get('severity', 'NONE')}")
    print(f"   Categories: {list(injection_check.get('categories', {}).keys())}")
    
    print(f"\n📊 Score Despite Injection: {scorecard.get('weighted_total', 'N/A')}/5")
    print(f"   Recommendation: {scorecard.get('recommendation', 'N/A')}")
    
    if mitigated:
        print("\n✅ INJECTION DEFENSE TEST PASSED!")
    else:
        print("\n⚠️ Injection defense needs review")
    
    return result


def test_fairness_principle():
    """Verify fairness: same skills should produce same scores regardless of name."""
    print("\n" + "=" * 70)
    print("FAIRNESS PRINCIPLE TEST")
    print("=" * 70)
    
    from src.schemas import CandidateProfile, Rubric
    from src.data import RECRUITMENT_RUBRIC
    from src.tools import score_candidate
    
    # Create two profiles with identical skills but different names
    profile_a = CandidateProfile(
        name="Candidate A",
        skills=["python", "machine learning", "tensorflow", "git"],
        years_of_experience=2.0,
        education=["B.Tech Computer Science"],
        projects=["Built ML model for classification achieving 90% accuracy",
                   "Deployed model using FastAPI and Docker"],
        certifications=["AWS Certified"],
        raw_resume_snippet="Fairness test candidate A"
    )
    
    profile_b = CandidateProfile(
        name="Candidate B",
        skills=["python", "machine learning", "tensorflow", "git"],
        years_of_experience=2.0,
        education=["B.Tech Computer Science"],
        projects=["Built ML model for classification achieving 90% accuracy",
                   "Deployed model using FastAPI and Docker"],
        certifications=["AWS Certified"],
        raw_resume_snippet="Fairness test candidate B"
    )
    
    rubric = RECRUITMENT_RUBRIC
    
    scorecard_a = score_candidate(profile_a, rubric)
    scorecard_b = score_candidate(profile_b, rubric)
    
    print(f"\n📊 {profile_a.name}: {scorecard_a.weighted_total}/5 - {scorecard_a.recommendation.value}")
    print(f"📊 {profile_b.name}: {scorecard_b.weighted_total}/5 - {scorecard_b.recommendation.value}")
    
    scores_equal = scorecard_a.weighted_total == scorecard_b.weighted_total
    print(f"\nScores Equal: {scores_equal}")
    
    if scores_equal:
        print("✅ FAIRNESS PRINCIPLE TEST PASSED!")
    else:
        print("❌ FAIRNESS PRINCIPLE TEST FAILED! Identical candidates should score the same.")
    
    return scores_equal


if __name__ == "__main__":
    test_full_agent()
    test_injection_defense()
    test_fairness_principle()
    print("\n" + "=" * 70)
    print("ALL TESTS COMPLETE")
    print("=" * 70)