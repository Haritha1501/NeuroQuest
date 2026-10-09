import pytest
from app.services.knowledge_estimator import knowledge_estimator, QUESTION_BANK, ALL_SKILLS
from fastapi.testclient import TestClient
from app.main import app

def test_1_correct_beginner_next_question_harder():
    """Test 1: Correct beginner answer -> next question increases difficulty."""
    # First question is sf_oop_01 (diff 2)
    history = [{
        "question_id": "sf_oop_01",
        "is_correct": True,
        "response_time_seconds": 8.0,  # Fast response
        "skill": "OOP Basics"
    }]
    next_q = knowledge_estimator.select_next_question(
        history=history,
        asked_ids=["sf_oop_01"],
        max_questions=4
    )
    assert next_q is not None
    # Next question difficulty should be >= 3 or advanced skill
    assert next_q["difficulty"] >= 3 or next_q["skill"] in ["Inheritance", "Polymorphism", "Collections"]
    assert next_q["id"] != "sf_oop_01"

def test_2_incorrect_difficult_next_question_easier_or_prerequisite():
    """Test 2: Incorrect difficult question -> next question becomes easier or prerequisite-focused."""
    # Struggled on sf_inh_01 (Inheritance diff 3)
    history = [{
        "question_id": "sf_inh_01",
        "is_correct": False,
        "response_time_seconds": 35.0,
        "skill": "Inheritance"
    }]
    next_q = knowledge_estimator.select_next_question(
        history=history,
        asked_ids=["sf_inh_01"],
        max_questions=4
    )
    assert next_q is not None
    # Next question should test prerequisite (OOP Basics / Fundamentals) or lower difficulty
    assert next_q["skill"] in ["OOP Basics", "Fundamentals", "Methods"] or next_q["difficulty"] <= 2
    assert next_q["id"] != "sf_inh_01"

def test_3_untested_skill_status_not_assessed_never_zero_percent():
    """Test 3: Untested skill -> status remains NOT_ASSESSED and never becomes 0%."""
    # Only answered one question in Fundamentals
    responses = [{
        "question_id": "sf_var_01",
        "skill": "Fundamentals",
        "is_correct": True,
        "response_time_seconds": 12.0
    }]
    profile = knowledge_estimator.compute_skill_profile("test_learner_3", responses)
    
    # Collections was never tested
    coll_skill = profile.skills.get("Collections")
    assert coll_skill is not None
    assert coll_skill.status == "NOT_ASSESSED"
    assert coll_skill.mastery_score is None  # MUST NOT BE 0.0 or 0%!
    assert coll_skill.mastery_level == "Not Yet Assessed"
    assert coll_skill.evidence_level == "None"

    # Polymorphism was never tested
    poly_skill = profile.skills.get("Polymorphism")
    assert poly_skill is not None
    assert poly_skill.status == "NOT_ASSESSED"
    assert poly_skill.mastery_score is None

def test_4_fast_correct_answer_stronger_evidence():
    """Test 4: Fast correct answer -> stronger evidence of mastery."""
    fast_resp = [{
        "question_id": "sf_oop_01",
        "skill": "OOP Basics",
        "is_correct": True,
        "response_time_seconds": 5.0,  # Expected 30s -> Very Fast (0.16x)
        "hint_used": False,
        "confidence_level": 0.9
    }]
    profile_fast = knowledge_estimator.compute_skill_profile("learner_fast", fast_resp)
    oop_fast = profile_fast.skills["OOP Basics"]
    assert oop_fast.mastery_score >= 0.85
    assert oop_fast.mastery_level == "Strong"

def test_5_slow_correct_answer_lower_confidence():
    """Test 5: Slow correct answer -> mastery increases, but with lower confidence."""
    slow_resp = [{
        "question_id": "sf_oop_01",
        "skill": "OOP Basics",
        "is_correct": True,
        "response_time_seconds": 65.0,  # Expected 30s -> Very Slow (2.1x)
        "hint_used": True,              # Needed hint
        "confidence_level": 0.3         # Unsure
    }]
    profile_slow = knowledge_estimator.compute_skill_profile("learner_slow", slow_resp)
    oop_slow = profile_slow.skills["OOP Basics"]
    # Should reflect partial understanding rather than ceiling mastery
    assert oop_slow.mastery_score < 0.85
    assert oop_slow.mastery_level in ["Developing", "Proficient"]

