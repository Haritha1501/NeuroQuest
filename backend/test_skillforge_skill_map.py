import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_database, connect_to_mongo
from app.services.skill_map_service import skill_map_service
from app.services.mastery_game_service import mastery_game_service, MASTER_QUESTS

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    asyncio.run(connect_to_mongo())


def test_scenario_1_new_learner_not_assessed_never_zero():
    """
    Scenario 1 — New learner:
    Expected:
    - Unlocked untested skills have node_state = 'NOT_ASSESSED'
    - mastery_score is None and mastery_percentage is None (NEVER 0%)
    - Downstream skills with unmet prerequisites are 'LOCKED'
    """
    async def run_test():
        learner_id = "test_map_new_learner_01"
        smap = await skill_map_service.build_learner_skill_map(learner_id)

        fund_node = next(n for n in smap.nodes if n.skill_id == "fundamentals")
        assert fund_node.node_state == "NOT_ASSESSED"
        assert fund_node.mastery_score is None
        assert fund_node.mastery_percentage is None

        # Verify no unassessed skill is ever reported as 0%
        for node in smap.nodes:
            if node.evidence_count == 0:
                assert node.mastery_score is None
                assert node.mastery_percentage is None

    asyncio.run(run_test())


def test_scenario_2_calibration_populates_skill_map():
    """
    Scenario 2 — Calibration completed:
    Expected:
    Skill states populated from SkillForge Calibration profile (`learner_skill_profiles`).
    """
    async def run_test():
        db = get_database()
        learner_id = "test_map_calibrated_learner_02"

        await db["learner_skill_profiles"].update_one(
            {"learner_id": learner_id},
            {
                "$set": {
                    "learner_id": learner_id,
                    "skills": {
                        "Fundamentals": {
                            "skill_name": "Fundamentals",
                            "status": "ASSESSED",
                            "mastery_score": 0.92,
                            "mastery_level": "Strong",
                            "evidence_count": 3,
                            "strengths": ["Variables & primitive types"],
                            "gaps": []
                        },
                        "Methods": {
                            "skill_name": "Methods",
                            "status": "ASSESSED",
                            "mastery_score": 0.78,
                            "mastery_level": "Proficient",
                            "evidence_count": 2,
                            "strengths": ["Return types"],
                            "gaps": []
                        },
                        "OOP Basics": {
                            "skill_name": "OOP Basics",
                            "status": "ASSESSED",
                            "mastery_score": 0.86,
                            "mastery_level": "Strong",
                            "evidence_count": 3,
                            "strengths": ["Classes & objects"],
                            "gaps": []
                        },
                        "Inheritance": {
                            "skill_name": "Inheritance",
                            "status": "ASSESSED",
                            "mastery_score": 0.42,
                            "mastery_level": "Developing",
                            "evidence_count": 2,
                            "strengths": ["Basic extends syntax"],
                            "gaps": ["Method overriding"]
                        },
                        "Collections": {
                            "skill_name": "Collections",
                            "status": "NOT_ASSESSED",
                            "mastery_score": None,
                            "mastery_level": "Not Yet Assessed",
                            "evidence_count": 0,
                            "strengths": [],
                            "gaps": []
                        }
                    }
                }
            },
            upsert=True
        )

        smap = await skill_map_service.build_learner_skill_map(learner_id)
        node_by_id = {n.skill_id: n for n in smap.nodes}

        assert node_by_id["fundamentals"].node_state == "MASTERED"
        assert node_by_id["fundamentals"].mastery_percentage == 92
        assert node_by_id["oop_basics"].node_state == "MASTERED"
        assert node_by_id["oop_basics"].mastery_percentage == 86
        assert node_by_id["inheritance"].node_state == "NEEDS_PRACTICE"
        assert node_by_id["inheritance"].mastery_percentage == 42

        # "YOU ARE HERE" and Primary Gap should point to Inheritance (42%)
        assert smap.you_are_here_node_id == "inheritance"
        assert smap.primary_gap_node_id == "inheritance"
        assert node_by_id["inheritance"].is_you_are_here is True

    asyncio.run(run_test())


