from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional

from app.database import get_database
from app.services.auth_service import get_current_user
from app.services.intelligence_layer_service import intelligence_layer_service
from app.models.intelligence_layer import (
    NextBestSkillRecommendation,
    SkillRevivalAssessment,
    RevivalSubmissionRequest,
    RevivalEvaluationResult,
    AIMentorQueryRequest,
    AIMentorResponse,
    InclusiveAdaptiveProfile
)

router = APIRouter(tags=["SkillForge Intelligence Layer (Features 3, 7, 10, 11, 14)"])


async def _resolve_learner_id(current_user: dict, db, override_learner_id: Optional[str] = None) -> str:
    if override_learner_id:
        return override_learner_id
    learner_id = current_user.get("learner_id") or current_user.get("active_learner_id")
    if not learner_id and current_user.get("id"):
        caretaker_id = str(current_user.get("id"))
        student = await db["students"].find_one({"caretaker_id": caretaker_id})
        if not student:
            student = await db["learners"].find_one(
                {"$or": [{"caretaker_id": caretaker_id}, {"caregiver_id": caretaker_id}]}
            )
        if student:
            learner_id = str(student.get("id", student.get("_id")))
    if not learner_id:
        learner_id = f"learner_{current_user.get('id', 'default')}"
    return learner_id


# ==============================================================================
# FEATURE 3 & 7: NEXT-BEST-SKILL ENGINE & HERO RECOMMENDATION
# ==============================================================================
@router.get("/api/intelligence/next-best-skill", response_model=NextBestSkillRecommendation)
@router.get("/intelligence/next-best-skill", response_model=NextBestSkillRecommendation)
async def get_next_best_skill(
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Evaluates candidate skills across weighted factors (Skill Gap, Prereq Readiness,
    Learning Value, Retention Need, Difficulty Fit) and outputs explainable recommendation.
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    return await intelligence_layer_service.compute_next_best_skill(resolved_id)


# ==============================================================================
# FEATURE 10: KNOWLEDGE DECAY & SKILL REVIVAL
# ==============================================================================
@router.get("/api/intelligence/revival/{skill_id}", response_model=SkillRevivalAssessment)
@router.get("/intelligence/revival/{skill_id}", response_model=SkillRevivalAssessment)
async def get_skill_revival(
    skill_id: str,
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns a rapid 3-question targeted revival check (recall, application, challenge)
    for a decayed or at-risk skill, showing previous mastery and estimated retention.
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    return await intelligence_layer_service.get_skill_revival_assessment(resolved_id, skill_id)


@router.post("/api/intelligence/revival/{skill_id}/submit", response_model=RevivalEvaluationResult)
@router.post("/intelligence/revival/{skill_id}/submit", response_model=RevivalEvaluationResult)
async def submit_skill_revival(
    skill_id: str,
    payload: RevivalSubmissionRequest,
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Evaluates revival answers non-punitively:
    - 3/3 Correct: Full restoration (92%+)
    - 2/3 Correct: Partial restoration (76%+) with quick refresher
    - <=1 Correct: Identifies specific gap for adaptive re-learning without penalty
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    return await intelligence_layer_service.evaluate_skill_revival(
        learner_id=resolved_id,
        skill_id=skill_id,
        answers=payload.answers
    )


# ==============================================================================
# FEATURE 11: CONTEXT-AWARE AI MENTOR
# ==============================================================================
@router.post("/api/intelligence/mentor/ask", response_model=AIMentorResponse)
@router.post("/intelligence/mentor/ask", response_model=AIMentorResponse)
async def ask_ai_mentor(
    payload: AIMentorQueryRequest,
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Provides context-aware pedagogical guidance (explain, example, hint 1->2->3,
    reframe, check, simplify, challenge) injected with live learner state.
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    return await intelligence_layer_service.consult_ai_mentor(
        learner_id=resolved_id,
        prompt=payload.learner_query,
        mode=payload.mode,
        target_skill=payload.skill_id,
        hint_step=payload.hint_step
    )


# ==============================================================================
# FEATURE 14: INCLUSIVE ADAPTIVE LEARNING (SDG 10)
# ==============================================================================
@router.get("/api/intelligence/adaptive-profile", response_model=InclusiveAdaptiveProfile)
@router.get("/intelligence/adaptive-profile", response_model=InclusiveAdaptiveProfile)
async def get_adaptive_profile(
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves the learner's inclusive adaptive configuration (content chunking,
    visual density, guided hints, focus mode) ensuring equal competency goals.
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    return await intelligence_layer_service.get_inclusive_adaptive_profile(resolved_id)


@router.post("/api/intelligence/adaptive-profile", response_model=InclusiveAdaptiveProfile)
@router.post("/intelligence/adaptive-profile", response_model=InclusiveAdaptiveProfile)
async def update_adaptive_profile(
    updates: Dict[str, Any],
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Updates the learner's interaction and accessibility preferences.
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    return await intelligence_layer_service.update_inclusive_adaptive_profile(resolved_id, updates)


# ==============================================================================
# PERSONA SWITCHER & DEMO TESTING SUITE
# ==============================================================================
@router.get("/api/intelligence/personas")
@router.get("/intelligence/personas")
async def get_personas():
    """
    Returns available test personas for evaluating different learner paths
    and recommendation responses.
    """
    return [
        {
            "persona_id": "beginner",
            "name": "Persona 1: Alex (Brand New Learner)",
            "subtitle": "Zero History • Needs Foundational Calibration",
            "description": "First time entering platform. Recommends Fundamentals or Calibration.",
            "expected_recommendation": "Java Fundamentals (Variables & Basic Types)"
        },
        {
            "persona_id": "fast_learner",
            "name": "Persona 2: Maya (Fast Learner)",
            "subtitle": "Solid Fundamentals • Ready to Advance",
            "description": "Mastered Variables & Methods. Ready for OOP & Inheritance.",
            "expected_recommendation": "Java OOP Basics & Class Design"
        },
        {
            "persona_id": "struggling_learner",
            "name": "Persona 3: Sam (Struggling Learner)",
            "subtitle": "Has Knowledge Gaps • High Error Signals",
            "description": "Has tried Inheritance but failed Method Overriding. Recommends Prerequisite Gap.",
            "expected_recommendation": "Methods & Parameters Gap Refresher"
        },
        {
            "persona_id": "decayed_learner",
            "name": "Persona 4: Jordan (Decayed Skill Learner)",
            "subtitle": "Previously Mastered • Inactive for 18 Days",
            "description": "Mastered Inheritance 18 days ago. Recommends Non-Punitive Skill Revival.",
            "expected_recommendation": "Skill Revival: Java Inheritance (2-Min Check)"
        },
        {
            "persona_id": "low_engagement",
            "name": "Persona 5: Chris (Bite-Sized / SDG 10)",
            "subtitle": "Micro-Chunked • Low Distraction • High Visual Focus",
            "description": "Prefers bite-sized challenges, reduced clutter, proactive hints.",
            "expected_recommendation": "Inheritance (Bite-Sized Micro-Quest)"
        }
    ]


@router.post("/api/intelligence/personas/{persona_id}/activate")
@router.post("/intelligence/personas/{persona_id}/activate")
async def activate_persona(
    persona_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Instantly activates one of the 5 test personas for the current user session,
    seeding the required skill states and adaptive profile for live demo validation.
    """
    user_id = current_user.get("_id") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    return await intelligence_layer_service.activate_test_persona(user_id, persona_id)
