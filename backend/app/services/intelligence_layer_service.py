import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import math

from app.database import get_database
from app.models.intelligence_layer import (
    NextBestSkillRecommendation,
    AlternativePathItem,
    SkillRevivalAssessment,
    SkillRevivalQuestion,
    RevivalEvaluationResult,
    AIMentorResponse,
    InclusiveAdaptiveProfile,
    TestPersona
)
from app.services.skill_map_service import skill_map_service, CANONICAL_SKILL_NODES, CANONICAL_SKILL_EDGES
from app.services.mastery_game_service import mastery_game_service, MASTER_QUESTS

logger = logging.getLogger("neuroquest.intelligence_layer")

# ==============================================================================
# CONFIGURABLE RECOMMENDATION ENGINE WEIGHTS (NO MAGIC NUMBERS)
# ==============================================================================
RECOMMENDER_WEIGHTS = {
    "W_SKILL_GAP": 0.30,          # Weight for current knowledge gap / error signal
    "W_PREREQ_READINESS": 0.25,   # Weight for satisfaction of prerequisite foundations
    "W_LEARNING_VALUE": 0.15,      # Weight for distance from full mastery (headroom)
    "W_UNLOCK_VALUE": 0.15,        # Weight for downstream skills this node unlocks
    "W_RETENTION_NEED": 0.10,      # Weight for skills that have decayed or need refresh
    "W_DIFFICULTY_FIT": 0.05       # Weight for appropriate difficulty curve
}

# ==============================================================================
# CURATED 3-QUESTION SKILL REVIVAL ASSESSMENTS (FEATURE 10)
# ==============================================================================
REVIVAL_BANKS: Dict[str, List[SkillRevivalQuestion]] = {
    "inheritance": [
        SkillRevivalQuestion(
            question_id="rev_inher_01",
            type="recall",
            title="Question 1 • Conceptual Recall",
            prompt="What is the primary architectural purpose of the 'extends' keyword in Java?",
            code_snippet="public class CargoShip extends SpaceVessel { ... }",
            options=[
                "Inherits fields and methods from the superclass to enable code reuse",
                "Encrypts the class so other classes cannot read it",
                "Forces the program to run 50% faster",
                "Deletes the parent class after compilation"
            ],
            correct_answer="Inherits fields and methods from the superclass to enable code reuse",
            explanation="Inheritance allows subclasses to acquire state and behavior from an existing superclass."
        ),
        SkillRevivalQuestion(
            question_id="rev_inher_02",
            type="application",
            title="Question 2 • Code Output Prediction",
            prompt="If both classes define 'getVelocity()', what output is printed when invoking it on CargoShip?",
            code_snippet="SpaceVessel ship = new CargoShip();\nSystem.out.println(ship.getVelocity());",
            options=[
                "CargoShip's overridden getVelocity() implementation is executed",
                "SpaceVessel's getVelocity() is always executed",
                "The code will fail with a NullPointerException",
                "Both methods execute simultaneously"
            ],
            correct_answer="CargoShip's overridden getVelocity() implementation is executed",
            explanation="Dynamic method dispatch ensures the runtime instance's overridden method executes."
        ),
        SkillRevivalQuestion(
            question_id="rev_inher_03",
            type="challenge",
            title="Question 3 • Diagnostic Challenge",
            prompt="How must a subclass constructor invoke a parent constructor with parameters?",
            code_snippet="public SubClass(int speed) {\n    // Line 2: parent call\n}",
            options=[
                "super(speed); as the very first line of the constructor",
                "parent.call(speed); at any line",
                "this.super = speed;",
                "Constructors in subclasses cannot call parent constructors"
            ],
            correct_answer="super(speed); as the very first line of the constructor",
            explanation="The super(...) constructor invocation must always be the very first statement in a subclass constructor."
        )
    ],
    "oop_basics": [
        SkillRevivalQuestion(
            question_id="rev_oop_01",
            type="recall",
            title="Question 1 • Object Recall",
            prompt="What is the fundamental difference between a Class and an Object in Java?",
            code_snippet="Planet mars = new Planet('Mars');",
            options=[
                "A Class is a blueprint; an Object is a concrete instance in memory",
                "A Class is a number; an Object is text",
                "Objects exist only in source code; classes exist in RAM",
                "There is no difference"
            ],
            correct_answer="A Class is a blueprint; an Object is a concrete instance in memory",
            explanation="Classes define structure and behavior; objects represent allocated state in memory."
        ),
        SkillRevivalQuestion(
            question_id="rev_oop_02",
            type="application",
            title="Question 2 • Encapsulation Application",
            prompt="Why should instance variables typically be declared 'private'?",
            code_snippet="private double fuelLevel;",
            options=[
                "To protect internal state from direct unauthorized modification",
                "To make the variables run faster in CPU registers",
                "Because Java does not allow public variables",
                "To delete variables after 10 seconds"
            ],
            correct_answer="To protect internal state from direct unauthorized modification",
            explanation="Encapsulation hides internal state and exposes controlled access via getter/setter methods."
        ),
        SkillRevivalQuestion(
            question_id="rev_oop_03",
            type="challenge",
            title="Question 3 • Reference Challenge",
            prompt="What happens when two reference variables point to the same object instance?",
            code_snippet="Planet a = new Planet('Earth');\nPlanet b = a;\nb.setOxygen(21);",
            options=[
                "Modifications via 'b' will also reflect when accessing 'a'",
                "A new copy of the planet is automatically created",
                "The program crashes with an AmbiguityException",
                "'a' is immediately set to null"
            ],
            correct_answer="Modifications via 'b' will also reflect when accessing 'a'",
            explanation="Both references hold the same memory address pointing to the same heap instance."
        )
    ],
    "fundamentals": [
        SkillRevivalQuestion(
            question_id="rev_fund_01",
            type="recall",
            title="Question 1 • Variable Recall",
            prompt="Which primitive type is best suited for storing integer loop counters in Java?",
            code_snippet="for (___ i = 0; i < 10; i++)",
            options=["int", "boolean", "double", "String"],
            correct_answer="int",
            explanation="'int' is the standard 32-bit signed integer primitive."
        ),
        SkillRevivalQuestion(
            question_id="rev_fund_02",
            type="application",
            title="Question 2 • Loop Boundary",
            prompt="How many iterations does this while loop execute?",
            code_snippet="int count = 2;\nwhile (count < 5) {\n    count++;\n}",
            options=["3 iterations (count = 2, 3, 4)", "5 iterations", "0 iterations", "Infinite iterations"],
            correct_answer="3 iterations (count = 2, 3, 4)",
            explanation="Runs for count = 2 (becomes 3), count = 3 (becomes 4), count = 4 (becomes 5, terminates). Total: 3."
        ),
        SkillRevivalQuestion(
            question_id="rev_fund_03",
            type="challenge",
            title="Question 3 • Scope Challenge",
            prompt="Can a variable declared inside an if-statement block be accessed outside that block?",
            code_snippet="if (shieldActive) {\n    int powerDrain = 50;\n}\nSystem.out.println(powerDrain);",
            options=[
                "No, compilation error: powerDrain is out of scope",
                "Yes, it prints 50",
                "Yes, it prints 0",
                "Yes, but only if shieldActive is true"
            ],
            correct_answer="No, compilation error: powerDrain is out of scope",
            explanation="Block scope strictly restricts the variable's lifetime and visibility within its curly braces."
        )
    ]
}


