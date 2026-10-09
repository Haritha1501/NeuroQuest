import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from app.database import get_database
from app.models.skill_map import (
    SkillEdge,
    PrerequisiteCheckItem,
    SkillGraphNodeDefinition,
    LearnerSkillStateNode,
    FocusModeStep,
    CandidateSkillInfo,
    DynamicSkillMapResponse
)
from app.services.mastery_game_service import mastery_game_service, MASTER_QUESTS

logger = logging.getLogger("neuroquest.skill_map")

# ==============================================================================
# 1. CANONICAL MULTI-LEVEL SKILL GRAPH (SEPARATED FROM LEARNER STATE)
# ==============================================================================
CANONICAL_SKILL_NODES: Dict[str, Dict[str, Any]] = {
    "fundamentals": {
        "id": "fundamentals",
        "name": "Java Fundamentals",
        "short_name": "Fundamentals",
        "description": "Variables, primitive data types, memory representations, and control flow loops.",
        "parent_skill_id": None,
        "level": 1,
        "category": "Core Foundations",
        "difficulty": 1,
        "quest_id": "quest_fundamentals",
        "target_mastery": 0.70,
        "default_strengths": ["Variable declaration & primitive types", "Basic loop control flow"],
        "default_gaps": ["Block scope lifecycle edge cases"]
    },
    "variables": {
        "id": "variables",
        "name": "Variables & Data Types",
        "short_name": "Variables",
        "description": "Primitive vs reference storage, type conversion, and memory allocation.",
        "parent_skill_id": "fundamentals",
        "level": 2,
        "category": "Core Foundations",
        "difficulty": 1,
        "quest_id": "quest_fundamentals",
        "target_mastery": 0.70,
        "default_strengths": ["Primitive type selection (int, double, boolean)", "Value assignment"],
        "default_gaps": ["Floating-point precision casts"]
    },
    "methods": {
        "id": "methods",
        "name": "Methods & Functions",
        "short_name": "Methods",
        "description": "Method signatures, return contracts, parameter passing by value, and modular scope.",
        "parent_skill_id": "fundamentals",
        "level": 2,
        "category": "Core Foundations",
        "difficulty": 2,
        "quest_id": "quest_methods",
        "target_mastery": 0.70,
        "default_strengths": ["Method invocation & return types", "Parameter passing"],
        "default_gaps": ["Pass-by-value vs object reference mutation"]
    },
    "arrays": {
        "id": "arrays",
        "name": "Arrays & Iteration",
        "short_name": "Arrays",
        "description": "Fixed-size indexed contiguous collections, zero-based indexing, and loop traversal.",
        "parent_skill_id": "fundamentals",
        "level": 2,
        "category": "Core Foundations",
        "difficulty": 2,
        "quest_id": "quest_fundamentals",
        "target_mastery": 0.70,
        "default_strengths": ["Zero-based index access", "For-loop array traversal"],
        "default_gaps": ["Boundary index out-of-bounds prevention"]
    },
    "oop_basics": {
        "id": "oop_basics",
        "name": "OOP: Classes & Objects",
        "short_name": "Classes & Objects",
        "description": "Classes as blueprints, object instantiation, constructors, and field encapsulation.",
        "parent_skill_id": None,
        "level": 2,
        "category": "Object-Oriented Programming",
        "difficulty": 2,
        "quest_id": "quest_oop_basics",
        "target_mastery": 0.70,
        "default_strengths": ["Class blueprint design", "Constructor initialization"],
        "default_gaps": ["Private state encapsulation & reference aliasing"]
    },
    "inheritance": {
        "id": "inheritance",
        "name": "Inheritance & Subclassing",
        "short_name": "Inheritance",
        "description": "Class hierarchies, extends keyword, super constructors, and method overriding.",
        "parent_skill_id": "oop_basics",
        "level": 3,
        "category": "Object-Oriented Programming",
        "difficulty": 3,
        "quest_id": "quest_inheritance",
        "target_mastery": 0.70,
        "default_strengths": ["Basic subclassing with extends", "Shared superclass attributes"],
        "default_gaps": ["Constructor chaining with super() and method overriding"]
    },
    "polymorphism": {
        "id": "polymorphism",
        "name": "Polymorphism & Dynamic Dispatch",
        "short_name": "Polymorphism",
        "description": "Runtime method dispatch, upcasting, method overriding resolution, and flexible design.",
        "parent_skill_id": "inheritance",
        "level": 4,
        "category": "Advanced OOP Architecture",
        "difficulty": 4,
        "quest_id": "quest_polymorphism",
        "target_mastery": 0.70,
        "default_strengths": ["Upcasting subclass instances to base references"],
        "default_gaps": ["Runtime dynamic method dispatch under overriding"]
    },
    "interfaces": {
        "id": "interfaces",
        "name": "Interfaces & Abstract Contracts",
        "short_name": "Interfaces",
        "description": "Decoupled behavioral contracts, implements keyword, and multi-interface architecture.",
        "parent_skill_id": "polymorphism",
        "level": 4,
        "category": "Advanced OOP Architecture",
        "difficulty": 4,
        "quest_id": "quest_polymorphism",
        "target_mastery": 0.70,
        "default_strengths": ["Defining behavioral method signatures"],
        "default_gaps": ["Multiple interface implementation contracts"]
    },
    "collections": {
        "id": "collections",
        "name": "Collections & Generics",
        "short_name": "Collections",
        "description": "Dynamic data structures, ArrayList, HashMap, generic type safety, and iteration.",
        "parent_skill_id": "oop_basics",
        "level": 4,
        "category": "Data Structures",
        "difficulty": 4,
        "quest_id": "quest_collections",
        "target_mastery": 0.70,
        "default_strengths": ["Dynamic list sizing with ArrayList"],
        "default_gaps": ["Generic type constraints & algorithmic complexity"]
    }
}

