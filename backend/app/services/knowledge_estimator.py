from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.calibration import (
    CalibrationQuestion,
    CalibrationAnswerSubmit,
    SkillMasteryItem,
    LearnerSkillProfile,
    RecommendedStartingPoint
)

# --------------------------------------------------------------------------
# CANONICAL SKILL GRAPH & PREREQUISITES
# --------------------------------------------------------------------------
ALL_SKILLS = [
    "Fundamentals",
    "Methods",
    "OOP Basics",
    "Inheritance",
    "Polymorphism",
    "Collections"
]

SKILL_PREREQUISITES: Dict[str, List[str]] = {
    "Fundamentals": [],
    "Methods": ["Fundamentals"],
    "OOP Basics": ["Fundamentals", "Methods"],
    "Inheritance": ["OOP Basics"],
    "Polymorphism": ["Inheritance"],
    "Collections": ["OOP Basics", "Inheritance"]
}

# --------------------------------------------------------------------------
# CURATED ADAPTIVE QUESTION BANK
# --------------------------------------------------------------------------
QUESTION_BANK: List[Dict[str, Any]] = [
    # --- FUNDAMENTALS ---
    {
        "id": "sf_var_01",
        "topic": "Java & Programming",
        "skill": "Fundamentals",
        "subskill": "Variables & Types",
        "difficulty": 1,
        "type": "concept_identification",
        "prompt": "What is the primary purpose of a variable in Java?",
        "code_snippet": "int explorerScore = 150;",
        "options": [
            "To store data in memory that can be read or modified",
            "To permanently delete files from your system",
            "To execute code only when the computer restarts",
            "To connect to an internet router"
        ],
        "correct_answer": "To store data in memory that can be read or modified",
        "explanation": "A variable is a named storage container in memory holding a value of a specific type.",
        "prerequisites": [],
        "estimated_time_seconds": 25,
        "hint": "Think of a variable as a labeled storage box that holds a piece of information."
    },
    {
        "id": "sf_dt_02",
        "topic": "Java & Programming",
        "skill": "Fundamentals",
        "subskill": "Data Types",
        "difficulty": 1,
        "type": "mcq",
        "prompt": "Which primitive data type is used in Java to store true or false states?",
        "code_snippet": "_____ isShieldActive = true;",
        "options": ["boolean", "int", "String", "double"],
        "correct_answer": "boolean",
        "explanation": "The 'boolean' primitive data type represents one bit of information: either true or false.",
        "prerequisites": [],
        "estimated_time_seconds": 20,
        "hint": "It is named after mathematician George Boole."
    },
    {
        "id": "sf_loop_03",
        "topic": "Java & Programming",
        "skill": "Fundamentals",
        "subskill": "Control Flow",
        "difficulty": 2,
        "type": "code_prediction",
        "prompt": "How many times will this loop print the word 'Launch'?",
        "code_snippet": "for (int i = 0; i < 3; i++) {\n    System.out.println(\"Launch\");\n}",
        "options": ["3 times", "2 times", "4 times", "Infinite loop"],
        "correct_answer": "3 times",
        "explanation": "The loop variable i takes values 0, 1, and 2 (stopping when i = 3), executing exactly 3 times.",
        "prerequisites": ["Variables & Types"],
        "estimated_time_seconds": 30,
        "hint": "Count the iterations: i=0, i=1, i=2."
    },

    # --- METHODS ---
    {
        "id": "sf_meth_01",
        "topic": "Java & Programming",
        "skill": "Methods",
        "subskill": "Method Signatures",
        "difficulty": 2,
        "type": "mcq",
        "prompt": "What does the keyword 'void' indicate in a Java method declaration?",
        "code_snippet": "public void logDiscovery(String message) { ... }",
        "options": [
            "The method does not return any value",
            "The method cannot accept any input parameters",
            "The method is completely empty and will not run",
            "The method can only be executed once"
        ],
        "correct_answer": "The method does not return any value",
        "explanation": "'void' as a return type specifies that the method performs an action without sending a result value back to the caller.",
        "prerequisites": ["Fundamentals"],
        "estimated_time_seconds": 25,
        "hint": "Think about what value the method sends back to whoever called it."
    },

    # --- OOP BASICS (CLASSES & OBJECTS) ---
    {
        "id": "sf_oop_01",
        "topic": "Java & Programming",
        "skill": "OOP Basics",
        "subskill": "Classes vs Objects",
        "difficulty": 2,
        "type": "concept_identification",
        "prompt": "What is the key difference between a Class and an Object in Java?",
        "code_snippet": "Spaceship rover1 = new Spaceship();",
        "options": [
            "A Class is the blueprint/template, while an Object is a concrete instance of that class",
            "An Object is the blueprint, while a Class is the instance created in memory",
            "There is no difference; Class and Object are identical terms in Java",
            "A Class holds only numbers, while an Object holds only text"
        ],
        "correct_answer": "A Class is the blueprint/template, while an Object is a concrete instance of that class",
        "explanation": "A class defines properties and behaviors (the blueprint), and 'new' creates a distinct object instance.",
        "prerequisites": ["Fundamentals", "Methods"],
        "estimated_time_seconds": 30,
        "hint": "Think of architectural blueprints versus the actual house built from them."
    },
    {
        "id": "sf_oop_02",
        "topic": "Java & Programming",
        "skill": "OOP Basics",
        "subskill": "Object State & Methods",
        "difficulty": 3,
        "type": "code_prediction",
        "prompt": "What is the output of the following program?",
        "code_snippet": "class Robot {\n    int battery = 50;\n    void recharge() { battery += 20; }\n}\n// main:\nRobot botA = new Robot();\nRobot botB = new Robot();\nbotA.recharge();\nSystem.out.println(botB.battery);",
        "options": ["50", "70", "20", "0"],
        "correct_answer": "50",
        "explanation": "botA and botB are two independent object instances in memory. Recharging botA has no effect on botB's battery.",
        "prerequisites": ["Classes vs Objects"],
        "estimated_time_seconds": 35,
        "hint": "Each object created with 'new' has its own separate instance variables."
    },

    # --- INHERITANCE ---
    {
        "id": "sf_inh_01",
        "topic": "Java & Programming",
        "skill": "Inheritance",
        "subskill": "Class Extension",
        "difficulty": 3,
        "type": "mcq",
        "prompt": "Which Java keyword allows a subclass to inherit methods and properties from a superclass?",
        "code_snippet": "public class Starship ______ Spacecraft { ... }",
        "options": ["extends", "implements", "inherits", "super"],
        "correct_answer": "extends",
        "explanation": "In Java, class inheritance is declared using the 'extends' keyword.",
        "prerequisites": ["OOP Basics"],
        "estimated_time_seconds": 25,
        "hint": "It signifies extending the functionality of an existing parent class."
    },
    {
        "id": "sf_inh_02",
        "topic": "Java & Programming",
        "skill": "Inheritance",
        "subskill": "Method Overriding & Super",
        "difficulty": 4,
        "type": "code_prediction",
        "prompt": "What will this program print to the console?",
        "code_snippet": "class Sensor {\n    void scan() { System.out.print(\"BaseScan \"); }\n}\nclass Radar extends Sensor {\n    void scan() {\n        super.scan();\n        System.out.print(\"DeepRadar\");\n    }\n}\n// main:\nnew Radar().scan();",
        "options": [
            "BaseScan DeepRadar",
            "DeepRadar",
            "BaseScan",
            "Compilation error: cannot call super.scan()"
        ],
        "correct_answer": "BaseScan DeepRadar",
        "explanation": "super.scan() calls the parent class method ('BaseScan '), then the subclass prints 'DeepRadar'.",
        "prerequisites": ["Class Extension"],
        "estimated_time_seconds": 40,
        "hint": "Trace super.scan() first, followed by the remainder of the overriding method."
    },

    # --- POLYMORPHISM ---
    {
        "id": "sf_poly_01",
        "topic": "Java & Programming",
        "skill": "Polymorphism",
        "subskill": "Dynamic Method Dispatch",
        "difficulty": 4,
        "type": "code_prediction",
        "prompt": "What will be printed when the following code executes?",
        "code_snippet": "class Vehicle {\n    void drive() { System.out.println(\"Standard\"); }\n}\nclass Hovercraft extends Vehicle {\n    void drive() { System.out.println(\"Floating\"); }\n}\n// main:\nVehicle v = new Hovercraft();\nv.drive();",
        "options": [
            "Floating",
            "Standard",
            "Compilation error: type mismatch",
            "Standard Floating"
        ],
        "correct_answer": "Floating",
        "explanation": "In Java, method calls on objects are resolved at runtime based on the actual object type (Hovercraft), known as dynamic polymorphism.",
        "prerequisites": ["Inheritance"],
        "estimated_time_seconds": 40,
        "hint": "Java determines which overridden method to call based on the actual runtime object, not the reference variable type."
    },
    {
        "id": "sf_poly_02",
        "topic": "Java & Programming",
        "skill": "Polymorphism",
        "subskill": "Overloading vs Overriding",
        "difficulty": 5,
        "type": "concept_identification",
        "prompt": "Which statement accurately describes Method Overriding vs Method Overloading in Java?",
        "code_snippet": None,
        "options": [
            "Overriding redefines an inherited parent method with the exact same signature; Overloading defines methods with the same name but different parameter lists",
            "Overloading requires an 'extends' keyword; Overriding requires an 'interface' keyword",
            "Overriding happens strictly at compile time; Overloading happens strictly at runtime",
            "Overloading and Overriding are identical and can be used interchangeably"
        ],
        "correct_answer": "Overriding redefines an inherited parent method with the exact same signature; Overloading defines methods with the same name but different parameter lists",
        "explanation": "Overloading is compile-time polymorphism (same name, different arguments in the same class). Overriding is runtime polymorphism (subclass replaces parent method with identical signature).",
        "prerequisites": ["Dynamic Method Dispatch"],
        "estimated_time_seconds": 45,
        "hint": "Check parameter lists: one changes parameters, the other keeps the exact same signature."
    },

    # --- COLLECTIONS ---
    {
        "id": "sf_coll_01",
        "topic": "Java & Programming",
        "skill": "Collections",
        "subskill": "Lists vs Arrays",
        "difficulty": 4,
        "type": "mcq",
        "prompt": "What is the primary advantage of using an ArrayList<T> over a standard fixed-size array in Java?",
        "code_snippet": "List<String> planets = new ArrayList<>();",
        "options": [
            "An ArrayList resizes dynamically as elements are added or removed",
            "An ArrayList can store primitive types without wrapper classes",
            "An ArrayList executes 100x faster than memory arrays",
            "An ArrayList prevents any element from ever being duplicated"
        ],
        "correct_answer": "An ArrayList resizes dynamically as elements are added or removed",
        "explanation": "Standard Java arrays have a fixed capacity defined at creation; ArrayList automatically grows and shrinks its internal capacity.",
        "prerequisites": ["OOP Basics"],
        "estimated_time_seconds": 30,
        "hint": "Think about what happens when you don't know ahead of time how many items you will need to store."
    },
    {
        "id": "sf_coll_02",
        "topic": "Java & Programming",
        "skill": "Collections",
        "subskill": "Maps & Key-Value Lookup",
        "difficulty": 4,
        "type": "mcq",
        "prompt": "Which Java Collection interface is specifically designed for fast O(1) key-value lookup?",
        "code_snippet": "Map<String, Integer> inventory = new HashMap<>();",
        "options": ["Map", "List", "Queue", "Stack"],
        "correct_answer": "Map",
        "explanation": "The Map interface (such as HashMap) maps unique keys to values for efficient average O(1) retrieval.",
        "prerequisites": ["OOP Basics"],
        "estimated_time_seconds": 25,
        "hint": "You provide a unique key to retrieve its associated value."
    }
]