def test_6_repeated_incorrect_answers_skill_gap_detected():
    """Test 6: Repeated incorrect answers -> skill gap detected."""
    gap_resp = [
        {
            "question_id": "sf_inh_01",
            "skill": "Inheritance",
            "is_correct": False,
            "response_time_seconds": 40.0
        },
        {
            "question_id": "sf_inh_02",
            "skill": "Inheritance",
            "is_correct": False,
            "response_time_seconds": 45.0
        }
    ]
    profile = knowledge_estimator.compute_skill_profile("learner_gap", gap_resp)
    inh_skill = profile.skills["Inheritance"]
    assert inh_skill.status == "ASSESSED"
    assert inh_skill.mastery_level == "Needs Practice"
    assert inh_skill.mastery_score < 0.35
    # Recommended starting point should target Inheritance
    assert profile.recommended_starting_point is not None
    assert profile.recommended_starting_point.skill == "Inheritance"

def test_7_8_calibration_flow_and_returning_learner():
    """Test 7 & 8: Calibration completion saves profile & returning learner status."""
    with TestClient(app) as client:
        # Create user & auth token
        reg_data = {
            "email": "skillforge_tester@neuroquest.ai",
            "username": "skillforge_tester",
            "password": "securepassword123",
            "full_name": "SkillForge Tester",
            "role": "caregiver"
        }
        res = client.post("/api/auth/register", json=reg_data)
        if res.status_code != 200:
            res = client.post("/api/auth/login", json={"email": reg_data["email"], "password": reg_data["password"]})
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Start calibration
        start_res = client.post("/api/calibration/start", headers=headers)
        assert start_res.status_code == 200
        start_data = start_res.json()
        assert "session_id" in start_data
        session_id = start_data["session_id"]
        assert start_data["completed"] is False
        assert start_data["question_number"] == 1

        # 2. Answer question 1
        q1_id = start_data["question"]["id"]
        q1_meta = knowledge_estimator.question_map[q1_id]
        ans1_res = client.post("/api/calibration/answer", headers=headers, json={
            "session_id": session_id,
            "question_id": q1_id,
            "selected_answer": q1_meta["correct_answer"],
            "response_time_seconds": 6.0,
            "confidence_level": 0.9
        })
        assert ans1_res.status_code == 200
        ans1_data = ans1_res.json()
        assert ans1_data["completed"] is False
        assert ans1_data["question_number"] == 2

        # 3. Answer remaining questions to complete
        q2_id = ans1_data["next_question"]["id"]
        q2_meta = knowledge_estimator.question_map[q2_id]
        ans2_res = client.post("/api/calibration/answer", headers=headers, json={
            "session_id": session_id,
            "question_id": q2_id,
            "selected_answer": q2_meta["correct_answer"],
            "response_time_seconds": 8.0,
            "confidence_level": 0.8
        })

        q3_id = ans2_res.json()["next_question"]["id"]
        q3_meta = knowledge_estimator.question_map[q3_id]
        ans3_res = client.post("/api/calibration/answer", headers=headers, json={
            "session_id": session_id,
            "question_id": q3_id,
            "selected_answer": q3_meta["correct_answer"],
            "response_time_seconds": 12.0
        })

        q4_id = ans3_res.json()["next_question"]["id"]
        q4_meta = knowledge_estimator.question_map[q4_id]
        final_res = client.post("/api/calibration/answer", headers=headers, json={
            "session_id": session_id,
            "question_id": q4_id,
            "selected_answer": q4_meta["correct_answer"],
            "response_time_seconds": 10.0
        })

        # Test 7: Profile saved upon completion
        final_data = final_res.json()
        assert final_data["completed"] is True
        assert "profile" in final_data
        assert final_data["profile"]["total_questions_answered"] == 4

        # Test 8: Returning learner check does NOT restart calibration
        status_res = client.get("/api/calibration/status", headers=headers)
        assert status_res.status_code == 200
        assert status_res.json()["calibration_completed"] is True
        assert status_res.json()["last_profile"] is not None