# ==============================================================================
# 2. CANONICAL SKILL RELATIONSHIPS / EDGES
# ==============================================================================
CANONICAL_SKILL_EDGES: List[Dict[str, Any]] = [
    # Prerequisite & Part-of edges from Fundamentals
    {
        "id": "edge_fund_var",
        "source_skill_id": "fundamentals",
        "target_skill_id": "variables",
        "relationship_type": "part_of",
        "required_mastery": 0.0,
        "label": "part of"
    },
    {
        "id": "edge_fund_methods",
        "source_skill_id": "fundamentals",
        "target_skill_id": "methods",
        "relationship_type": "prerequisite",
        "required_mastery": 0.70,
        "label": "prerequisite (≥70%)"
    },
    {
        "id": "edge_fund_arrays",
        "source_skill_id": "fundamentals",
        "target_skill_id": "arrays",
        "relationship_type": "prerequisite",
        "required_mastery": 0.60,
        "label": "prerequisite (≥60%)"
    },
    # Prerequisites into OOP Basics
    {
        "id": "edge_fund_oop",
        "source_skill_id": "fundamentals",
        "target_skill_id": "oop_basics",
        "relationship_type": "prerequisite",
        "required_mastery": 0.70,
        "label": "prerequisite (≥70%)"
    },
    {
        "id": "edge_methods_oop",
        "source_skill_id": "methods",
        "target_skill_id": "oop_basics",
        "relationship_type": "prerequisite",
        "required_mastery": 0.60,
        "label": "prerequisite (≥60%)"
    },
    # OOP Basics -> Inheritance
    {
        "id": "edge_oop_inher",
        "source_skill_id": "oop_basics",
        "target_skill_id": "inheritance",
        "relationship_type": "prerequisite",
        "required_mastery": 0.70,
        "label": "prerequisite (≥70%)"
    },
    # Inheritance -> Polymorphism
    {
        "id": "edge_inher_poly",
        "source_skill_id": "inheritance",
        "target_skill_id": "polymorphism",
        "relationship_type": "prerequisite",
        "required_mastery": 0.70,
        "label": "unlocks (≥70%)"
    },
    {
        "id": "edge_methods_poly",
        "source_skill_id": "methods",
        "target_skill_id": "polymorphism",
        "relationship_type": "depends_on",
        "required_mastery": 0.60,
        "label": "depends on (≥60%)"
    },
    # Polymorphism -> Interfaces
    {
        "id": "edge_poly_inter",
        "source_skill_id": "polymorphism",
        "target_skill_id": "interfaces",
        "relationship_type": "prerequisite",
        "required_mastery": 0.70,
        "label": "unlocks (≥70%)"
    },
    # Prerequisites & Relations into Collections
    {
        "id": "edge_oop_coll",
        "source_skill_id": "oop_basics",
        "target_skill_id": "collections",
        "relationship_type": "prerequisite",
        "required_mastery": 0.70,
        "label": "prerequisite (≥70%)"
    },
    {
        "id": "edge_inher_coll",
        "source_skill_id": "inheritance",
        "target_skill_id": "collections",
        "relationship_type": "prerequisite",
        "required_mastery": 0.70,
        "label": "prerequisite (≥70%)"
    },
    {
        "id": "edge_arrays_coll",
        "source_skill_id": "arrays",
        "target_skill_id": "collections",
        "relationship_type": "related_to",
        "required_mastery": 0.0,
        "label": "related concept"
    }
]

