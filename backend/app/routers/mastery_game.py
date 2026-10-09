from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.services.auth_service import get_current_user
from app.services.mastery_game_service import (
    mastery_game_service,
    MASTER_QUESTS,
    OOP_BOSS_CHALLENGE,
    SKILL_GRAPH_DEFINITIONS
)
from app.models.mastery_game import (
    SkillUniverseResponse,
    SkillProgressNode,
    MasteryQuest,
    QuestEvaluationRequest,
    QuestEvaluationResult,
    BossChallenge
)

router = APIRouter(prefix="/api/mastery", tags=["SkillForge Mastery Game"])

async def _resolve_learner_id(current_user: dict, db) -> str:
    learner_id = current_user.get("learner_id") or current_user.get("active_learner_id")
    if not learner_id and current_user.get("id"):
        caretaker_id = str(current_user.get("id"))
        student = await db["students"].find_one({"caretaker_id": caretaker_id})
        if not student:
            student = await db["learners"].find_one({"$or": [{"caretaker_id": caretaker_id}, {"caregiver_id": caretaker_id}]})
        if student:
            learner_id = str(student.get("id", student.get("_id")))
    if not learner_id:
        learner_id = f"learner_{current_user.get('id', 'default')}"
    return learner_id

@router.get("/universe", response_model=SkillUniverseResponse)
async def get_skill_universe(current_user: dict = Depends(get_current_user)):
    """Returns the full Skill Universe node map, progress, gates, and next quest."""
    db = get_database()
    learner_id = await _resolve_learner_id(current_user, db)
    return await mastery_game_service.get_or_initialize_universe(learner_id)

@router.get("/skills/{skill_id}")
async def get_skill_details(skill_id: str, current_user: dict = Depends(get_current_user)):
    """Returns granular competency breakdown, confidence, and prerequisites for a skill."""
    db = get_database()
    learner_id = await _resolve_learner_id(current_user, db)
    universe = await mastery_game_service.get_or_initialize_universe(learner_id)
    
    node = next((n for n in universe.nodes if n.skill_id == skill_id), None)
    if not node:
        raise HTTPException(status_code=404, detail="Skill not found in universe.")
    
    return node

@router.get("/quests/recommended")
async def get_recommended_quest(current_user: dict = Depends(get_current_user)):
    """Returns dynamically computed next quest based on current skill gaps and frontier."""
    db = get_database()
    learner_id = await _resolve_learner_id(current_user, db)
    universe = await mastery_game_service.get_or_initialize_universe(learner_id)
    
    if not universe.next_quest:
        return MASTER_QUESTS["quest_fundamentals"]
    return universe.next_quest

@router.get("/quests/{quest_id}", response_model=MasteryQuest)
async def get_quest_by_id(quest_id: str, current_user: dict = Depends(get_current_user)):
    """Returns a 5-stage learning and challenge quest."""
    quest = MASTER_QUESTS.get(quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found.")
    return quest

@router.post("/quests/{quest_id}/evaluate", response_model=QuestEvaluationResult)
async def evaluate_quest_attempt(
    quest_id: str,
    payload: QuestEvaluationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Evaluates quest submission, computes mastery delta, evolves skills,
    unlocks gates, and awards verified Learning XP.
    """
    db = get_database()
    learner_id = await _resolve_learner_id(current_user, db)
    
    submissions = [s.model_dump() for s in payload.stage_submissions]
    return await mastery_game_service.evaluate_quest_attempt(learner_id, quest_id, submissions)

@router.get("/boss", response_model=BossChallenge)
async def get_boss_challenge(current_user: dict = Depends(get_current_user)):
    """Returns the OOP Boss Challenge for major milestone synthesis."""
    return OOP_BOSS_CHALLENGE

@router.post("/boss/evaluate")
async def evaluate_boss_challenge(
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Evaluates OOP Boss Challenge attempt."""
    db = get_database()
    learner_id = await _resolve_learner_id(current_user, db)
    
    boss_id = payload.get("boss_id", "boss_oop_fleet")
    submissions = payload.get("scenario_submissions", [])
    return await mastery_game_service.evaluate_boss_challenge(learner_id, boss_id, submissions)

@router.get("/profile")
async def get_mastery_profile(current_user: dict = Depends(get_current_user)):
    """Returns dual-track Learning XP vs. Activity Time, Learner Level, and Achievements."""
    db = get_database()
    learner_id = await _resolve_learner_id(current_user, db)
    universe = await mastery_game_service.get_or_initialize_universe(learner_id)
    
    return {
        "learner_id": learner_id,
        "level": universe.level,
        "level_title": universe.level_title,
        "learning_xp": universe.learning_xp,
        "activity_minutes": universe.activity_minutes,
        "mastery_streak": universe.mastery_streak,
        "achievements": universe.achievements
    }
