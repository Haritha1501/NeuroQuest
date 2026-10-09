from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, Optional
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.services.auth_service import get_current_user
from app.models.calibration import (
    CalibrationAnswerSubmit,
    LearnerSkillProfile,
    CalibrationSessionStatus,
    CalibrationQuestion
)
from app.services.knowledge_estimator import knowledge_estimator

router = APIRouter(prefix="/api/calibration", tags=["SkillForge Calibration"])

def _resolve_learner_id(current_user: dict) -> str:
    """Helper to resolve active learner ID from user context."""
    learner_id = current_user.get("learner_id") or current_user.get("active_learner_id")
    if not learner_id and current_user.get("id"):
        return f"learner_{current_user.get('id')}"
    return str(learner_id or "learner_default")

@router.get("/status", response_model=CalibrationSessionStatus)
async def get_calibration_status(current_user: dict = Depends(get_current_user)):
    """
    Checks whether the learner has completed SkillForge Calibration.
    Returns existing in-progress session if active, or previous profile if completed.
    """
    db = get_database()
    learner_id = _resolve_learner_id(current_user)

    # 1. Check profile in learner_skill_profiles
    profile_doc = await db["learner_skill_profiles"].find_one({"learner_id": learner_id})
    if profile_doc:
        profile_doc.pop("_id", None)
        return CalibrationSessionStatus(
            calibration_completed=True,
            current_question_index=profile_doc.get("total_questions_answered", 4),
            total_questions=profile_doc.get("total_questions_answered", 4),
            last_profile=LearnerSkillProfile(**profile_doc)
        )

    # 2. Check in-progress session
    active_session = await db["calibration_sessions"].find_one({
        "learner_id": learner_id,
        "status": "in_progress"
    })

    if active_session:
        return CalibrationSessionStatus(
            session_id=str(active_session["_id"]),
            calibration_completed=False,
            current_question_index=len(active_session.get("responses", [])),
            total_questions=active_session.get("target_questions_count", 4)
        )

    return CalibrationSessionStatus(
        calibration_completed=False,
        current_question_index=0,
        total_questions=4
    )

@router.post("/start")
async def start_calibration(current_user: dict = Depends(get_current_user)):
    """
    Starts a new SkillForge Calibration session.
    If an in-progress session exists, resumes seamlessly.
    Returns the first adaptive diagnostic question.
    """
    db = get_database()
    learner_id = _resolve_learner_id(current_user)

    # Check for existing in-progress session to handle page refreshes
    existing_session = await db["calibration_sessions"].find_one({
        "learner_id": learner_id,
        "status": "in_progress"
    })

    target_count = 4  # 3 to 5 questions (standard 4)

    if existing_session:
        responses = existing_session.get("responses", [])
        asked_ids = existing_session.get("asked_question_ids", [])
        
        # If already answered all, complete and return profile
        if len(responses) >= target_count:
            profile = knowledge_estimator.compute_skill_profile(learner_id, responses)
            return {
                "session_id": str(existing_session["_id"]),
                "completed": True,
                "profile": profile.model_dump()
            }
        
        # Otherwise select next question
        if responses:
            next_q = knowledge_estimator.select_next_question(responses, asked_ids, max_questions=target_count)
        else:
            next_q = knowledge_estimator.get_initial_question()

        if next_q:
            return {
                "session_id": str(existing_session["_id"]),
                "completed": False,
                "question": next_q,
                "question_number": len(responses) + 1,
                "total_target_questions": target_count
            }

    # Initialize a clean new session
    first_q = knowledge_estimator.get_initial_question()
    session_doc = {
        "learner_id": learner_id,
        "started_at": datetime.utcnow(),
        "status": "in_progress",
        "target_questions_count": target_count,
        "asked_question_ids": [first_q["id"]],
        "responses": []
    }

    res = await db["calibration_sessions"].insert_one(session_doc)
    session_id = str(res.inserted_id)

    return {
        "session_id": session_id,
        "completed": False,
        "question": first_q,
        "question_number": 1,
        "total_target_questions": target_count
    }

