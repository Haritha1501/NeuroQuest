import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_database, connect_to_mongo
from app.services.mastery_game_service import mastery_game_service, MASTER_QUESTS, OOP_BOSS_CHALLENGE

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    asyncio.run(connect_to_mongo())

def test_scenario_1_beginner_path_and_locked_gates():
    """
    Scenario 1 — Beginner:
    Fundamentals = 70%, OOP = 35%, Inheritance = 20%.
    Expected:
    - Foundation quest active or developing
    - Inheritance needs practice
    - Polymorphism strictly locked requiring Inheritance >= 70%
    """
    async def run_test():
        db = get_database()
        learner_id = "test_learner_beginner_01"

        # Seed calibration profile
        await db["calibration_profiles"].insert_one({
            "learner_id": learner_id,
            "skills": [
                {"skill": "Fundamentals", "status": "PROFICIENT", "mastery_score": 0.70, "evidence_count": 3},
                {"skill": "Methods", "status": "DEVELOPING", "mastery_score": 0.50, "evidence_count": 2},
                {"skill": "OOP Basics", "status": "NEEDS_PRACTICE", "mastery_score": 0.35, "evidence_count": 2},
                {"skill": "Inheritance", "status": "NEEDS_PRACTICE", "mastery_score": 0.20, "evidence_count": 1},
                {"skill": "Polymorphism", "status": "NOT_ASSESSED", "mastery_score": None, "evidence_count": 0},
                {"skill": "Collections", "status": "NOT_ASSESSED", "mastery_score": None, "evidence_count": 0}
            ]
        })

        universe = await mastery_game_service.get_or_initialize_universe(learner_id)
        
        # Verify Fundamentals unlocked
        fund_node = next(n for n in universe.nodes if n.skill_id == "fundamentals")
        assert fund_node.is_unlocked is True
        assert fund_node.current_mastery == 0.70

        # Verify Inheritance needs practice
        inher_node = next(n for n in universe.nodes if n.skill_id == "inheritance")
        assert inher_node.current_mastery == 0.20
        assert inher_node.mastery_status == "NEEDS_PRACTICE"

        # Verify Polymorphism is strictly locked
        poly_node = next(n for n in universe.nodes if n.skill_id == "polymorphism")
        assert poly_node.is_unlocked is False
        assert "Inheritance" in poly_node.lock_reason
        assert "70%" in poly_node.lock_reason

    asyncio.run(run_test())

def test_scenario_2_fast_learner_skips_basics_unlocks_advanced():
    """
    Scenario 2 — Fast Learner:
    Fundamentals = 95%, OOP = 90%, Inheritance = 88%.
    Expected:
    - Beginner quests skipped as already demonstrated
    - Polymorphism unlocked
    """
    async def run_test():
        db = get_database()
        learner_id = "test_learner_fast_02"

        await db["calibration_profiles"].insert_one({
            "learner_id": learner_id,
            "skills": [
                {"skill": "Fundamentals", "status": "MASTERED", "mastery_score": 0.95, "evidence_count": 5},
                {"skill": "Methods", "status": "MASTERED", "mastery_score": 0.92, "evidence_count": 4},
                {"skill": "OOP Basics", "status": "MASTERED", "mastery_score": 0.90, "evidence_count": 5},
                {"skill": "Inheritance", "status": "MASTERED", "mastery_score": 0.88, "evidence_count": 4},
                {"skill": "Polymorphism", "status": "NOT_ASSESSED", "mastery_score": None, "evidence_count": 0},
                {"skill": "Collections", "status": "NOT_ASSESSED", "mastery_score": None, "evidence_count": 0}
            ]
        })

        universe = await mastery_game_service.get_or_initialize_universe(learner_id)
        
        # Verify Fundamentals & OOP are skipped as known
        fund_node = next(n for n in universe.nodes if n.skill_id == "fundamentals")
        assert fund_node.is_skipped_as_known is True
        
        inher_node = next(n for n in universe.nodes if n.skill_id == "inheritance")
        assert inher_node.is_skipped_as_known is True
        assert inher_node.current_mastery == 0.88

        # Polymorphism prerequisite (Inheritance >= 70%) is met!
        poly_node = next(n for n in universe.nodes if n.skill_id == "polymorphism")
        assert poly_node.is_unlocked is True
        assert poly_node.lock_reason is None

        # Next recommended quest should be Polymorphism or active frontier
        assert universe.active_node_id in ["polymorphism", "collections"]

    asyncio.run(run_test())

def test_scenario_3_learner_improves_evolves_skill_and_unlocks_gate():
    """
    Scenario 3 — Learner Improves:
    Before: Inheritance = 40% (Sprout / Developing), Polymorphism locked.
    After successful 5-stage challenge:
    Inheritance = 72% (+32% mastery), status: DEVELOPING -> PROFICIENT,
    evolution: SPROUT -> STRONG, Polymorphism unlocked, Learning XP awarded.
    """
    async def run_test():
        db = get_database()
        learner_id = "test_learner_improves_03"

        # Seed pre-challenge state
        await db["skill_mastery_states"].insert_one({
            "learner_id": learner_id,
            "skills": {
                "fundamentals": {"current_mastery": 0.85, "status": "MASTERED", "evidence_count": 4},
                "methods": {"current_mastery": 0.80, "status": "PROFICIENT", "evidence_count": 3},
                "oop_basics": {"current_mastery": 0.75, "status": "PROFICIENT", "evidence_count": 3},
                "inheritance": {"current_mastery": 0.40, "status": "DEVELOPING", "evidence_count": 2},
                "polymorphism": {"current_mastery": None, "status": "NOT_ASSESSED", "evidence_count": 0}
            }
        })

        # Submit perfect answers to Inheritance 5-stage quest
        quest = MASTER_QUESTS["quest_inheritance"]
        submissions = [
            {"stage_number": stage.stage_number, "selected_answer": stage.correct_answer, "hint_used": False}
            for stage in quest.stages
        ]

        result = await mastery_game_service.evaluate_quest_attempt(learner_id, quest.id, submissions)

        # Verify Before -> After
        assert result.mastery_before == 0.40
        assert result.mastery_after >= 0.70
        assert result.gain_percentage >= 25.0
        assert result.status_after == "PROFICIENT"
        assert result.evolution_after == "strong"
        assert result.is_completed is True

        # Verify Polymorphism was unlocked
        assert any("Polymorphism" in s for s in result.unlocked_skills)
        assert result.learning_xp_earned >= 100

        # Check universe state post-quest
        universe_after = await mastery_game_service.get_or_initialize_universe(learner_id)
        poly_node = next(n for n in universe_after.nodes if n.skill_id == "polymorphism")
        assert poly_node.is_unlocked is True

    asyncio.run(run_test())