def test_scenario_3_4_5_skill_improves_and_unlocks_dependent_skills():
    """
    Scenario 3, 4 & 5 — Prerequisite Lock -> Skill Improves -> Dependent Skill Unlocks:
    Before:
      Inheritance = 40% (NEEDS_PRACTICE), Polymorphism = LOCKED (with clear lock explanation).
    Learner completes Inheritance quest ->
    After:
      Inheritance = 72% (MASTERED/PROFICIENT, evolution 'strong'),
      Polymorphism transitions from LOCKED to UNLOCKED with an available quest!
    """
    async def run_test():
        db = get_database()
        learner_id = "test_map_evolution_03"

        await db["skill_mastery_states"].update_one(
            {"learner_id": learner_id},
            {
                "$set": {
                    "learner_id": learner_id,
                    "skills": {
                        "fundamentals": {"current_mastery": 0.88, "status": "MASTERED", "evidence_count": 4},
                        "methods": {"current_mastery": 0.82, "status": "PROFICIENT", "evidence_count": 3},
                        "oop_basics": {"current_mastery": 0.78, "status": "PROFICIENT", "evidence_count": 3},
                        "inheritance": {"current_mastery": 0.40, "status": "NEEDS_PRACTICE", "evidence_count": 2},
                        "polymorphism": {"current_mastery": None, "status": "NOT_ASSESSED", "evidence_count": 0}
                    }
                }
            },
            upsert=True
        )

        # Scenario 4: Before quest, Polymorphism is LOCKED with dynamic reason
        map_before = await skill_map_service.build_learner_skill_map(learner_id)
        poly_before = next(n for n in map_before.nodes if n.skill_id == "polymorphism")
        inher_before = next(n for n in map_before.nodes if n.skill_id == "inheritance")

        assert inher_before.mastery_percentage == 40
        assert inher_before.node_state == "NEEDS_PRACTICE"
        assert poly_before.is_unlocked is False
        assert poly_before.node_state == "LOCKED"
        assert poly_before.why_locked is not None
        assert "Inheritance" in poly_before.why_locked
        assert any(p.skill_id == "inheritance" and p.is_met is False for p in poly_before.prerequisites)

        # Complete Inheritance 5-stage quest
        quest = MASTER_QUESTS["quest_inheritance"]
        submissions = [
            {"stage_number": st.stage_number, "selected_answer": st.correct_answer, "hint_used": False}
            for st in quest.stages
        ]
        await mastery_game_service.evaluate_quest_attempt(learner_id, quest.id, submissions)

        # Scenario 3 & 5: After quest, Inheritance >= 70% and Polymorphism is UNLOCKED!
        map_after = await skill_map_service.build_learner_skill_map(learner_id)
        poly_after = next(n for n in map_after.nodes if n.skill_id == "polymorphism")
        inher_after = next(n for n in map_after.nodes if n.skill_id == "inheritance")

        assert inher_after.mastery_percentage >= 70
        assert inher_after.node_state == "MASTERED"
        assert inher_after.evolution_stage == "strong"
        assert poly_after.is_unlocked is True
        assert poly_after.node_state == "NOT_ASSESSED"
        assert poly_after.quest_id == "quest_polymorphism"

    asyncio.run(run_test())


def test_scenario_6_7_different_learners_and_persistence():
    """
    Scenario 6 & 7 — Different Learners & Persistence:
    Learner A and Learner B share the same canonical graph structure,
    but see distinct personal skill maps that persist across reloads.
    """
    async def run_test():
        db = get_database()
        learner_a = "test_map_learner_A"
        learner_b = "test_map_learner_B"

        await db["skill_mastery_states"].update_one(
            {"learner_id": learner_a},
            {"$set": {"skills": {"fundamentals": {"current_mastery": 0.90, "evidence_count": 4}}}},
            upsert=True
        )
        await db["skill_mastery_states"].update_one(
            {"learner_id": learner_b},
            {"$set": {"skills": {"fundamentals": {"current_mastery": 0.32, "evidence_count": 2}}}},
            upsert=True
        )

        map_a = await skill_map_service.build_learner_skill_map(learner_a)
        map_b = await skill_map_service.build_learner_skill_map(learner_b)

        # Underlying curriculum graph definition is identical
        assert map_a.graph_definition["subject"] == map_b.graph_definition["subject"]
        assert len(map_a.graph_definition["nodes"]) == len(map_b.graph_definition["nodes"])

        # Personal learner states are distinct
        fund_a = next(n for n in map_a.nodes if n.skill_id == "fundamentals")
        fund_b = next(n for n in map_b.nodes if n.skill_id == "fundamentals")
        assert fund_a.mastery_percentage == 90
        assert fund_a.node_state == "MASTERED"
        assert fund_b.mastery_percentage == 32
        assert fund_b.node_state == "NEEDS_PRACTICE"

        # Scenario 7: Re-fetching Learner A returns the exact same persistent state
        map_a_reload = await skill_map_service.build_learner_skill_map(learner_a)
        fund_a_reload = next(n for n in map_a_reload.nodes if n.skill_id == "fundamentals")
        assert fund_a_reload.mastery_percentage == 90
        assert len(map_a_reload.focus_path) >= 2

    asyncio.run(run_test())