@router.post("/answer")
async def submit_calibration_answer(
    answer_data: CalibrationAnswerSubmit,
    current_user: dict = Depends(get_current_user)
):
    """
    Submits an answer for the active question.
    Updates knowledge state and returns the next adaptive question,
    or generates the final Skill Map if diagnostic is complete.
    """
    db = get_database()
    learner_id = _resolve_learner_id(current_user)

    # 1. Fetch session
    try:
        s_obj_id = ObjectId(answer_data.session_id)
        session = await db["calibration_sessions"].find_one({"_id": s_obj_id})
    except Exception:
        session = await db["calibration_sessions"].find_one({"_id": answer_data.session_id})

    if not session:
        raise HTTPException(status_code=404, detail="Calibration session not found.")

    if session.get("status") == "completed":
        profile_doc = await db["learner_skill_profiles"].find_one({"learner_id": learner_id})
        if profile_doc:
            profile_doc.pop("_id", None)
            return {"completed": True, "profile": profile_doc}

    # 2. Validate question and evaluate correctness
    q_meta = knowledge_estimator.question_map.get(answer_data.question_id)
    if not q_meta:
        raise HTTPException(status_code=404, detail="Question not found in calibration bank.")

    is_correct = (
        str(answer_data.selected_answer).strip().lower()
        == str(q_meta["correct_answer"]).strip().lower()
    )

    response_entry = {
        "question_id": answer_data.question_id,
        "skill": q_meta["skill"],
        "subskill": q_meta["subskill"],
        "difficulty": q_meta["difficulty"],
        "selected_answer": answer_data.selected_answer,
        "is_correct": is_correct,
        "response_time_seconds": max(0.5, answer_data.response_time_seconds),
        "expected_time_seconds": q_meta.get("estimated_time_seconds", 30),
        "attempt_count": answer_data.attempt_count,
        "hint_used": answer_data.hint_used,
        "confidence_level": answer_data.confidence_level or 0.6,
        "hesitation_seconds": answer_data.hesitation_seconds or 1.0,
        "answered_at": datetime.utcnow()
    }

    # 3. Append to session responses
    updated_responses = session.get("responses", []) + [response_entry]
    asked_ids = session.get("asked_question_ids", [])
    target_count = session.get("target_questions_count", 4)

    # 4. Check if calibration should conclude (e.g. 4 questions reached)
    if len(updated_responses) >= target_count:
        # Diagnostic complete! Compute final profile
        skill_profile = knowledge_estimator.compute_skill_profile(learner_id, updated_responses)
        profile_dict = skill_profile.model_dump()

        # Persist profile
        await db["learner_skill_profiles"].update_one(
            {"learner_id": learner_id},
            {"$set": profile_dict},
            upsert=True
        )

        # Mark session completed
        await db["calibration_sessions"].update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "responses": updated_responses
                }
            }
        )

        # Update learner_preferences and user record
        await db["learner_preferences"].update_one(
            {"learner_id": learner_id},
            {
                "$set": {
                    "calibration_completed": True,
                    "calibrated_at": datetime.utcnow(),
                    "recommended_starting_point": profile_dict.get("recommended_starting_point")
                }
            },
            upsert=True
        )

        return {
            "completed": True,
            "profile": profile_dict,
            "feedback": {
                "is_correct": is_correct,
                "explanation": q_meta.get("explanation")
            }
        }

    # 5. Otherwise, dynamically select next question
    next_q = knowledge_estimator.select_next_question(
        history=updated_responses,
        asked_ids=asked_ids,
        max_questions=target_count
    )

    if not next_q:
        # No more candidate questions, complete early
        skill_profile = knowledge_estimator.compute_skill_profile(learner_id, updated_responses)
        profile_dict = skill_profile.model_dump()
        await db["learner_skill_profiles"].update_one(
            {"learner_id": learner_id},
            {"$set": profile_dict},
            upsert=True
        )
        await db["calibration_sessions"].update_one(
            {"_id": session["_id"]},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow(), "responses": updated_responses}}
        )
        return {
            "completed": True,
            "profile": profile_dict,
            "feedback": {"is_correct": is_correct, "explanation": q_meta.get("explanation")}
        }

    # Record next question id in asked_ids
    new_asked_ids = asked_ids + [next_q["id"]]
    await db["calibration_sessions"].update_one(
        {"_id": session["_id"]},
        {
            "$set": {
                "responses": updated_responses,
                "asked_question_ids": new_asked_ids
            }
        }
    )

    return {
        "completed": False,
        "next_question": next_q,
        "question_number": len(updated_responses) + 1,
        "total_target_questions": target_count,
        "feedback": {
            "is_correct": is_correct,
            "explanation": q_meta.get("explanation")
        }
    }

@router.get("/result", response_model=LearnerSkillProfile)
async def get_calibration_result(current_user: dict = Depends(get_current_user)):
    """
    Fetches the learner's calibrated Skill Map and profile.
    """
    db = get_database()
    learner_id = _resolve_learner_id(current_user)

    profile_doc = await db["learner_skill_profiles"].find_one({"learner_id": learner_id})
    if not profile_doc:
        # Default mock profile if not yet taken
        default_p = knowledge_estimator.compute_skill_profile(learner_id, [])
        return default_p

    profile_doc.pop("_id", None)
    return LearnerSkillProfile(**profile_doc)

@router.post("/recalibrate")
async def recalibrate_skills(current_user: dict = Depends(get_current_user)):
    """
    Resets the calibration state so a learner can take the diagnostic again.
    """
    db = get_database()
    learner_id = _resolve_learner_id(current_user)

    await db["learner_skill_profiles"].delete_many({"learner_id": learner_id})
    await db["calibration_sessions"].delete_many({"learner_id": learner_id})
    await db["learner_preferences"].update_one(
        {"learner_id": learner_id},
        {"$set": {"calibration_completed": False}}
    )

    return {"message": "Calibration state reset. Ready for fresh calibration."}