class IntelligenceLayerService:
    """
    SkillForge Intelligence Layer uniting Features 3, 7, 10, 11, and 14.
    Operates as the single unified decision & adaptation brain over the Learner Model.
    """

    # ==========================================================================
    # FEATURE 3 & 7: NEXT-BEST-SKILL ENGINE & DASHBOARD EXPERIENCE
    # ==========================================================================
    async def compute_next_best_skill(self, learner_id: str) -> NextBestSkillRecommendation:
        """
        Dynamically evaluates candidate skills using multi-factor pedagogical scoring:
        Score = W_GAP*Gap + W_PREREQ*Prereq + W_LEARNING*LearnVal + W_UNLOCK*UnlockVal + W_RETENTION*Ret + W_DIFF*Diff
        Returns the top recommendation with clear explainability reasons + alternative paths.
        """
        smap = await skill_map_service.build_learner_skill_map(learner_id)
        node_map = {n.skill_id: n for n in smap.nodes}

        scored_candidates: List[Dict[str, Any]] = []

        for skill_id, defn in CANONICAL_SKILL_NODES.items():
            node = node_map.get(skill_id)
            if not node:
                continue

            score_val = node.mastery_score
            has_score = score_val is not None
            current_pct = node.mastery_percentage

            # 1. Prerequisite Readiness
            prereqs_met = True
            missing_prereqs = []
            satisfied_prereqs = []
            for p in node.prerequisites:
                if p.is_met:
                    satisfied_prereqs.append(p.skill_name)
                else:
                    prereqs_met = False
                    missing_prereqs.append(f"{p.skill_name} ≥ {p.required_percentage}%")

            # Prerequisite readiness score
            prereq_score = 1.0 if prereqs_met else 0.15

            # 2. Skill Gap Factor
            gap_score = 0.0
            if has_score:
                if score_val < 0.50:
                    gap_score = 0.95  # Critical gap needs practice
                elif score_val < 0.70:
                    gap_score = 0.75  # Developing skill
                else:
                    gap_score = 0.10  # Already strong
            else:
                gap_score = 0.50 if prereqs_met else 0.0

            # 3. Learning Value (Headroom toward full mastery)
            learning_value = max(0.05, 1.0 - (score_val if has_score else 0.35))

            # 4. Unlock Value (How many downstream skills does this unlock?)
            unlock_count = len(node.unlocks_skills)
            unlock_value = min(1.0, 0.30 + unlock_count * 0.35)

            # 5. Retention Need (Has the skill decayed or flagged refresh?)
            retention_need = 0.90 if node.refresh_recommended else 0.05

            # 6. Difficulty Fit
            difficulty_fit = max(0.2, 1.0 - abs(node.difficulty - 2) * 0.20)

            # Final Weighted Score Calculation
            w = RECOMMENDER_WEIGHTS
            composite_score = (
                w["W_SKILL_GAP"] * gap_score
                + w["W_PREREQ_READINESS"] * prereq_score
                + w["W_LEARNING_VALUE"] * learning_value
                + w["W_UNLOCK_VALUE"] * unlock_value
                + w["W_RETENTION_NEED"] * retention_need
                + w["W_DIFFICULTY_FIT"] * difficulty_fit
            )

            # If prerequisites are not met, penalize candidate score so the prerequisite is recommended first
            if not prereqs_met:
                composite_score *= 0.35

            # Reason Codes & Explainability Checklist
            reason_codes: List[str] = []
            why_reasons: List[str] = []

            if node.refresh_recommended:
                reason_codes.append("RETENTION_NEED")
                why_reasons.append("🔄 Retention Refresh: It has been a while since you practiced this previously mastered concept.")

            if prereqs_met and satisfied_prereqs:
                reason_codes.append("PREREQUISITE_READY")
                why_reasons.append(f"✓ Prerequisite Foundations: You have demonstrated required mastery in {', '.join(satisfied_prereqs[:2])}.")

            if has_score and score_val < 0.70:
                reason_codes.append("CURRENT_SKILL_GAP")
                subskill_gap = node.needs_practice[0] if node.needs_practice else node.short_name
                why_reasons.append(f"⚠ Targeted Opportunity: Recent attempts indicate practice on '{subskill_gap}' will elevate your mastery.")

            if unlock_count > 0:
                reason_codes.append("HIGH_UNLOCK_VALUE")
                why_reasons.append(f"✓ Progression Frontier: Achieving ≥70% in this skill unlocks {', '.join(node.unlocks_skills)}.")

            if not has_score and prereqs_met:
                reason_codes.append("NEW_FRONTIER_READY")
                why_reasons.append("✓ Ready for Exploration: Prerequisite foundations are in place; ready to assess and demonstrate insight.")

            if not prereqs_met:
                reason_codes.append("BLOCKED_BY_PREREQUISITES")
                why_reasons.append(f"🔒 Prerequisite Gate: We recommend strengthening {', '.join(missing_prereqs)} before attempting this skill.")

            why_reasons.append(f"✓ Challenge Fit: Difficulty Level {node.difficulty} is matched to your current learning velocity.")

            # Recommendation Confidence
            confidence = "HIGH" if node.evidence_count >= 3 else "MEDIUM" if node.evidence_count >= 1 else "LOW"
            if not has_score and not prereqs_met:
                confidence = "LOW"

            quest_key = node.quest_id or f"quest_{skill_id}"
            quest_obj = MASTER_QUESTS.get(quest_key)
            quest_title = quest_obj.title if quest_obj else f"Master {node.short_name}"
            est_minutes = quest_obj.estimated_minutes if quest_obj else 8

            scored_candidates.append({
                "skill_id": skill_id,
                "skill_name": node.name,
                "short_name": node.short_name,
                "score": round(composite_score, 3),
                "confidence": confidence,
                "current_mastery": score_val,
                "current_pct": current_pct,
                "target_mastery": node.target_mastery,
                "difficulty": "medium" if node.difficulty <= 3 else "hard",
                "estimated_minutes": est_minutes,
                "quest_id": quest_key,
                "quest_title": quest_title,
                "reason_codes": reason_codes,
                "why_reasons": why_reasons,
                "prereqs_met": prereqs_met
            })

        # Sort by composite score descending
        scored_candidates.sort(key=lambda c: c["score"], reverse=True)

        top_choice = scored_candidates[0]
        alternatives = [
            AlternativePathItem(
                skill_id=alt["skill_id"],
                skill_name=alt["short_name"],
                score=alt["score"],
                current_mastery=alt["current_mastery"],
                reason=alt["why_reasons"][0] if alt["why_reasons"] else "Alternative learning path.",
                quest_id=alt["quest_id"]
            )
            for alt in scored_candidates[1:4]
        ]

        return NextBestSkillRecommendation(
            learner_id=learner_id,
            skill_id=top_choice["skill_id"],
            skill_name=top_choice["skill_name"],
            score=top_choice["score"],
            recommendation_confidence=top_choice["confidence"],
            current_mastery=top_choice["current_mastery"],
            target_mastery=top_choice["target_mastery"],
            difficulty=top_choice["difficulty"],
            estimated_minutes=top_choice["estimated_minutes"],
            quest_id=top_choice["quest_id"],
            quest_title=top_choice["quest_title"],
            reason_codes=top_choice["reason_codes"],
            why_reasons=top_choice["why_reasons"][:5],
            alternative_paths=alternatives
        )

    # ==========================================================================
    # FEATURE 10: KNOWLEDGE DECAY & SKILL REVIVAL
    # ==========================================================================
    async def get_skill_revival_assessment(self, learner_id: str, skill_id: str) -> SkillRevivalAssessment:
        """
        Retrieves a 3-question 2-minute skill revival check for a decayed or previously mastered skill.
        Preserves previous demonstrated mastery and calculates estimated retention without zeroing out!
        """
        norm_id = skill_map_service._normalize_skill_key(skill_id)
        smap = await skill_map_service.build_learner_skill_map(learner_id)
        node = next((n for n in smap.nodes if n.skill_id == norm_id), None)

        prev_mastery = node.mastery_score if (node and node.mastery_score is not None) else 0.85
        now = datetime.utcnow()
        last_dt = node.last_practiced_at if (node and node.last_practiced_at) else (now - timedelta(days=21))

        days_elapsed = max(1, (now - last_dt).days)
        # Logarithmic non-punitive retention estimation
        retention = max(0.60, round(prev_mastery - 0.04 * math.log2(1 + days_elapsed / 14), 2))

        questions = REVIVAL_BANKS.get(norm_id) or REVIVAL_BANKS["inheritance"]
        skill_name = node.name if node else norm_id.capitalize()

        return SkillRevivalAssessment(
            skill_id=norm_id,
            skill_name=skill_name,
            previous_mastery=prev_mastery,
            estimated_retention=retention,
            days_since_practice=days_elapsed,
            status="REFRESH_RECOMMENDED",
            estimated_minutes=2,
            questions=questions
        )

    async def evaluate_skill_revival(
        self,
        learner_id: str,
        skill_id: str,
        answers: Dict[str, str]
    ) -> RevivalEvaluationResult:
        """
        Evaluates the 3-question skill revival assessment non-punitively:
        - 3/3 (Strong): Restores mastery to 90%+
        - 2/3 (Partial): Sets mastery to 76% & recommends 5-min refresher
        - <=1/3 (Weak): Flags skill gap & recommends adaptive re-learning quest without penalty!
        """
        db = get_database()
        norm_id = skill_map_service._normalize_skill_key(skill_id)
        bank = REVIVAL_BANKS.get(norm_id) or REVIVAL_BANKS["inheritance"]

        correct_count = 0
        total_q = len(bank)

        for q in bank:
            user_ans = str(answers.get(q.question_id, "")).strip().lower()
            if user_ans == q.correct_answer.strip().lower():
                correct_count += 1

        fraction = correct_count / max(1, total_q)
        smap = await skill_map_service.build_learner_skill_map(learner_id)
        node = next((n for n in smap.nodes if n.skill_id == norm_id), None)
        prev_m = node.mastery_score if (node and node.mastery_score is not None) else 0.85

        now = datetime.utcnow()

        if correct_count == 3:
            outcome = "STRONG"
            status = "SKILL_RETAINED"
            restored = max(prev_m, 0.92)
            headline = "🎉 Exceptional Recall! Skill Fully Retained!"
            message = (
                f"You demonstrated strong conceptual memory across all 3 recall milestones. "
                f"Your mastery in {node.short_name if node else norm_id} is verified at {int(restored * 100)}%!"
            )
            rec_action = "Advance directly to upcoming unlocked quests."
            quest_launch = None
        elif correct_count == 2:
            outcome = "PARTIAL"
            status = "REFRESH_COMPLETED"
            restored = max(0.74, round(prev_m * 0.90, 2))
            headline = "🔄 Skill Refreshed! High Foundations Intact."
            message = (
                f"Great job recalling the core concepts (2 of 3 correct). "
                f"Your retention is refreshed to {int(restored * 100)}%."
            )
            rec_action = "Complete a quick 5-minute scaffolded micro-refresher."
            quest_launch = node.quest_id if node else f"quest_{norm_id}"
        else:
            outcome = "WEAK"
            status = "GAP_DETECTED"
            restored = max(0.55, round(prev_m * 0.75, 2))
            headline = "💡 Concept Refresher Recommended"
            message = (
                f"It's completely natural to forget details over time! "
                f"Your brain still retains foundational context ({int(restored * 100)}%). "
                f"Let's do a gentle re-learning quest together."
            )
            rec_action = "Launch targeted adaptive quest with step-by-step hints."
            quest_launch = node.quest_id if node else f"quest_{norm_id}"

        # Persist updated mastery & refresh timestamp in database
        status_after = mastery_game_service.compute_mastery_status(restored)
        evolution_after = mastery_game_service.compute_evolution_stage(restored)

        await db["skill_mastery_states"].update_one(
            {"learner_id": learner_id},
            {
                "$set": {
                    f"skills.{norm_id}.current_mastery": restored,
                    f"skills.{norm_id}.previous_mastery": prev_m,
                    f"skills.{norm_id}.status": status_after,
                    f"skills.{norm_id}.evolution_stage": evolution_after,
                    f"skills.{norm_id}.last_practiced_at": now,
                    f"skills.{norm_id}.last_assessed_at": now,
                    f"skills.{norm_id}.revival_outcome": outcome
                },
                "$inc": {f"skills.{norm_id}.evidence_count": total_q}
            },
            upsert=True
        )

        return RevivalEvaluationResult(
            skill_id=norm_id,
            skill_name=node.name if node else norm_id.capitalize(),
            previous_mastery=prev_m,
            restored_mastery=restored,
            score_fraction=round(fraction, 2),
            recall_outcome=outcome,
            status=status,
            headline=headline,
            feedback_message=message,
            recommended_action=rec_action,
            quest_to_launch=quest_launch
        )

    # ==========================================================================
    # FEATURE 11: CONTEXT-AWARE AI MENTOR (7 PEDAGOGICAL MODES)
    # ==========================================================================
    async def consult_ai_mentor(
        self,
        learner_id: str,
        query: str = "",
        prompt: Optional[str] = None,
        mode: str = "explain",
        skill_id: Optional[str] = None,
        target_skill: Optional[str] = None,
        question_prompt: Optional[str] = None,
        recent_mistake: Optional[str] = None,
        hint_step: int = 1
    ) -> AIMentorResponse:
        """
        Context-aware AI mentor that injects live learner context:
        - Current skill & demonstrated mastery %
        - Recent error signals & mistake details
        - Active quest & difficulty level
        - Progressive hints (Hint 1 -> 2 -> 3)
        Never fabricates learner performance and does NOT directly alter mastery scores.
        """
        effective_query = query or prompt or ""
        effective_skill_id = skill_id or target_skill
        smap = await skill_map_service.build_learner_skill_map(learner_id)
        target_id = skill_map_service._normalize_skill_key(effective_skill_id or smap.you_are_here_node_id)
        node = next((n for n in smap.nodes if n.skill_id == target_id), None)

        skill_title = node.short_name if node else "Java OOP"
        mastery_display = f"{node.mastery_percentage}%" if (node and node.mastery_percentage is not None) else "Not Yet Assessed"
        confidence_display = node.confidence if node else "MEDIUM"
        mistake_context = recent_mistake or (node.needs_practice[0] if (node and node.needs_practice) else "concept synthesis")

        context_summary = {
            "skill": skill_title,
            "mastery": mastery_display,
            "confidence": confidence_display,
            "quest": node.quest_title if node else "Core Quest",
            "active_mode": mode
        }

        # Context-Aware Pedagogical Mode Handlers
        if mode == "hint":
            # Progressive hints without revealing answers
            step = min(3, max(1, hint_step))
            if step == 1:
                response_text = (
                    f"🎯 Hint 1 of 3 (Foundation Clue):\n"
                    f"Look at the superclass relationship in {skill_title}. Remember that child classes inherit "
                    f"accessible members from their parent class, but they can specialize their own behavior. "
                    f"Which class is defining the base contract?"
                )
            elif step == 2:
                response_text = (
                    f"🎯 Hint 2 of 3 (Mechanism Clue):\n"
                    f"Consider how method overriding works when a method has the exact same name and parameter signature. "
                    f"If a subclass provides its own version, which version will take precedence at runtime?"
                )
            else:
                response_text = (
                    f"🎯 Hint 3 of 3 (Target Clue):\n"
                    f"Check whether the constructor needs to call super(...) on the very first line, or whether "
                    f"the method is annotated with @Override. Pay attention to parameter types matching the superclass!"
                )
            progressive_level = step
            suggested = ["hint", "simplify", "check"]

        elif mode == "simplify":
            response_text = (
                f"🐢 Let's make this super simple!\n\n"
                f"Think of {skill_title} like a family recipe box:\n"
                f"• The Parent Class is the grand recipe (e.g., 'Make Cookies').\n"
                f"• The Child Class gets the grand recipe for free, but decides to add chocolate chips on top (that's method overriding!).\n\n"
                f"You don't need to rewrite the entire cookie recipe from scratch. You only write the new special topping!"
            )
            progressive_level = None
            suggested = ["example", "check", "explain"]

        elif mode == "example":
            response_text = (
                f"🧩 Concrete Example for {skill_title}:\n\n"
                f"```java\n"
                f"// Superclass (Blueprint)\n"
                f"class SpaceVessel {{\n"
                f"    void launch() {{\n"
                f"        System.out.println(\"Standard thrusters engaged!\");\n"
                f"    }}\n"
                f"}}\n\n"
                f"// Subclass specializing behavior\n"
                f"class WarpCruiser extends SpaceVessel {{\n"
                f"@Override\n"
                f"    void launch() {{\n"
                f"        System.out.println(\"Warp drive active at Light Speed!\");\n"
                f"    }}\n"
                f"}}\n"
                f"```\n\n"
                f"Notice: 'WarpCruiser' is still a SpaceVessel, but its 'launch()' does something tailored specifically for a cruiser!"
            )
            progressive_level = None
            suggested = ["check", "challenge", "explain"]

        elif mode == "reframe":
            response_text = (
                f"🔄 Let's look at {skill_title} through an engineering lens:\n"
                f"Instead of thinking about classes as text files, think of them as hardware sockets and adapters. "
                f"A parent class defines the universal plug shape. Any device that plugs into it will work with the power grid, "
                f"even if one device is a lamp and another is a space computer!"
            )
            progressive_level = None
            suggested = ["example", "simplify", "check"]

        elif mode == "check":
            response_text = (
                f"🧠 Quick Check for {skill_title}:\n\n"
                f"If you have `SpaceVessel ship = new WarpCruiser();`, which `launch()` method will execute?\n"
                f"A) SpaceVessel's launch()\n"
                f"B) WarpCruiser's launch()\n\n"
                f"Take a moment to ponder the answer — dynamic dispatch looks at the actual object created in memory!"
            )
            progressive_level = None
            suggested = ["hint", "explain", "challenge"]

        elif mode == "challenge":
            response_text = (
                f"🚀 Advanced Challenge (Next Frontier):\n\n"
                f"Suppose `SpaceVessel` has a private variable `private int fuel;`. "
                f"Can `WarpCruiser` access `this.fuel` directly?\n"
                f"Why or why not, and how would you redesign `SpaceVessel` using protected access or a getter to resolve this safely?"
            )
            progressive_level = None
            suggested = ["hint", "example", "explain"]

        else:
            # Default "explain" mode with full learner context integration
            response_text = (
                f"💡 Context-Aware Explanation for {skill_title}:\n\n"
                f"Based on your recent learning data, your current mastery in {skill_title} is at {mastery_display} "
                f"with {confidence_display} system confidence. Your recent challenge attempts highlighted an opportunity "
                f"around '{mistake_context}'.\n\n"
                f"In Java, {skill_title} connects your foundational knowledge of Classes into reusable hierarchies. "
                f"When a subclass extends a superclass, it inherits all non-private methods and variables. "
                f"Whenever you want the subclass to behave uniquely, you override the method.\n\n"
                f"Does this make sense, or would you like a visual metaphor or a hint on a specific line of code?"
            )
            progressive_level = None
            suggested = ["hint", "example", "simplify", "check"]

        return AIMentorResponse(
            response_text=response_text,
            mode_used=mode,
            context_summary=context_summary,
            progressive_hint_level=progressive_level,
            max_hints_available=3,
            suggested_follow_up_modes=suggested
        )

    # ==========================================================================
    # FEATURE 14: INCLUSIVE ADAPTIVE LEARNING (SDG 10)
    # ==========================================================================
    async def get_inclusive_adaptive_profile(self, learner_id: str) -> InclusiveAdaptiveProfile:
        """
        Retrieves the learner's dynamic adaptive interaction profile without medical labels.
        Supports content chunking, low-distraction focus mode, and multi-modal pacing toward
        the identical competency goal: 'Java Inheritance Mastery >= 70%'.
        """
        db = get_database()
        doc = await db["learner_adaptive_settings"].find_one({"learner_id": learner_id}) or {}

        chunking = doc.get("content_chunking", "standard")
        density = doc.get("visual_density", "standard")
        hint_freq = doc.get("guided_hint_frequency", "standard")
        focus_active = doc.get("focus_mode_active", False)
        chunk_size = doc.get("challenge_chunk_size", "standard")
        modality = doc.get("preferred_modality", "multimodal")

        is_inclusive = (chunking == "micro_chunked" or density == "minimal_low_distraction" or chunk_size == "bite_sized")
        label = "Bite-Sized Inclusive Path (Guided Scaffolds)" if is_inclusive else "Standard Adaptive Path"
        description = (
            "Short concept chunks, minimal visual clutter, 2-question micro-challenges, and proactive hints."
            if is_inclusive
            else "Standard 5-stage lessons, standard visual layout, and comprehensive challenges."
        )

        return InclusiveAdaptiveProfile(
            learner_id=learner_id,
            content_chunking=chunking,
            visual_density=density,
            guided_hint_frequency=hint_freq,
            focus_mode_active=focus_active,
            challenge_chunk_size=chunk_size,
            preferred_modality=modality,
            target_competency="Java Inheritance Mastery ≥ 70% → Unlock Polymorphism",
            path_profile_label=label,
            path_description=description
        )

    async def update_inclusive_adaptive_profile(
        self,
        learner_id: str,
        profile_data: Optional[Dict[str, Any]] = None,
        updates: Optional[Dict[str, Any]] = None
    ) -> InclusiveAdaptiveProfile:
        """Updates the learner's dynamic interaction preferences non-permanently."""
        db = get_database()
        payload = profile_data or updates or {}
        update_dict = {
            "content_chunking": payload.get("content_chunking", "standard"),
            "visual_density": payload.get("visual_density", "standard"),
            "guided_hint_frequency": payload.get("guided_hint_frequency", "standard"),
            "focus_mode_active": payload.get("focus_mode_active", False),
            "challenge_chunk_size": payload.get("challenge_chunk_size", "standard"),
            "preferred_modality": payload.get("preferred_modality", "multimodal"),
            "updated_at": datetime.utcnow()
        }
        await db["learner_adaptive_settings"].update_one(
            {"learner_id": learner_id},
            {"$set": update_dict},
            upsert=True
        )
        return await self.get_inclusive_adaptive_profile(learner_id)

    # ==========================================================================
    # 5 TEST PERSONAS SEEDER & SWITCHER FOR HACKATHON DEMO
    # ==========================================================================
    async def activate_test_persona(self, user_id: Any, persona_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Switches the active user state to one of the 5 Test Personas:
        1. beginner: Low initial mastery, needs foundation recommendation.
        2. fast_learner: High accuracy, fast responses, skips basics, Polymorphism ready.
        3. struggling_learner: Repeated mistakes, activates micro-chunking & AI hints.
        4. decayed_learner: Previously mastered Inheritance (92%), long period without practice, triggers Revival.
        5. low_engagement: High mastery, short sessions, bite-sized challenges.
        """
        VALID_PERSONAS = {"beginner", "fast_learner", "struggling_learner", "decayed_learner", "low_engagement"}
        if str(user_id) in VALID_PERSONAS:
            actual_persona_id = str(user_id)
            actual_user_id = str(persona_id or "default_user")
        else:
            actual_persona_id = str(persona_id or "beginner")
            actual_user_id = str(user_id or "default_user")

        db = get_database()
        now = datetime.utcnow()

        personas_data = {
            "beginner": {
                "name": "Persona 1: Alex (Beginner)",
                "subtitle": "Low Initial Mastery • Needs Scaffolding",
                "skills": {
                    "fundamentals": {"current_mastery": 0.45, "status": "NEEDS_PRACTICE", "evidence_count": 2, "last_practiced_at": now},
                    "methods": {"current_mastery": 0.25, "status": "NEEDS_PRACTICE", "evidence_count": 1, "last_practiced_at": now},
                    "oop_basics": {"current_mastery": None, "status": "NOT_ASSESSED", "evidence_count": 0},
                    "inheritance": {"current_mastery": None, "status": "NOT_ASSESSED", "evidence_count": 0},
                    "polymorphism": {"current_mastery": None, "status": "NOT_ASSESSED", "evidence_count": 0}
                },
                "adaptive": {"content_chunking": "micro_chunked", "guided_hint_frequency": "proactive", "challenge_chunk_size": "bite_sized"}
            },
            "fast_learner": {
                "name": "Persona 2: Sarah (Fast Learner)",
                "subtitle": "High Accuracy • Skips Basics • Advanced Ready",
                "skills": {
                    "fundamentals": {"current_mastery": 0.95, "status": "MASTERED", "evidence_count": 5, "last_practiced_at": now},
                    "methods": {"current_mastery": 0.92, "status": "MASTERED", "evidence_count": 4, "last_practiced_at": now},
                    "oop_basics": {"current_mastery": 0.90, "status": "MASTERED", "evidence_count": 5, "last_practiced_at": now},
                    "inheritance": {"current_mastery": 0.88, "status": "MASTERED", "evidence_count": 4, "last_practiced_at": now},
                    "polymorphism": {"current_mastery": 0.55, "status": "DEVELOPING", "evidence_count": 2, "last_practiced_at": now}
                },
                "adaptive": {"content_chunking": "standard", "guided_hint_frequency": "standard", "challenge_chunk_size": "standard"}
            },
            "struggling_learner": {
                "name": "Persona 3: Jordan (Struggling Learner)",
                "subtitle": "Repeated Mistakes • High Hint Usage • Inclusive Path",
                "skills": {
                    "fundamentals": {"current_mastery": 0.72, "status": "PROFICIENT", "evidence_count": 4, "last_practiced_at": now},
                    "methods": {"current_mastery": 0.65, "status": "DEVELOPING", "evidence_count": 3, "last_practiced_at": now},
                    "oop_basics": {"current_mastery": 0.68, "status": "DEVELOPING", "evidence_count": 3, "last_practiced_at": now},
                    "inheritance": {"current_mastery": 0.42, "status": "NEEDS_PRACTICE", "evidence_count": 3, "gaps": ["Method overriding logic"], "last_practiced_at": now},
                    "polymorphism": {"current_mastery": None, "status": "NOT_ASSESSED", "evidence_count": 0}
                },
                "adaptive": {"content_chunking": "micro_chunked", "visual_density": "minimal_low_distraction", "guided_hint_frequency": "proactive", "challenge_chunk_size": "bite_sized"}
            },
            "decayed_learner": {
                "name": "Persona 4: Haritha (Previously Strong / Decayed)",
                "subtitle": "Previously Mastered (92%) • 3 Weeks Inactive • Skill Revival",
                "skills": {
                    "fundamentals": {"current_mastery": 0.92, "status": "MASTERED", "evidence_count": 5, "last_practiced_at": now - timedelta(days=28)},
                    "methods": {"current_mastery": 0.88, "status": "MASTERED", "evidence_count": 4, "last_practiced_at": now - timedelta(days=28)},
                    "oop_basics": {"current_mastery": 0.90, "status": "MASTERED", "evidence_count": 4, "last_practiced_at": now - timedelta(days=25)},
                    "inheritance": {"current_mastery": 0.92, "status": "MASTERED", "evidence_count": 4, "last_practiced_at": now - timedelta(days=22)},
                    "polymorphism": {"current_mastery": 0.35, "status": "NEEDS_PRACTICE", "evidence_count": 1, "last_practiced_at": now - timedelta(days=20)}
                },
                "adaptive": {"content_chunking": "standard", "visual_density": "standard", "focus_mode_active": True}
            },
            "low_engagement": {
                "name": "Persona 5: Chris (High Knowledge / Low Engagement)",
                "subtitle": "High Mastery • Short Attention Span • Rapid Bite-Sized",
                "skills": {
                    "fundamentals": {"current_mastery": 0.85, "status": "MASTERED", "evidence_count": 3, "last_practiced_at": now},
                    "methods": {"current_mastery": 0.82, "status": "PROFICIENT", "evidence_count": 3, "last_practiced_at": now},
                    "oop_basics": {"current_mastery": 0.78, "status": "PROFICIENT", "evidence_count": 3, "last_practiced_at": now},
                    "inheritance": {"current_mastery": 0.62, "status": "DEVELOPING", "evidence_count": 2, "last_practiced_at": now},
                    "polymorphism": {"current_mastery": None, "status": "NOT_ASSESSED", "evidence_count": 0}
                },
                "adaptive": {"content_chunking": "micro_chunked", "visual_density": "minimal_low_distraction", "challenge_chunk_size": "bite_sized"}
            }
        }

        persona = personas_data.get(actual_persona_id) or personas_data["beginner"]
        learner_id = f"demo_persona_{actual_persona_id}"

        # 1. Update user record
        await db["users"].update_one(
            {"_id": actual_user_id},
            {"$set": {"learner_id": learner_id, "learner_name": persona["name"]}}
        )

        # 2. Seed skill mastery state
        await db["skill_mastery_states"].update_one(
            {"learner_id": learner_id},
            {"$set": {"learner_id": learner_id, "skills": persona["skills"], "updated_at": now}},
            upsert=True
        )

        # 3. Seed adaptive profile
        await db["learner_adaptive_settings"].update_one(
            {"learner_id": learner_id},
            {"$set": {**persona["adaptive"], "learner_id": learner_id, "updated_at": now}},
            upsert=True
        )

        # 4. Generate recommendation for activated persona
        recommendation = await self.compute_next_best_skill(learner_id)

        return {
            "persona_id": actual_persona_id,
            "learner_id": learner_id,
            "name": persona["name"],
            "subtitle": persona["subtitle"],
            "recommendation": recommendation.model_dump(),
            "adaptive_settings": persona["adaptive"]
        }


intelligence_layer_service = IntelligenceLayerService()