class KnowledgeEstimator:
    """
    Modular Knowledge Estimator & Adaptive Question Selection Service.
    Answers: 'With only a few interactions, what can we reasonably infer about this learner?'
    Maintains mastery (0.0-1.0) and evidence confidence (None/Low/Medium/High).
    Strictly keeps unassessed skills marked NOT_ASSESSED.
    """

    def __init__(self):
        self.question_map = {q["id"]: q for q in QUESTION_BANK}

    def get_initial_question(self) -> Dict[str, Any]:
        """
        Returns a friendly entry-level question (Difficulty 2: OOP Basics or Fundamentals).
        """
        return self.question_map["sf_oop_01"]

    def select_next_question(
        self,
        history: List[Dict[str, Any]],
        asked_ids: List[str],
        max_questions: int = 4
    ) -> Optional[Dict[str, Any]]:
        """
        Selects the next adaptive question based on learner history.
        - Stops if max_questions reached.
        - Correct & fast -> increase difficulty / advance skill chain.
        - Incorrect -> drop difficulty or test prerequisite skill.
        """
        if len(history) >= max_questions:
            return None

        last_resp = history[-1]
        last_q = self.question_map.get(last_resp.get("question_id"))
        if not last_q:
            # Fallback to next unasked question
            for q in QUESTION_BANK:
                if q["id"] not in asked_ids:
                    return q
            return None

        last_correct = bool(last_resp.get("is_correct"))
        last_time = float(last_resp.get("response_time_seconds") or 10.0)
        expected_time = float(last_q.get("estimated_time_seconds") or 30.0)
        last_diff = int(last_q.get("difficulty") or 2)
        last_skill = last_q.get("skill")

        candidates: List[Dict[str, Any]] = []

        if last_correct:
            # Check speed: fast correct vs slow correct
            is_fast = last_time < (expected_time * 0.75)
            target_diff = min(5, last_diff + (1 if is_fast else 1))

            # Look for advanced skills along the prerequisite chain
            # e.g., Fundamentals -> OOP Basics -> Inheritance -> Polymorphism -> Collections
            skill_order = ["Fundamentals", "Methods", "OOP Basics", "Inheritance", "Polymorphism", "Collections"]
            current_idx = skill_order.index(last_skill) if last_skill in skill_order else 0
            
            # Prefer higher difficulty or next skill
            next_skills = skill_order[current_idx + 1:] if current_idx + 1 < len(skill_order) else [last_skill]
            
            for s in next_skills:
                for q in QUESTION_BANK:
                    if q["id"] not in asked_ids and q["skill"] == s and q["difficulty"] >= target_diff:
                        candidates.append(q)

            # Fallback to any higher difficulty unasked question
            if not candidates:
                for q in QUESTION_BANK:
                    if q["id"] not in asked_ids and q["difficulty"] >= target_diff:
                        candidates.append(q)

        else:
            # Incorrect answer: check prerequisites or reduce difficulty
            prereqs = SKILL_PREREQUISITES.get(last_skill, [])
            target_diff = max(1, last_diff - 1)

            # First look for an unasked question in prerequisites
            for p in prereqs:
                for q in QUESTION_BANK:
                    if q["id"] not in asked_ids and q["skill"] == p:
                        candidates.append(q)

            # Next look for an easier question in the same or lower skill
            if not candidates:
                for q in QUESTION_BANK:
                    if q["id"] not in asked_ids and q["difficulty"] <= target_diff:
                        candidates.append(q)

        # Fallback to any remaining unasked question
        if not candidates:
            for q in QUESTION_BANK:
                if q["id"] not in asked_ids:
                    candidates.append(q)

        return candidates[0] if candidates else None

    def compute_skill_profile(
        self,
        learner_id: str,
        responses: List[Dict[str, Any]]
    ) -> LearnerSkillProfile:
        """
        Computes the learner's estimated skill profile from calibration responses.
        - Assessed skills receive computed mastery and evidence level.
        - Untested skills remain marked NOT_ASSESSED with mastery = None (never 0%).
        """
        skills_summary: Dict[str, Dict[str, Any]] = {
            s: {
                "tested": False,
                "evidence_count": 0,
                "correct_count": 0,
                "total_score_weight": 0.0,
                "total_weight": 0.0,
                "strengths": [],
                "gaps": [],
                "high_hesitation": False
            }
            for s in ALL_SKILLS
        }

        total_questions = len(responses)
        fast_correct_count = 0
        slow_correct_count = 0
        repeated_wrong_count = 0

        for r in responses:
            qid = r.get("question_id")
            q_meta = self.question_map.get(qid, {})
            skill = q_meta.get("skill") or r.get("skill")
            if not skill or skill not in skills_summary:
                continue

            skills_summary[skill]["tested"] = True
            skills_summary[skill]["evidence_count"] += 1

            is_correct = bool(r.get("is_correct"))
            diff = int(q_meta.get("difficulty") or 2)
            resp_time = float(r.get("response_time_seconds") or 10.0)
            expected_time = float(q_meta.get("estimated_time_seconds") or 30.0)
            hint_used = bool(r.get("hint_used", False))
            conf = float(r.get("confidence_level") or 0.6)

            # Base evidence weighting
            # Questions at higher difficulty provide more discriminative weight
            weight = 1.0 + (diff * 0.25)
            
            # Speed adjustment factor
            time_ratio = resp_time / max(1.0, expected_time)
            
            if is_correct:
                skills_summary[skill]["correct_count"] += 1
                
                # Base mastery increment
                score_contrib = 0.70 + (diff * 0.06)
                
                if time_ratio < 0.75:
                    # Fast correct: high mastery indicator
                    score_contrib = min(0.98, score_contrib + 0.12)
                    fast_correct_count += 1
                elif time_ratio > 1.4:
                    # Slow correct: partial hesitation
                    score_contrib = max(0.55, score_contrib - 0.10)
                    slow_correct_count += 1

                if hint_used:
                    score_contrib = max(0.40, score_contrib - 0.15)

                # Confidence weighting
                score_contrib = (score_contrib * 0.8) + (conf * 0.2)
                skills_summary[skill]["strengths"].append(f"Answered {q_meta.get('subskill', skill)} accurately")
            else:
                # Incorrect answer
                repeated_wrong_count += 1
                score_contrib = max(0.10, 0.40 - (0.05 * diff))
                
                if time_ratio > 1.3:
                    skills_summary[skill]["high_hesitation"] = True

                skills_summary[skill]["gaps"].append(f"Struggled with {q_meta.get('subskill', skill)}")

            skills_summary[skill]["total_score_weight"] += score_contrib * weight
            skills_summary[skill]["total_weight"] += weight

        # Construct final SkillMasteryItem dictionary
        final_skills: Dict[str, SkillMasteryItem] = {}
        assessed_strong_skills: List[str] = []
        identified_gap_skills: List[str] = []
        unassessed_skills: List[str] = []

        for skill in ALL_SKILLS:
            data = skills_summary[skill]
            if not data["tested"]:
                final_skills[skill] = SkillMasteryItem(
                    skill_name=skill,
                    status="NOT_ASSESSED",
                    mastery_score=None,
                    mastery_level="Not Yet Assessed",
                    evidence_level="None",
                    evidence_count=0,
                    strengths=[],
                    gaps=[]
                )
                unassessed_skills.append(skill)
            else:
                avg_mastery = data["total_score_weight"] / max(0.001, data["total_weight"])
                # Round to 2 decimals, avoid fake micro-precision
                final_score = round(max(0.10, min(0.98, avg_mastery)), 2)

                # Map to mastery state
                if final_score >= 0.80:
                    level = "Strong"
                    assessed_strong_skills.append(skill)
                elif final_score >= 0.60:
                    level = "Proficient"
                    assessed_strong_skills.append(skill)
                elif final_score >= 0.35:
                    level = "Developing"
                    identified_gap_skills.append(skill)
                else:
                    level = "Needs Practice"
                    identified_gap_skills.append(skill)

                # Evidence level based on observations count and speed
                count = data["evidence_count"]
                if count >= 2:
                    evidence = "High"
                elif count == 1:
                    evidence = "Medium"
                else:
                    evidence = "Low"

                final_skills[skill] = SkillMasteryItem(
                    skill_name=skill,
                    status="ASSESSED",
                    mastery_score=final_score,
                    mastery_level=level,
                    evidence_level=evidence,
                    evidence_count=count,
                    strengths=data["strengths"],
                    gaps=data["gaps"]
                )

        # Generate explainable insights
        discovered_insights: List[str] = []
        if assessed_strong_skills:
            discovered_insights.append(
                f"You already demonstrate solid understanding in {', '.join(assessed_strong_skills)}."
            )
        if identified_gap_skills:
            discovered_insights.append(
                f"Your primary opportunity to strengthen right now is {identified_gap_skills[0]}."
            )
        if unassessed_skills:
            discovered_insights.append(
                f"{', '.join(unassessed_skills[:2])} haven't been assessed yet and are ready for exploration."
            )

        # Determine Recommended Starting Point
        rec_skill = "Fundamentals"
        rec_title = "Java Foundations & Variables"
        rec_why: List[str] = []

        if identified_gap_skills:
            rec_skill = identified_gap_skills[0]
            if rec_skill == "Inheritance":
                rec_title = "Inheritance Fundamentals & Reusable Architecture"
                rec_why = [
                    "You understand classes and objects",
                    "Inheritance is a prerequisite for upcoming skills like Polymorphism",
                    "Your calibration suggests strengthening subclass relationships"
                ]
            elif rec_skill == "OOP Basics":
                rec_title = "Classes, Objects & Blueprints"
                rec_why = [
                    "You grasp basic programming logic and loops",
                    "Classes and Objects are the foundation of Object-Oriented Programming",
                    "Focusing here unlocks all advanced architecture quests"
                ]
            else:
                rec_title = f"{rec_skill} Mastery Quest"
                rec_why = [
                    f"Calibration identified key growth areas in {rec_skill}",
                    "Mastering this builds confidence for more advanced projects",
                    "Includes interactive visual scaffolds and micro-challenges"
                ]
        elif assessed_strong_skills and "Inheritance" in assessed_strong_skills:
            rec_skill = "Polymorphism"
            rec_title = "Polymorphism & Dynamic Dispatch Masterclass"
            rec_why = [
                "You demonstrated strong proficiency across Fundamentals and Inheritance",
                "Ready to advance to runtime method dispatch and architecture patterns",
                "Skip repetitive beginner drills and dive directly into challenges"
            ]
        elif assessed_strong_skills:
            rec_skill = "Inheritance"
            rec_title = "Inheritance Fundamentals & Subclass Quests"
            rec_why = [
                "Solid foundation demonstrated in OOP basics",
                "Inheritance is your natural next milestone",
                "Fast-track your path toward advanced software architecture"
            ]
        else:
            rec_skill = "Fundamentals"
            rec_title = "Beginner Foundations: Code & Logic Exploration"
            rec_why = [
                "Gentle step-by-step introduction to programming variables and logic",
                "Untimed, visual interactive quest with instant gentle feedback",
                "Builds strong core knowledge before moving to complex concepts"
            ]

        recommended_starting_point = RecommendedStartingPoint(
            quest_title=rec_title,
            skill=rec_skill,
            difficulty=2 if not assessed_strong_skills else 3,
            why=rec_why,
            quest_action_url="/session"
        )

        return LearnerSkillProfile(
            learner_id=learner_id,
            calibrated_at=datetime.utcnow(),
            total_questions_answered=total_questions,
            skills=final_skills,
            discovered_insights=discovered_insights,
            recommended_starting_point=recommended_starting_point
        )

# Singleton instance
knowledge_estimator = KnowledgeEstimator()
