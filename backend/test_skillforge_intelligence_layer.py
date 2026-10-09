import pytest
import asyncio
from app.database import connect_to_mongo
from app.services.intelligence_layer_service import (
    intelligence_layer_service,
    RECOMMENDER_WEIGHTS,
    REVIVAL_BANKS
)
from app.models.intelligence_layer import (
    NextBestSkillRecommendation,
    SkillRevivalAssessment,
    RevivalEvaluationResult,
    AIMentorResponse,
    InclusiveAdaptiveProfile
)

@pytest.fixture(autouse=True)
def setup_db():
    asyncio.run(connect_to_mongo())


def test_next_best_skill_computation():
    """Verify Next-Best-Skill recommendation algorithm produces valid weights, confidence, and alternatives."""
    async def run_test():
        rec = await intelligence_layer_service.compute_next_best_skill("test_user_nb_skill")
        
        assert rec is not None
        assert isinstance(rec, NextBestSkillRecommendation)
        assert rec.skill_id is not None
        assert rec.quest_id is not None
        assert rec.score >= 0.0
        assert rec.recommendation_confidence in ["HIGH", "MEDIUM", "LOW"]
        assert len(rec.why_reasons) > 0
        assert len(rec.alternative_paths) <= 3
        
        # Check that weights sum to 1.0 (no magic numbers)
        weights_sum = sum(RECOMMENDER_WEIGHTS.values())
        assert abs(weights_sum - 1.0) < 0.001

    asyncio.run(run_test())


def test_skill_revival_generation_and_evaluation():
    """Verify Feature 10 non-punitive skill revival retains previous mastery and scores fairly."""
    async def run_test():
        # 1. Fetch revival assessment
        revival = await intelligence_layer_service.get_skill_revival_assessment("test_user_revival", "inheritance")
        assert revival is not None
        assert isinstance(revival, SkillRevivalAssessment)
        assert len(revival.questions) == 3
        assert revival.status == "REFRESH_RECOMMENDED"
        assert revival.previous_mastery >= 0.70

        # 2. Perfect score: 3/3 correct -> STRONG outcome, 92%+ restored
        perfect_answers = {
            q.question_id: q.correct_answer for q in revival.questions
        }
        result_strong = await intelligence_layer_service.evaluate_skill_revival(
            learner_id="test_user_revival",
            skill_id="inheritance",
            answers=perfect_answers
        )
        assert isinstance(result_strong, RevivalEvaluationResult)
        assert result_strong.recall_outcome == "STRONG"
        assert result_strong.restored_mastery >= 0.90
        assert "retained" in result_strong.headline.lower() or "restored" in result_strong.headline.lower()

        # 3. Partial score: 2/3 correct -> PARTIAL outcome, >= 76%
        partial_answers = dict(perfect_answers)
        first_q = revival.questions[0]
        wrong_opt = next(opt for opt in first_q.options if opt != first_q.correct_answer)
        partial_answers[first_q.question_id] = wrong_opt

        result_partial = await intelligence_layer_service.evaluate_skill_revival(
            learner_id="test_user_revival",
            skill_id="inheritance",
            answers=partial_answers
        )
        assert result_partial.recall_outcome == "PARTIAL"
        assert result_partial.restored_mastery >= 0.70

        # 4. Weak score: 0/3 correct -> Zero penalty, identifies gap
        wrong_answers = {
            q.question_id: "Completely Incorrect Choice" for q in revival.questions
        }
        result_weak = await intelligence_layer_service.evaluate_skill_revival(
            learner_id="test_user_revival",
            skill_id="inheritance",
            answers=wrong_answers
        )
        assert result_weak.recall_outcome == "WEAK"
        assert result_weak.status == "GAP_DETECTED"
        assert "re-learning" in result_weak.feedback_message.lower()

    asyncio.run(run_test())


def test_context_aware_ai_mentor_modes():
    """Verify Feature 11 AI Mentor pedagogical modes, progressive hints 1->2->3, and context injection."""
    async def run_test():
        # Test Explain Mode
        res_explain = await intelligence_layer_service.consult_ai_mentor(
            learner_id="test_user_mentor",
            prompt="Explain inheritance to me",
            mode="explain",
            target_skill="inheritance"
        )
        assert isinstance(res_explain, AIMentorResponse)
        assert res_explain.mode_used == "explain"
        assert len(res_explain.response_text) > 30

        # Test Simplify Mode
        res_simplify = await intelligence_layer_service.consult_ai_mentor(
            learner_id="test_user_mentor",
            prompt="Explain simply with real world analogy",
            mode="simplify",
            target_skill="inheritance"
        )
        assert res_simplify.mode_used == "simplify"
        assert len(res_simplify.response_text) > 30

        # Test Progressive Hint Levels 1, 2, 3
        hint_1 = await intelligence_layer_service.consult_ai_mentor(
            learner_id="test_user_mentor",
            prompt="I am stuck on this question",
            mode="hint",
            target_skill="inheritance",
            hint_step=1
        )
        assert hint_1.progressive_hint_level == 1
        assert "Hint 1" in hint_1.response_text

        hint_2 = await intelligence_layer_service.consult_ai_mentor(
            learner_id="test_user_mentor",
            prompt="Still need guidance",
            mode="hint",
            target_skill="inheritance",
            hint_step=2
        )
        assert hint_2.progressive_hint_level == 2
        assert "Hint 2" in hint_2.response_text

        hint_3 = await intelligence_layer_service.consult_ai_mentor(
            learner_id="test_user_mentor",
            prompt="Show me the pattern",
            mode="hint",
            target_skill="inheritance",
            hint_step=3
        )
        assert hint_3.progressive_hint_level == 3
        assert "Hint 3" in hint_3.response_text

    asyncio.run(run_test())


def test_inclusive_adaptive_profile_sdg10():
    """Verify Feature 14 Inclusive Adaptive Profile ensures equal competency goal of Inheritance >= 70%."""
    async def run_test():
        profile = await intelligence_layer_service.get_inclusive_adaptive_profile("test_user_sdg10")
        assert isinstance(profile, InclusiveAdaptiveProfile)
        assert "≥ 70%" in profile.target_competency

        # Update settings
        updated = await intelligence_layer_service.update_inclusive_adaptive_profile(
            learner_id="test_user_sdg10",
            updates={"focus_mode_active": True, "challenge_chunk_size": "bite_sized"}
        )
        assert updated.focus_mode_active is True
        assert updated.challenge_chunk_size == "bite_sized"
        assert "≥ 70%" in updated.target_competency

    asyncio.run(run_test())


def test_persona_switcher_simulation():
    """Verify 5 test personas can be activated and seed realistic state for evaluation."""
    async def run_test():
        personas = ["beginner", "fast_learner", "struggling_learner", "decayed_learner", "low_engagement"]
        
        for pid in personas:
            result = await intelligence_layer_service.activate_test_persona("test_user_personas", pid)
            assert result["persona_id"] == pid
            assert "recommendation" in result
            assert result["recommendation"]["skill_id"] is not None
            assert result["recommendation"]["quest_id"] is not None

    asyncio.run(run_test())