EVOLUTION_LABELS = {
    "unexplored": "🔒 Unexplored",
    "seed": "🌱 Discovered",
    "sprout": "🌿 Developing",
    "strong": "🌳 Proficient",
    "mastered": "🏆 Mastered"
}


class SkillMapService:
    """
    Living Learner Knowledge Graph Engine (Feature 2).
    Combines the canonical Skill Graph with real-time Learner State from
    SkillForge Calibration (Feature 1) and Mastery Quests (Feature 4).
    """

    def get_canonical_graph(self) -> Dict[str, Any]:
        """Returns the pure, learner-independent curriculum skill graph."""
        return {
            "subject": "Java Programming",
            "levels": [
                {"level": 1, "title": "Level 1 • Core Foundations", "skills": ["fundamentals"]},
                {"level": 2, "title": "Level 2 • Building Blocks & OOP", "skills": ["variables", "methods", "arrays", "oop_basics"]},
                {"level": 3, "title": "Level 3 • Class Hierarchies", "skills": ["inheritance"]},
                {"level": 4, "title": "Level 4 • Advanced Architecture & Data Structures", "skills": ["polymorphism", "interfaces", "collections"]}
            ],
            "nodes": list(CANONICAL_SKILL_NODES.values()),
            "edges": CANONICAL_SKILL_EDGES
        }

    def _normalize_skill_key(self, raw_name: str) -> str:
        s = raw_name.strip().lower().replace(" ", "_")
        if s in CANONICAL_SKILL_NODES:
            return s
        if "oop" in s or "class" in s or "object" in s:
            return "oop_basics"
        if "fund" in s:
            return "fundamentals"
        if "var" in s:
            return "variables"
        if "meth" in s or "func" in s:
            return "methods"
        if "arr" in s:
            return "arrays"
        if "inher" in s:
            return "inheritance"
        if "poly" in s:
            return "polymorphism"
        if "inter" in s:
            return "interfaces"
        if "coll" in s:
            return "collections"
        return s

    async def _load_learner_raw_state(self, learner_id: str) -> Dict[str, Dict[str, Any]]:
        """
        Loads and merges learner skill evidence from:
        1. `learner_skill_profiles` / `calibration_profiles` (Feature 1 Calibration)
        2. `skill_mastery_states` (Feature 4 Mastery Game Quests)
        Preserves untested skills as None (NOT_ASSESSED), never 0%.
        """
        db = get_database()
        merged: Dict[str, Dict[str, Any]] = {}

        # 1. Read Calibration Profile (Feature 1)
        calib_doc = await db["calibration_profiles"].find_one(
            {"learner_id": learner_id},
            sort=[("calibrated_at", -1)]
        )
        if not calib_doc:
            calib_doc = await db["learner_skill_profiles"].find_one(
                {"learner_id": learner_id},
                sort=[("calibrated_at", -1)]
            )

        if calib_doc and "skills" in calib_doc:
            raw_skills = calib_doc["skills"]
            items = list(raw_skills.values()) if isinstance(raw_skills, dict) else raw_skills
            calib_time = calib_doc.get("calibrated_at") or datetime.utcnow()

            for item in items:
                raw_name = item.get("skill") or item.get("skill_name") or ""
                key = self._normalize_skill_key(raw_name)
                score = item.get("mastery_score")
                ev_count = item.get("evidence_count", 0)
                strengths = item.get("strengths", [])
                gaps = item.get("gaps", [])

                merged[key] = {
                    "mastery_score": score,
                    "previous_mastery": score,
                    "evidence_count": ev_count,
                    "strengths": strengths,
                    "gaps": gaps,
                    "from_calibration": score is not None,
                    "last_assessed_at": item.get("last_assessed") or calib_time,
                    "last_practiced_at": item.get("last_practiced_at") or calib_time
                }

        # 2. Overlay Mastery Quest State (Feature 4)
        state_doc = await db["skill_mastery_states"].find_one({"learner_id": learner_id})
        if state_doc and "skills" in state_doc:
            for k, val in state_doc["skills"].items():
                key = self._normalize_skill_key(k)
                curr_m = val.get("current_mastery")
                prev_m = val.get("previous_mastery", curr_m)
                ev_cnt = val.get("evidence_count", 0)
                last_dt = val.get("last_assessed_at") or datetime.utcnow()
                last_prac = val.get("last_practiced_at") or last_dt

                existing = merged.get(key, {})
                # If mastery state has an explicit assessment or higher evidence, update
                if curr_m is not None or key not in merged:
                    merged[key] = {
                        "mastery_score": curr_m,
                        "previous_mastery": prev_m if prev_m is not None else existing.get("mastery_score"),
                        "evidence_count": max(ev_cnt, existing.get("evidence_count", 0)),
                        "strengths": val.get("strengths") or existing.get("strengths", []),
                        "gaps": val.get("gaps") or existing.get("gaps", []),
                        "from_calibration": existing.get("from_calibration", False),
                        "from_quests": curr_m is not None,
                        "last_assessed_at": last_dt,
                        "last_practiced_at": last_prac
                    }

        # Propagate Fundamentals score to Variables if Variables wasn't separately assessed
        # only when Fundamentals has been assessed
        if "fundamentals" in merged and merged["fundamentals"].get("mastery_score") is not None:
            fund_data = merged["fundamentals"]
            if "variables" not in merged or merged["variables"].get("mastery_score") is None:
                merged["variables"] = {
                    "mastery_score": min(1.0, round(fund_data["mastery_score"] * 1.04, 2)),
                    "previous_mastery": fund_data.get("previous_mastery"),
                    "evidence_count": max(1, fund_data.get("evidence_count", 1)),
                    "strengths": ["Primitive variables & memory containers"],
                    "gaps": [],
                    "from_calibration": fund_data.get("from_calibration", True),
                    "last_assessed_at": fund_data.get("last_assessed_at"),
                    "last_practiced_at": fund_data.get("last_practiced_at")
                }

        return merged

    def _build_evidence_items(self, raw_entry: Dict[str, Any], score: Optional[float]) -> List[str]:
        if score is None:
            return []
        ev_count = raw_entry.get("evidence_count", 1)
        items = []
        if raw_entry.get("from_calibration"):
            items.append("✓ SkillForge Adaptive Diagnostic Calibration")
        if ev_count >= 1:
            c_checks = max(1, min(5, ev_count))
            items.append(f"✓ {c_checks} concept understanding check{'s' if c_checks > 1 else ''}")
        if ev_count >= 2:
            app_cnt = max(1, ev_count - 1)
            items.append(f"✓ {app_cnt} code application challenge{'s' if app_cnt > 1 else ''}")
        if ev_count >= 3:
            rec_cnt = max(1, ev_count // 2)
            items.append(f"✓ {rec_cnt} recall & syntax verification{'s' if rec_cnt > 1 else ''}")
        return items

    async def build_learner_skill_map(self, learner_id: str) -> DynamicSkillMapResponse:
        """
        Constructs the complete, living Learner Knowledge Graph for `learner_id`.
        """
        raw_state = await self._load_learner_raw_state(learner_id)

        # Build prerequisite lookup per target skill
        prereq_edges_by_target: Dict[str, List[Dict[str, Any]]] = {}
        unlocks_by_source: Dict[str, List[str]] = {}
        related_by_skill: Dict[str, List[str]] = {}

        for edge in CANONICAL_SKILL_EDGES:
            src = edge["source_skill_id"]
            tgt = edge["target_skill_id"]
            rtype = edge["relationship_type"]

            if rtype in ("prerequisite", "depends_on") and edge["required_mastery"] > 0:
                prereq_edges_by_target.setdefault(tgt, []).append(edge)
            if rtype in ("prerequisite", "unlocks"):
                tgt_name = CANONICAL_SKILL_NODES.get(tgt, {}).get("short_name", tgt)
                if tgt_name not in unlocks_by_source.setdefault(src, []):
                    unlocks_by_source[src].append(tgt_name)
            if rtype == "related_to":
                s_name = CANONICAL_SKILL_NODES.get(src, {}).get("short_name", src)
                t_name = CANONICAL_SKILL_NODES.get(tgt, {}).get("short_name", tgt)
                related_by_skill.setdefault(src, []).append(t_name)
                related_by_skill.setdefault(tgt, []).append(s_name)

        # First pass: evaluate unlock gates and base states for each node
        nodes: List[LearnerSkillStateNode] = []
        now = datetime.utcnow()

        for skill_id, defn in CANONICAL_SKILL_NODES.items():
            entry = raw_state.get(skill_id, {})
            score: Optional[float] = entry.get("mastery_score")
            prev_score: Optional[float] = entry.get("previous_mastery")
            ev_count: int = entry.get("evidence_count", 0) if score is not None else 0
            last_assessed = entry.get("last_assessed_at")
            last_practiced = entry.get("last_practiced_at")

            # Check prerequisites
            p_edges = prereq_edges_by_target.get(skill_id, [])
            prereq_checks: List[PrerequisiteCheckItem] = []
            is_unlocked = True
            missing_reasons: List[str] = []

            for pe in p_edges:
                p_id = pe["source_skill_id"]
                req_m = pe["required_mastery"]
                p_defn = CANONICAL_SKILL_NODES.get(p_id, {})
                p_name = p_defn.get("short_name", p_id)
                p_curr = raw_state.get(p_id, {}).get("mastery_score")

                # Special rule: if this is `oop_basics`, only require `fundamentals >= 0.70` to unlock
                # if `methods` is still developing, matching mastery_game_service gate behavior
                if skill_id == "oop_basics" and p_id == "methods":
                    fund_m = raw_state.get("fundamentals", {}).get("mastery_score")
                    if fund_m is not None and fund_m >= 0.70 and (p_curr is not None and p_curr >= 0.50):
                        req_m = 0.50

                # Similarly for polymorphism: primary gate is inheritance >= 0.70
                if skill_id == "polymorphism" and p_id == "methods":
                    inher_m = raw_state.get("inheritance", {}).get("mastery_score")
                    if inher_m is not None and inher_m >= 0.70:
                        req_m = 0.0  # satisfied via inheritance mastery

                is_met = (p_curr is not None and p_curr >= req_m) if req_m > 0 else True
                prereq_checks.append(
                    PrerequisiteCheckItem(
                        skill_id=p_id,
                        skill_name=p_name,
                        required_mastery=req_m,
                        required_percentage=int(round(req_m * 100)),
                        current_mastery=p_curr,
                        current_percentage=int(round(p_curr * 100)) if p_curr is not None else None,
                        is_met=is_met
                    )
                )
                if not is_met:
                    is_unlocked = False
                    missing_reasons.append(f"{p_name} ≥ {int(round(req_m * 100))}%")

            # If learner already has calibration/quest evidence on a skill (e.g. Inheritance = 20% from calibration),
            # allow them to see their assessed state (NEEDS_PRACTICE / DEVELOPING) while still noting prerequisites!
            # Only strictly lock unassessed downstream skills whose prerequisites aren't met.
            if score is not None and skill_id in ("fundamentals", "variables", "methods", "arrays", "oop_basics", "inheritance"):
                is_unlocked = True

            # Determine mastery_status & node_state
            if not is_unlocked:
                mastery_status = "LOCKED"
                node_state = "LOCKED"
            elif score is None:
                mastery_status = "NOT_ASSESSED"
                node_state = "NOT_ASSESSED"
            elif score >= 0.85:
                mastery_status = "MASTERED"
                node_state = "MASTERED"
            elif score >= 0.70:
                mastery_status = "PROFICIENT"
                node_state = "MASTERED"
            elif score >= 0.50:
                mastery_status = "DEVELOPING"
                node_state = "DEVELOPING"
            else:
                mastery_status = "NEEDS_PRACTICE"
                node_state = "NEEDS_PRACTICE"

            evolution_stage = mastery_game_service.compute_evolution_stage(score)
            evolution_label = EVOLUTION_LABELS.get(evolution_stage, "🔒 Unexplored")

            confidence = "HIGH" if ev_count >= 4 else "MEDIUM" if ev_count >= 2 else "LOW"
            if score is None:
                confidence = "LOW"

            # Knowledge decay check (if practiced > 14 days ago and score >= 0.70)
            refresh_recommended = False
            if last_practiced and isinstance(last_practiced, datetime) and score is not None and score >= 0.70:
                if (now - last_practiced) > timedelta(days=14):
                    refresh_recommended = True

            # Strengths & Needs Practice
            strengths = list(entry.get("strengths") or [])
            gaps = list(entry.get("gaps") or [])
            if score is not None:
                if score >= 0.50 and not strengths:
                    strengths = defn.get("default_strengths", [])
                if score < 0.75 and not gaps:
                    gaps = defn.get("default_gaps", [])

            # Explainability: why_locked & why_here
            why_locked = None
            if not is_unlocked:
                p_names = [p.skill_name for p in prereq_checks]
                why_locked = (
                    f"{defn['short_name']} builds on {' and '.join(p_names)}. "
                    f"To unlock: {', '.join(missing_reasons)}."
                )

            unlocks_list = unlocks_by_source.get(skill_id, [])
            if unlocks_list:
                why_here = f"{defn['short_name']} is a key building block that unlocks {', '.join(unlocks_list)}."
            else:
                why_here = f"{defn['short_name']} synthesizes core concepts in {defn['category']}."

            quest_id = defn.get("quest_id")
            q_obj = MASTER_QUESTS.get(quest_id) if quest_id else None

            nodes.append(
                LearnerSkillStateNode(
                    skill_id=skill_id,
                    name=defn["name"],
                    short_name=defn["short_name"],
                    description=defn["description"],
                    level=defn["level"],
                    parent_skill_id=defn["parent_skill_id"],
                    category=defn["category"],
                    difficulty=defn["difficulty"],
                    mastery_score=score,
                    previous_mastery=prev_score,
                    mastery_percentage=int(round(score * 100)) if score is not None else None,
                    node_state=node_state,
                    mastery_status=mastery_status,
                    evolution_stage=evolution_stage,
                    evolution_label=evolution_label,
                    is_unlocked=is_unlocked,
                    confidence=confidence,
                    evidence_count=ev_count,
                    evidence_items=self._build_evidence_items(entry, score),
                    strengths=strengths,
                    needs_practice=gaps,
                    prerequisites=prereq_checks,
                    unlocks_skills=unlocks_list,
                    related_skills=related_by_skill.get(skill_id, []),
                    why_locked=why_locked,
                    why_here=why_here,
                    quest_id=quest_id,
                    quest_title=q_obj.title if q_obj else f"Master {defn['short_name']}",
                    target_mastery=defn.get("target_mastery", 0.70),
                    last_assessed_at=last_assessed,
                    last_practiced_at=last_practiced,
                    refresh_recommended=refresh_recommended
                )
            )

        node_map = {n.skill_id: n for n in nodes}

        # ======================================================================
        # 3. IDENTIFY PRIMARY SKILL GAP, "YOU ARE HERE", AND "NEXT BEST SKILL"
        # ======================================================================
        # Candidate scoring for unlocked skills that are not yet mastered (< 0.85)
        candidates: List[CandidateSkillInfo] = []
        primary_gap_id: Optional[str] = None
        lowest_assessed_score = 1.0

        # Prioritize main progression spine skills first
        spine_order = ["fundamentals", "methods", "oop_basics", "inheritance", "polymorphism", "collections", "variables", "arrays", "interfaces"]

        for sid in spine_order:
            n = node_map.get(sid)
            if not n or not n.is_unlocked:
                continue

            # Track primary gap (unlocked, assessed skill with score < 0.70)
            if n.mastery_score is not None and n.mastery_score < 0.70:
                if primary_gap_id is None or n.mastery_score < lowest_assessed_score:
                    primary_gap_id = n.skill_id
                    lowest_assessed_score = n.mastery_score

            # Calculate candidate priority for Next-Best-Skill Engine
            if n.mastery_score is None or n.mastery_score < 0.85:
                curr_val = n.mastery_score if n.mastery_score is not None else 0.35
                learning_val = round(1.0 - curr_val, 2)
                unlock_val = round(min(1.0, len(n.unlocks_skills) * 0.35), 2)
                is_gap_bonus = 0.25 if (n.mastery_score is not None and n.mastery_score < 0.70) else 0.0
                spine_bonus = 0.15 if sid in ("fundamentals", "methods", "oop_basics", "inheritance", "polymorphism", "collections") else 0.0

                priority = round(learning_val * 0.45 + unlock_val * 0.30 + is_gap_bonus + spine_bonus, 3)

                if n.mastery_score is not None and n.mastery_score < 0.50:
                    reason = (
                        f"Your recent responses show a priority knowledge gap in {n.short_name} ({n.mastery_percentage}%). "
                        f"Strengthening this unlocks {', '.join(n.unlocks_skills) if n.unlocks_skills else 'advanced quests'}."
                    )
                elif n.mastery_score is not None and n.mastery_score < 0.70:
                    reason = (
                        f"You are developing {n.short_name} ({n.mastery_percentage}%). "
                        f"Reaching 70% proficiency will unlock {', '.join(n.unlocks_skills) if n.unlocks_skills else 'the next tier'}."
                    )
                else:
                    reason = (
                        f"Prerequisites are satisfied! {n.short_name} is ready to explore and assess."
                    )

                candidates.append(
                    CandidateSkillInfo(
                        skill_id=n.skill_id,
                        skill_name=n.name,
                        mastery_score=n.mastery_score,
                        confidence=n.confidence,
                        difficulty=n.difficulty,
                        prerequisites_met=True,
                        learning_value=learning_val,
                        unlock_value=unlock_val,
                        priority_score=priority,
                        reason=reason
                    )
                )

        candidates.sort(key=lambda c: c.priority_score, reverse=True)

        # Determine "📍 YOU ARE HERE" (Current active skill)
        if primary_gap_id:
            you_are_here_id = primary_gap_id
        elif candidates:
            you_are_here_id = candidates[0].skill_id
        else:
            you_are_here_id = "polymorphism"

        # Determine "⭐ NEXT SKILL"
        next_rec_id = you_are_here_id
        if len(candidates) > 1:
            next_rec_id = candidates[1].skill_id
        else:
            # Find first locked skill that depends on you_are_here_id
            for pe in CANONICAL_SKILL_EDGES:
                if pe["source_skill_id"] == you_are_here_id and pe["relationship_type"] in ("prerequisite", "unlocks"):
                    next_rec_id = pe["target_skill_id"]
                    break

        # Annotate nodes with flags and explainability
        for n in nodes:
            if n.skill_id == you_are_here_id:
                n.is_you_are_here = True
                n.why_recommended = (
                    f"You are currently positioned at {n.short_name}. "
                    + (
                        f"Elevating mastery from {n.mastery_percentage}% to {int(n.target_mastery * 100)}% unlocks {', '.join(n.unlocks_skills)}."
                        if n.mastery_percentage is not None and n.unlocks_skills
                        else "Complete the quest to demonstrate mastery and open new paths."
                    )
                )
            if n.skill_id == next_rec_id:
                n.is_next_recommended = True
                if not n.why_recommended:
                    n.why_recommended = (
                        f"{n.short_name} is your next strategic frontier after {node_map[you_are_here_id].short_name}."
                    )
            if n.skill_id == primary_gap_id:
                n.is_primary_gap = True

        # Build Typed Edges with live satisfaction status
        edges: List[SkillEdge] = []
        for ed in CANONICAL_SKILL_EDGES:
            src_node = node_map.get(ed["source_skill_id"])
            req = ed["required_mastery"]
            satisfied = True
            if req > 0:
                satisfied = (src_node is not None and src_node.mastery_score is not None and src_node.mastery_score >= req)
            edges.append(
                SkillEdge(
                    id=ed["id"],
                    source_skill_id=ed["source_skill_id"],
                    target_skill_id=ed["target_skill_id"],
                    relationship_type=ed["relationship_type"],
                    required_mastery=req,
                    label=ed["label"],
                    is_satisfied=satisfied
                )
            )

        # ======================================================================
        # 4. BUILD SMART FOCUS MODE PATH (4 CLEAR STEPS)
        # ======================================================================
        focus_path: List[FocusModeStep] = []
        here_node = node_map.get(you_are_here_id)
        if here_node:
            # Step 1: YOU ARE HERE
            focus_path.append(
                FocusModeStep(
                    step_order=1,
                    step_type="YOU_ARE_HERE",
                    badge="📍 YOU ARE HERE",
                    skill_id=here_node.skill_id,
                    skill_name=here_node.name,
                    mastery_percentage=here_node.mastery_percentage,
                    target_percentage=int(here_node.target_mastery * 100),
                    node_state=here_node.node_state,
                    summary=(
                        f"Current mastery: {here_node.mastery_percentage}%"
                        if here_node.mastery_percentage is not None
                        else "Not Yet Assessed — Ready to start"
                    ),
                    quest_id=here_node.quest_id
                )
            )

            # Step 2: PREREQUISITE GAP / TARGET GOAL
            focus_path.append(
                FocusModeStep(
                    step_order=2,
                    step_type="TARGET_MILESTONE",
                    badge="🎯 CURRENT GOAL",
                    skill_id=here_node.skill_id,
                    skill_name=f"Improve {here_node.short_name} to {int(here_node.target_mastery * 100)}%",
                    mastery_percentage=here_node.mastery_percentage,
                    target_percentage=int(here_node.target_mastery * 100),
                    node_state="CURRENT",
                    summary=f"Complete the 5-stage '{here_node.quest_title}' to demonstrate proficiency.",
                    quest_id=here_node.quest_id
                )
            )

            # Step 3: NEXT SKILL TO UNLOCK
            next_node = node_map.get(next_rec_id)
            if next_node and next_node.skill_id != here_node.skill_id:
                focus_path.append(
                    FocusModeStep(
                        step_order=3,
                        step_type="NEXT_UNLOCK",
                        badge="🔓 NEXT SKILL" if next_node.is_unlocked else "⭐ UNLOCKS NEXT",
                        skill_id=next_node.skill_id,
                        skill_name=next_node.name,
                        mastery_percentage=next_node.mastery_percentage,
                        target_percentage=int(next_node.target_mastery * 100),
                        node_state=next_node.node_state,
                        summary=next_node.why_locked or next_node.description,
                        quest_id=next_node.quest_id
                    )
                )

            # Step 4: FUTURE UNLOCK HORIZON
            future_node = next(
                (n for n in nodes if not n.is_unlocked and n.skill_id not in (here_node.skill_id, next_rec_id)),
                node_map.get("interfaces")
            )
            if future_node:
                focus_path.append(
                    FocusModeStep(
                        step_order=4,
                        step_type="FUTURE_HORIZON",
                        badge="🔒 FUTURE UNLOCK",
                        skill_id=future_node.skill_id,
                        skill_name=future_node.name,
                        mastery_percentage=future_node.mastery_percentage,
                        target_percentage=int(future_node.target_mastery * 100),
                        node_state=future_node.node_state,
                        summary=future_node.why_locked or future_node.description,
                        quest_id=future_node.quest_id
                    )
                )

        # Summary Stats
        assessed_scores = [n.mastery_score for n in nodes if n.mastery_score is not None]
        summary_stats = {
            "total_skills": len(nodes),
            "mastered_count": sum(1 for n in nodes if n.node_state == "MASTERED"),
            "developing_count": sum(1 for n in nodes if n.node_state == "DEVELOPING"),
            "needs_practice_count": sum(1 for n in nodes if n.node_state == "NEEDS_PRACTICE"),
            "not_assessed_count": sum(1 for n in nodes if n.node_state == "NOT_ASSESSED"),
            "locked_count": sum(1 for n in nodes if n.node_state == "LOCKED"),
            "overall_mastery_pct": int(round((sum(assessed_scores) / len(assessed_scores)) * 100)) if assessed_scores else None
        }

        return DynamicSkillMapResponse(
            learner_id=learner_id,
            subject_root="Java",
            graph_definition=self.get_canonical_graph(),
            nodes=nodes,
            edges=edges,
            you_are_here_node_id=you_are_here_id,
            next_recommended_node_id=next_rec_id,
            primary_gap_node_id=primary_gap_id,
            focus_path=focus_path,
            candidate_skills=candidates,
            summary_stats=summary_stats,
            last_updated_at=now
        )


skill_map_service = SkillMapService()