def test_scenario_4_learner_struggles_no_false_mastery_no_punishment():
    """
    Scenario 4 — Learner Struggles:
    Before: Inheritance = 60%.
    After poor performance:
    Mastery does NOT falsely increase (drops slightly or stays conservative: e.g. 58%),
    No XP is deducted, supportive feedback is provided.
    """
    async def run_test():
        db = get_database()
        learner_id = "test_learner_struggles_04"

        await db["skill_mastery_states"].insert_one({
            "learner_id": learner_id,
            "skills": {
                "inheritance": {"current_mastery": 0.60, "status": "DEVELOPING", "evidence_count": 3}
            }
        })

        quest = MASTER_QUESTS["quest_inheritance"]
        # Submit incorrect answers
        submissions = [
            {"stage_number": stage.stage_number, "selected_answer": "Definitely wrong answer", "hint_used": True}
            for stage in quest.stages
        ]

        result = await mastery_game_service.evaluate_quest_attempt(learner_id, quest.id, submissions)

        # Must not falsely increase mastery!
        assert result.mastery_after <= 0.60
        assert result.is_completed is False
        assert result.learning_xp_earned == 0
        assert result.remedial_feedback is not None
        assert "developing" in result.remedial_feedback.lower()

    asyncio.run(run_test())

def test_scenario_5_untested_skill_remains_not_assessed_never_zero():
    """
    Scenario 5 — Untested Skill:
    Collections = NOT_ASSESSED.
    Must be preserved with mastery_score = None and status = NOT_ASSESSED.
    Never display 0%.
    """
    async def run_test():
        learner_id = "test_learner_untested_05"
        universe = await mastery_game_service.get_or_initialize_universe(learner_id)

        coll_node = next(n for n in universe.nodes if n.skill_id == "collections")
        assert coll_node.mastery_status == "NOT_ASSESSED"
        assert coll_node.current_mastery is None
        assert coll_node.evolution_stage == "unexplored"

    asyncio.run(run_test())

def test_scenario_6_dual_track_learning_xp_vs_activity_time():
    """
    Scenario 6 — Learning XP vs Activity Time:
    Separate concepts: Learning XP comes only from demonstrated learning evidence;
    activity time does not automatically become Learning XP.
    """
    async def run_test():
        db = get_database()
        learner_id = "test_learner_dual_track_06"

        await db["learner_mastery_profiles"].insert_one({
            "learner_id": learner_id,
            "learning_xp": 250,
            "activity_minutes": 80,
            "mastery_streak_days": 2
        })

        universe = await mastery_game_service.get_or_initialize_universe(learner_id)
        assert universe.learning_xp == 250
        assert universe.activity_minutes == 80
        assert universe.learning_xp != universe.activity_minutes

    asyncio.run(run_test())

def test_scenario_7_level_system_driven_by_skills_mastered():
    """
    Scenario 7 — Level System:
    Level 1: Skill Explorer
    Level 2: Foundation Builder
    Level 3: Problem Solver
    Level 4: Skill Crafter
    Level 5: Advanced Thinker
    Level 6: Master
    """
    lvl, title = mastery_game_service.compute_learner_level(0, 0.20)
    assert lvl == 1 and title == "Skill Explorer"

    lvl, title = mastery_game_service.compute_learner_level(1, 0.45)
    assert lvl == 2 and title == "Foundation Builder"

    lvl, title = mastery_game_service.compute_learner_level(2, 0.60)
    assert lvl == 3 and title == "Problem Solver"

    lvl, title = mastery_game_service.compute_learner_level(3, 0.70)
    assert lvl == 4 and title == "Skill Crafter"

    lvl, title = mastery_game_service.compute_learner_level(4, 0.80)
    assert lvl == 5 and title == "Advanced Thinker"

    lvl, title = mastery_game_service.compute_learner_level(5, 0.90)
    assert lvl == 6 and title == "Master"

def test_scenario_8_oop_boss_challenge():
    """
    Scenario 8 — OOP Boss Challenge:
    Synthesizes multiple OOP concepts into an interactive challenge.
    """
    async def run_test():
        learner_id = "test_learner_boss_08"
        boss = OOP_BOSS_CHALLENGE

        # Correct scenario submissions
        submissions = [
            {"id": sc.id, "selected_answer": sc.correct_answer}
            for sc in boss.scenarios
        ]

        result = await mastery_game_service.evaluate_boss_challenge(learner_id, boss.id, submissions)
        assert result["passed"] is True
        assert result["correct_scenarios"] == 3
        assert result["xp_earned"] == 150
        assert "Conquered" in result["message"]

    asyncio.run(run_test())
