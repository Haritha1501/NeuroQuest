from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional

from app.database import get_database
from app.services.auth_service import get_current_user
from app.services.skill_map_service import skill_map_service, CANONICAL_SKILL_NODES
from app.models.skill_map import DynamicSkillMapResponse, LearnerSkillStateNode

router = APIRouter(tags=["Feature 2: Dynamic Skill Map & Knowledge Graph"])


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


@router.get("/api/skills/map", response_model=DynamicSkillMapResponse)
@router.get("/skills/map", response_model=DynamicSkillMapResponse)
@router.get("/api/learner/skill-map", response_model=DynamicSkillMapResponse)
@router.get("/learner/skill-map", response_model=DynamicSkillMapResponse)
async def get_dynamic_skill_map(
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns the living Learner Knowledge Graph combining the canonical multi-level
    Skill Graph with the learner's real-time mastery, prerequisites, and focus path.
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    return await skill_map_service.build_learner_skill_map(resolved_id)


@router.get("/api/learner/focus-skills")
@router.get("/learner/focus-skills")
async def get_learner_focus_skills(
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns Smart Focus Mode simplified path:
    Current Skill -> Prerequisite Gap / Target Goal -> Next Skill -> Future Unlock,
    plus ranked candidate skills for the Next-Best-Skill recommendation engine.
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    skill_map = await skill_map_service.build_learner_skill_map(resolved_id)
    return {
        "learner_id": resolved_id,
        "you_are_here_node_id": skill_map.you_are_here_node_id,
        "next_recommended_node_id": skill_map.next_recommended_node_id,
        "primary_gap_node_id": skill_map.primary_gap_node_id,
        "focus_path": skill_map.focus_path,
        "candidate_skills": skill_map.candidate_skills
    }


@router.get("/api/skills/{skill_id}", response_model=LearnerSkillStateNode)
@router.get("/skills/{skill_id}", response_model=LearnerSkillStateNode)
async def get_skill_node_detail(
    skill_id: str,
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns detailed skill node metadata, mastery status, evidence, strengths,
    gaps, and explainability ('Why is this locked?' / 'Why is this recommended?').
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    skill_map = await skill_map_service.build_learner_skill_map(resolved_id)

    norm_id = skill_map_service._normalize_skill_key(skill_id)
    node = next((n for n in skill_map.nodes if n.skill_id == norm_id or n.skill_id == skill_id), None)
    if not node:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found in knowledge graph.")
    return node


@router.get("/api/skills/{skill_id}/progress")
@router.get("/skills/{skill_id}/progress")
async def get_skill_progress(
    skill_id: str,
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Returns evidence-based learner progress and decay status for a specific skill."""
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    skill_map = await skill_map_service.build_learner_skill_map(resolved_id)

    norm_id = skill_map_service._normalize_skill_key(skill_id)
    node = next((n for n in skill_map.nodes if n.skill_id == norm_id or n.skill_id == skill_id), None)
    if not node:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found.")

    return {
        "learner_id": resolved_id,
        "skill_id": node.skill_id,
        "skill_name": node.name,
        "mastery_score": node.mastery_score,
        "mastery_percentage": node.mastery_percentage,
        "previous_mastery": node.previous_mastery,
        "node_state": node.node_state,
        "mastery_status": node.mastery_status,
        "evolution_stage": node.evolution_stage,
        "evolution_label": node.evolution_label,
        "confidence": node.confidence,
        "evidence_count": node.evidence_count,
        "evidence_items": node.evidence_items,
        "strengths": node.strengths,
        "needs_practice": node.needs_practice,
        "last_assessed_at": node.last_assessed_at,
        "last_practiced_at": node.last_practiced_at,
        "refresh_recommended": node.refresh_recommended
    }


@router.get("/api/skills/{skill_id}/prerequisites")
@router.get("/skills/{skill_id}/prerequisites")
async def get_skill_prerequisites(
    skill_id: str,
    learner_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns dynamic prerequisite verification for a skill, including required mastery,
    learner's current mastery, whether each prerequisite is satisfied (✓/✗), and lock reason.
    """
    db = get_database()
    resolved_id = await _resolve_learner_id(current_user, db, learner_id)
    skill_map = await skill_map_service.build_learner_skill_map(resolved_id)

    norm_id = skill_map_service._normalize_skill_key(skill_id)
    node = next((n for n in skill_map.nodes if n.skill_id == norm_id or n.skill_id == skill_id), None)
    if not node:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found.")

    return {
        "skill_id": node.skill_id,
        "skill_name": node.name,
        "is_unlocked": node.is_unlocked,
        "node_state": node.node_state,
        "why_locked": node.why_locked,
        "why_here": node.why_here,
        "prerequisites": [p.model_dump() for p in node.prerequisites],
        "unlocks_skills": node.unlocks_skills
    }