def test_9_different_learners_produce_distinct_profiles():
    """Test 9: Different personas produce visibly distinct skill profiles."""
    # Learner A — Beginner (Answers beginner correctly, struggles on intermediate)
    learner_a_resp = [
        {"question_id": "sf_var_01", "skill": "Fundamentals", "is_correct": True, "response_time_seconds": 15.0},
        {"question_id": "sf_dt_02", "skill": "Fundamentals", "is_correct": True, "response_time_seconds": 18.0},
        {"question_id": "sf_oop_01", "skill": "OOP Basics", "is_correct": False, "response_time_seconds": 35.0},
        {"question_id": "sf_loop_03", "skill": "Fundamentals", "is_correct": True, "response_time_seconds": 22.0}
    ]
    profile_a = knowledge_estimator.compute_skill_profile("learner_a", learner_a_resp)

    # Learner B — Fast Learner (Answers advanced quickly and correctly)
    learner_b_resp = [
        {"question_id": "sf_oop_01", "skill": "OOP Basics", "is_correct": True, "response_time_seconds": 6.0},
        {"question_id": "sf_inh_01", "skill": "Inheritance", "is_correct": True, "response_time_seconds": 8.0},
        {"question_id": "sf_inh_02", "skill": "Inheritance", "is_correct": True, "response_time_seconds": 10.0},
        {"question_id": "sf_poly_01", "skill": "Polymorphism", "is_correct": True, "response_time_seconds": 11.0}
    ]
    profile_b = knowledge_estimator.compute_skill_profile("learner_b", learner_b_resp)

    # Learner C — Struggling Learner (Repeated incorrect, slow)
    learner_c_resp = [
        {"question_id": "sf_oop_01", "skill": "OOP Basics", "is_correct": False, "response_time_seconds": 45.0},
        {"question_id": "sf_var_01", "skill": "Fundamentals", "is_correct": False, "response_time_seconds": 50.0},
        {"question_id": "sf_dt_02", "skill": "Fundamentals", "is_correct": True, "response_time_seconds": 40.0, "hint_used": True},
        {"question_id": "sf_loop_03", "skill": "Fundamentals", "is_correct": False, "response_time_seconds": 55.0}
    ]
    profile_c = knowledge_estimator.compute_skill_profile("learner_c", learner_c_resp)

    # Assert distinct outcomes
    assert profile_b.skills["Inheritance"].mastery_level == "Strong"
    assert profile_a.skills["Fundamentals"].mastery_level in ["Strong", "Proficient"]
    assert profile_a.skills["Inheritance"].status == "NOT_ASSESSED"
    assert profile_c.skills["Fundamentals"].mastery_level in ["Needs Practice", "Developing"]
    assert profile_b.recommended_starting_point.quest_title != profile_c.recommended_starting_point.quest_title

def test_10_page_refresh_during_calibration_does_not_corrupt():
    """Test 10: Refreshing the page during calibration does not corrupt the session."""
    with TestClient(app) as client:
        # Create user & auth token
        reg_data = {
            "email": "refresh_tester@neuroquest.ai",
            "username": "refresh_tester",
            "password": "securepassword123",
            "full_name": "Refresh Tester",
            "role": "caregiver"
        }
        res = client.post("/api/auth/register", json=reg_data)
        if res.status_code != 200:
            res = client.post("/api/auth/login", json={"email": reg_data["email"], "password": reg_data["password"]})
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Start calibration
        start_res = client.post("/api/calibration/start", headers=headers)
        assert start_res.status_code == 200
        session_id = start_res.json()["session_id"]
        q1_id = start_res.json()["question"]["id"]

        # 2. Answer question 1
        client.post("/api/calibration/answer", headers=headers, json={
            "session_id": session_id,
            "question_id": q1_id,
            "selected_answer": "Arbitrary Answer",
            "response_time_seconds": 10.0
        })

        # 3. Simulate page refresh: client calls /api/calibration/start again
        refresh_res = client.post("/api/calibration/start", headers=headers)
        assert refresh_res.status_code == 200
        refreshed_data = refresh_res.json()
        
        # Must resume same session at question 2 without resetting progress
        assert refreshed_data["session_id"] == session_id
        assert refreshed_data["question_number"] == 2
        assert refreshed_data["completed"] is False
