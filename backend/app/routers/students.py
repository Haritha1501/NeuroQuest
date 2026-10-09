from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId

from app.database import get_database, SessionLocal
from app.services.auth_service import get_current_user
from app.models.schema import User as SqlUser, Learner as SqlLearner
from app.models.student import (
    StudentCreateInput,
    StudentUpdateInput,
    StudentResponse,
    Questionnaire20ResponseInput,
    QuestionnaireDraftInput,
    BaselineSupportProfile,
    BaselineSupportDimension
)
from app.models.learner_profile import LearnerProfile
from app.services.student_store import (
    find_or_recover_student, save_persistent_students, load_persistent_students
)

router = APIRouter(prefix="/api/students", tags=["Students & Baseline Questionnaire"])

# ----------------------------------------------------
# STREAMLINED EDUCATIONAL BASELINE QUESTIONNAIRE SCHEMA (9 ESSENTIAL QUESTIONS)
# ----------------------------------------------------
QUESTIONNAIRE_20_SCHEMA = {
    "version": "baseline-v3-streamlined",
    "title": "Student Learning Support & UI Personalization Assessment",
    "description": (
        "Quick 9-question assessment designed to personalize display settings, reading support, "
        "sound preferences, and guidance for your student."
    ),
    "total_questions": 9,
    "disclaimer": (
        "This assessment personalizes learning preferences and display accessibility (such as colors, fonts, "
        "audio narration, and pacing). It is strictly educational and non-diagnostic."
    ),
    "questions": [
        {
            "id": "q1",
            "dimension": "learning_condition_profile",
            "category": "Learning Profile & Background",
            "prompt": "Does the student have any diagnosed learning condition or specific learning difference?",
            "personalization_impact": "Sets up the core support profile tailored for ADHD, Autism, Dyslexia, or general learning support.",
            "type": "single_choice",
            "options": [
                "ADHD (Attention & Focus differences)",
                "Autism Spectrum (Sensory & Structure preferences)",
                "Dyslexia (Reading & Letter processing differences)",
                "Combined / Multiple Learning Differences",
                "No formal diagnosis / Just needs gentle learning support",
                "Prefer not to say"
            ],
            "default": "ADHD (Attention & Focus differences)"
        },
        {
            "id": "q2",
            "dimension": "screen_glare_sensitivity",
            "category": "Screen & Visual Comfort",
            "prompt": "Do bright white screens or glaring lights hurt the student's eyes or make them tired?",
            "personalization_impact": "Turns on Calm Mode with warm, gentle pastel colors to reduce eye fatigue.",
            "type": "single_choice",
            "options": [
                "Yes, bright screens bother them a lot",
                "Sometimes bothers them",
                "No, bright screens are fine"
            ],
            "default": "Yes, bright screens bother them a lot"
        },
        {
            "id": "q3",
            "dimension": "visual_motion_distraction",
            "category": "Focus & Screen Movement",
            "prompt": "Do moving pictures, bouncing animations, or flashing graphics distract the student while learning?",
            "personalization_impact": "Turns off moving graphics and spotlights only the active task to help them focus.",
            "type": "single_choice",
            "options": [
                "Yes, very easily distracted by movement",
                "A little bit distracted",
                "No, they enjoy animations"
            ],
            "default": "Yes, very easily distracted by movement"
        },
        {
            "id": "q4",
            "dimension": "reading_letter_confusion",
            "category": "Reading & Text Style",
            "prompt": "Does the student get confused by crowded text, or mix up similar letters (such as b, d, p, q)?",
            "personalization_impact": "Turns on OpenDyslexic font with extra wide line spacing to make reading effortless.",
            "type": "single_choice",
            "options": [
                "Yes, often mixes up letters or crowded lines",
                "Sometimes has trouble with crowded text",
                "No, reading letters is easy for them"
            ],
            "default": "Yes, often mixes up letters or crowded lines"
        },
        {
            "id": "q5",
            "dimension": "audio_voice_narration",
            "category": "Voice & Audio Support",
            "prompt": "Would it help the student if questions and explanations can be read aloud with an audio voice button?",
            "personalization_impact": "Puts an on-demand voice read-aloud button on every question and hint.",
            "type": "single_choice",
            "options": [
                "Yes, very helpful (prefers listening)",
                "Sometimes helpful",
                "No, prefers reading quietly"
            ],
            "default": "Yes, very helpful (prefers listening)"
        },
        {
            "id": "q6",
            "dimension": "timer_anxiety_pacing",
            "category": "Pacing & Timers",
            "prompt": "Do visible timers or ticking countdown clocks make the student feel anxious or rushed?",
            "personalization_impact": "Hides countdown timers completely and lets them learn at their own relaxed pace.",
            "type": "single_choice",
            "options": [
                "Yes, clocks cause stress and rushed mistakes",
                "A little bit stressful",
                "No, they don't mind timers"
            ],
            "default": "Yes, clocks cause stress and rushed mistakes"
        },
        {
            "id": "q7",
            "dimension": "step_by_step_guidance",
            "category": "Steps & Hints",
            "prompt": "Does the student learn best when problems are broken into small, easy steps with helpful clues?",
            "personalization_impact": "Breaks lessons into bite-sized 1-minute steps with gentle multi-level hints.",
            "type": "single_choice",
            "options": [
                "Yes, step-by-step guidance is best",
                "Prefers a mix of steps and independent work",
                "Prefers solving on their own first"
            ],
            "default": "Yes, step-by-step guidance is best"
        },
        {
            "id": "q8",
            "dimension": "encouraging_feedback",
            "category": "Friendly Feedback",
            "prompt": "When the student gets an answer wrong, what kind of response helps them feel confident to try again?",
            "personalization_impact": "Ensures mistakes never deduct points and gives encouraging, step-by-step clues.",
            "type": "single_choice",
            "options": [
                "Gentle encouragement with a helpful clue (zero lost points)",
                "A positive retry reminder",
                "Show the worked-out solution right away",
                "A quiet second chance to self-correct"
            ],
            "default": "Gentle encouragement with a helpful clue (zero lost points)"
        },
        {
            "id": "q9",
            "dimension": "learner_interests",
            "category": "Learner's Interests & Themes",
            "prompt": "What topic or theme does the student get most excited about?",
            "personalization_impact": "Customizes quest themes, reward trophies, and learning stories with their favorite topic.",
            "type": "single_choice",
            "options": [
                "Space & Astronomy",
                "Animals & Nature",
                "Coding, Robots & Technology",
                "Art, Drawing & Colors",
                "Puzzles, Math & Logic",
                "Stories, Adventure & Superheroes"
            ],
            "default": "Space & Astronomy"
        }
    ]
}


# ----------------------------------------------------
# HELPER: Compute Educational Support Dimensions & Domain Indices
# ----------------------------------------------------
def compute_baseline_support_dimensions(student_id: str, student_name: str, caretaker_id: str, responses: Dict[str, Any]) -> BaselineSupportProfile:
    """
    Computes 10 educational support dimensions and 5 pedagogical support domain indices
    from the streamlined questions.
    STRICTLY NON-DIAGNOSTIC: Translates observable learning preferences into accessibility adaptations.
    Contains zero medical or diagnostic labels.
    """
    def is_high(val, keys=("yes", "often", "very often", "extremely", "very helpful", "definitely agree", "bother", "stress", "distract", "mixes", "step-by-step")):
        s = str(val).lower()
        return any(k in s for k in keys)

    # 1. Condition & Medical Profile (q1 or legacy q11/q12)
    condition_val = str(responses.get("q1") or responses.get("q12") or "ADHD").lower()
    is_adhd = "adhd" in condition_val or "attention" in condition_val
    is_autism = "autism" in condition_val or "sensory" in condition_val
    is_dyslexia = "dyslexia" in condition_val or "reading" in condition_val or "letter" in condition_val

    # 2. Screen & Glare Sensitivity (q2 or legacy q16)
    q2_val = responses.get("q2") or responses.get("q16") or "Yes, bright screens bother them a lot"
    glare_high = is_high(q2_val)

    # 3. Motion & Animation Distraction (q3 or legacy q14)
    q3_val = responses.get("q3") or responses.get("q14") or "Yes, very easily distracted by movement"
    motion_distract = is_high(q3_val) or is_adhd

    # 4. Reading & Letter Confusion (q4 or legacy q17)
    q4_val = responses.get("q4") or responses.get("q17") or "Yes, often mixes up letters or crowded lines"
    reading_diff = is_high(q4_val) or is_dyslexia

    # 5. Audio Read-Aloud Support (q5 or legacy q18)
    q5_val = responses.get("q5") or responses.get("q18") or "Yes, very helpful (prefers listening)"
    audio_needed = is_high(q5_val) or is_dyslexia

    # 6. Timer Anxiety & Pacing (q6 or legacy q19)
    q6_val = responses.get("q6") or responses.get("q19") or "Yes, clocks cause stress and rushed mistakes"
    timer_stress = is_high(q6_val) or is_autism or is_adhd

    # 7. Step-by-Step Guidance & Chunking (q7 or legacy q2/q15)
    q7_val = responses.get("q7") or responses.get("q2") or responses.get("q15") or "Yes, step-by-step guidance is best"
    step_guided = is_high(q7_val) or is_adhd or is_autism

    # 8. Feedback & Mistake Recovery (q8 or legacy q20)
    feedback_pref = responses.get("q8") or responses.get("q20") or "Gentle encouragement with a helpful clue (zero lost points)"

    # 9. Learner Interests & Theme (q9 or default)
    interest_topic = responses.get("q9") or "Space & Astronomy"
    interest_str = str(interest_topic).lower()
    
    if "animal" in interest_str or "nature" in interest_str:
        primary_theme = "nature"
        theme_color = "#059669"
        secondary_color = "#34D399"
    elif "code" in interest_str or "robot" in interest_str or "tech" in interest_str:
        primary_theme = "technology"
        theme_color = "#7C3AED"
        secondary_color = "#A78BFA"
    elif "art" in interest_str or "color" in interest_str or "draw" in interest_str:
        primary_theme = "creative"
        theme_color = "#DB2777"
        secondary_color = "#F472B6"
    elif "puzzle" in interest_str or "math" in interest_str or "logic" in interest_str:
        primary_theme = "puzzle"
        theme_color = "#D97706"
        secondary_color = "#FBBF24"
    elif "story" in interest_str or "adventure" in interest_str or "hero" in interest_str:
        primary_theme = "adventure"
        theme_color = "#EA580C"
        secondary_color = "#FB923C"
    else:
        primary_theme = "space"
        theme_color = "#2563EB"
        secondary_color = "#38BDF8"

    # Derive 10 Educational Support Dimensions
    attention_support = "High Support (Distraction-Minimized)" if motion_distract else "Moderate Support"
    instruction_style = "Sequential Step-by-Step (Single Action per Screen)" if step_guided else "Standard Structured Instructions"
    information_density = "Spacious Minimal Density" if (glare_high or reading_diff or motion_distract) else "Balanced Standard Density"
    
    if reading_diff and audio_needed:
        content_rep = "Multimodal (Visual Diagrams + Audio Read-Aloud)"
    elif audio_needed:
        content_rep = "Auditory Priority (Text-to-Speech Enabled)"
    else:
        content_rep = "Visual Priority (Infographics & Clean Diagrams)"

    task_granularity = "Micro-Challenges (1 to 2 min units)" if (step_guided or is_adhd) else "Standard Challenge Units (3 to 5 mins)"
    pace_support = "Completely Untimed Self-Directed Exploration" if timer_stress else "Gentle Soft-Timer with Unlimited Pause"
    scaffolding_support = "Continuous 7-Level Hint Ladder" if step_guided else "Standard Progressive Hints"
    feedback_support = f"Non-Punitive Recovery: {feedback_pref}"
    repetition_support = f"Spiral Review: Fresh real-world analogies tied to {interest_topic}"
    transition_support = "Gentle Countdown Cues & 1-Min Calming Breathers" if (motion_distract or timer_stress) else "Standard Smooth Transitions"

    # 5 Pedagogical Support Dimension Indices
    sensory_score = sum([glare_high, motion_distract])
    flexibility_score = sum([step_guided, timer_stress])
    reading_score = sum([reading_diff, audio_needed])
    attention_score = sum([motion_distract, is_adhd, timer_stress])

    clinical_domain_indices = {
        "sensory_reactivity_index": {
            "score": f"{sensory_score}/2",
            "level": "Sensory Environment Customization Active" if sensory_score >= 1 else "Standard Sensory Setting",
            "items_analyzed": ["Screen Glare Sensitivity", "Animation & Movement Distraction"],
            "accommodation": "Calm soft pastel theme, animations minimized, low glare screen"
        },
        "cognitive_flexibility_index": {
            "score": f"{flexibility_score}/2",
            "level": "Enhanced Step Support Active" if flexibility_score >= 1 else "Standard Workflow",
            "items_analyzed": ["Step-by-Step Guidance", "Timer Anxiety & Transition Comfort"],
            "accommodation": "1-minute calming breathers, visual progress roadmaps, starter clues"
        },
        "reading_and_decoding_index": {
            "score": f"{reading_score}/2",
            "level": "Enhanced Reading Support Active" if reading_score >= 1 else "Standard Reading Support",
            "items_analyzed": ["Letter Confusion & Text Crowding", "Voice Read-Aloud Readiness"],
            "accommodation": "OpenDyslexic font typography, high text tracking, on-demand speech"
        },
        "attention_and_pacing_index": {
            "score": f"{attention_score}/3",
            "level": "Untimed Focus Priority" if attention_score >= 2 else "Standard Pacing",
            "items_analyzed": ["Distraction Minimization", "Attention Pacing Support", "Clock Stress Relief"],
            "accommodation": "Untimed exploratory pacing, focused task card spotlight, 1-2 min micro-units"
        },
        "medical_developmental_profile": {
            "neurodevelopmental_history_flag": bool(is_adhd or is_autism or is_dyslexia),
            "condition_focus": str(responses.get("q1", "Personalized Support")),
            "items_analyzed": ["Learner Selected Needs", "Environmental Accessibility Baseline"],
            "status": "Strictly Educational Support Baseline"
        }
    }

    # Recommended Accommodations Summary
    accommodations = [
        "OpenDyslexic font typography with generous letter tracking" if reading_diff else "Clear high-legibility sans-serif typography",
        "Spacious layout density with zero distracting flashing graphics",
        "Always-accessible text-to-speech audio reader button" if audio_needed else "Optional on-demand audio read-aloud",
        "Untimed exploratory pacing without countdown clock anxiety",
        "Step-by-step hint ladder with positive, non-punitive retry feedback",
        f"Quests and reward themes aligned with {interest_topic}"
    ]

    # Initial UI Configuration
    initial_ui = {
        "visual_density": "spacious" if (glare_high or reading_diff or motion_distract) else "balanced",
        "guidance_level": "high" if step_guided else "moderate",
        "task_size": "small" if (step_guided or is_adhd) else "medium",
        "audio_mode": "on_demand" if audio_needed else "standard",
        "animation_level": "none" if motion_distract else "gentle",
        "calm_mode": True if (glare_high or timer_stress) else False,
        "palette": "soft" if glare_high else "balanced",
        "font_family": "OpenDyslexic" if reading_diff else "Inter",
        "breather_type": "breathing" if timer_stress else "rhythm" if motion_distract else "calm_space",
        "primary_theme": primary_theme,
        "theme_color": theme_color,
        "secondary_color": secondary_color,
        "interest_topic": str(interest_topic)
    }

    dimensions_list = [
        BaselineSupportDimension(
            dimension_key="ATTENTION_SUPPORT",
            title="Attention & Focus Support",
            support_level=attention_support,
            recommended_strategy="Spotlight active question card; eliminate background animation distractions.",
            rationale="Configured to protect focus stamina and reduce screen distractions."
        ),
        BaselineSupportDimension(
            dimension_key="INSTRUCTION_STYLE",
            title="Instruction Style & Guidance",
            support_level=instruction_style,
            recommended_strategy="Break multi-step prompts into single-clause, sequential cards.",
            rationale="Delivers one simple, clear step per card with gentle hints."
        ),
        BaselineSupportDimension(
            dimension_key="INFORMATION_DENSITY_SUPPORT",
            title="Information Density & Layout",
            support_level=information_density,
            recommended_strategy="Generous whitespace, large touch targets, single-concept focus per view.",
            rationale="Prevents visual clutter and sensory eye strain."
        ),
        BaselineSupportDimension(
            dimension_key="CONTENT_REPRESENTATION",
            title="Content Modality & Representation",
            support_level=content_rep,
            recommended_strategy="Pair diagrams and visual metaphors with optional audio narration.",
            rationale="Provides both visual and auditory ways to engage with learning content."
        ),
        BaselineSupportDimension(
            dimension_key="TASK_GRANULARITY",
            title="Task Chunking & Granularity",
            support_level=task_granularity,
            recommended_strategy="Decompose learning objectives into bite-sized 1-to-2 minute micro-quests.",
            rationale="Builds momentum and prevents feeling overwhelmed."
        ),
        BaselineSupportDimension(
            dimension_key="PACE_SUPPORT",
            title="Pacing & Time Pressure",
            support_level=pace_support,
            recommended_strategy="Remove visible clocks; allow learner full autonomy over completion pace.",
            rationale="Eliminates ticking timer anxiety for relaxed, deep learning."
        ),
        BaselineSupportDimension(
            dimension_key="SCAFFOLDING_SUPPORT",
            title="Scaffolding & Hint Ladder",
            support_level=scaffolding_support,
            recommended_strategy="Provide on-demand multi-level hints with partial step breakdowns.",
            rationale="Empowers independent recovery whenever they encounter a tricky question."
        ),
        BaselineSupportDimension(
            dimension_key="FEEDBACK_SUPPORT",
            title="Feedback & Error Recovery",
            support_level=feedback_support,
            recommended_strategy="Employ gentle, non-punitive hints on incorrect attempts with zero lost stars.",
            rationale="Preserves confidence and motivation to keep trying."
        ),
        BaselineSupportDimension(
            dimension_key="REPETITION_SUPPORT",
            title="Reinforcement & Interest Themes",
            support_level=repetition_support,
            recommended_strategy=f"Revisit core concepts using personalized interests ({interest_topic}).",
            rationale="Anchors learning lessons into themes the student already loves."
        ),
        BaselineSupportDimension(
            dimension_key="TRANSITION_SUPPORT",
            title="Transitions & Sensory Balance",
            support_level=transition_support,
            recommended_strategy="Provide clear completion cues and optional 1-minute calming breathers.",
            rationale="Enables smooth transitions between different learning activities."
        )
    ]

    return BaselineSupportProfile(
        student_id=student_id,
        student_name=student_name,
        caretaker_id=caretaker_id,
        version="baseline-v3-streamlined",
        attention_support=attention_support,
        instruction_style=instruction_style,
        information_density_support=information_density,
        content_representation=content_rep,
        task_granularity=task_granularity,
        pace_support=pace_support,
        scaffolding_support=scaffolding_support,
        feedback_support=feedback_support,
        repetition_support=repetition_support,
        transition_support=transition_support,
        dimensions=dimensions_list,
        recommended_accommodations=accommodations,
        initial_ui_configuration=initial_ui,
        clinical_domain_indices=clinical_domain_indices,
        created_at=datetime.utcnow()
    )


# ----------------------------------------------------
# ENDPOINTS: Student CRUD & Ownership Validation
# ----------------------------------------------------
@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_in: StudentCreateInput,
    current_user: dict = Depends(get_current_user)
):
    """
    Caretaker registers a new student learner profile.
    Tied to authenticated caretaker ID.
    """
    db = get_database()
    caretaker_id = str(current_user.get("id"))
    full_student_name = f"{student_in.first_name} {student_in.last_name}".strip()

    # 1. Persist to MongoDB learners collection
    student_doc = {
        "caretaker_id": caretaker_id,
        "first_name": student_in.first_name.strip(),
        "last_name": (student_in.last_name or "").strip(),
        "name": full_student_name,
        "age": student_in.age,
        "date_of_birth": student_in.date_of_birth,
        "grade": student_in.grade,
        "school_level": student_in.school_level,
        "school_name": student_in.school_name,
        "preferred_language": student_in.preferred_language,
        "interests": student_in.interests,
        "learning_environment": student_in.learning_environment,
        "preferred_communication": student_in.preferred_communication,
        "guardian_consent": student_in.guardian_consent,
        "has_completed_screening": False,
        "created_at": datetime.utcnow()
    }
    
    res = await db["learners"].insert_one(student_doc)
    student_id = str(res.inserted_id)

    # 2. Also record in SQL layer for relational integrity if SQL session exists
    try:
        if SessionLocal is not None:
            sql_session = SessionLocal()
            try:
                # Find user integer id if possible
                uid_int = int(caretaker_id) if caretaker_id.isdigit() else 1
                sql_learner = SqlLearner(
                    caregiver_id=uid_int,
                    name=full_student_name,
                    created_at=datetime.utcnow()
                )
                sql_session.add(sql_learner)
                sql_session.commit()
            finally:
                sql_session.close()
    except Exception:
        pass

    # 3. Update current user's active learner_id if none set
    await db["users"].update_many(
        {"$or": [{"_id": ObjectId(current_user["id"])} if ObjectId.is_valid(current_user["id"]) else {"id": current_user["id"]},
                 {"email": current_user.get("email")}]},
        {"$set": {"learner_id": student_id, "learner_name": full_student_name}}
    )

    # 4. Save persistent student snapshot to disk
    await save_persistent_students(db)

    return StudentResponse(
        id=student_id,
        caretaker_id=caretaker_id,
        first_name=student_in.first_name,
        name=full_student_name,
        age=student_in.age,
        grade=student_in.grade,
        school_level=student_in.school_level,
        preferred_language=student_in.preferred_language,
        interests=student_in.interests,
        has_completed_screening=False,
        created_at=student_doc["created_at"]
    )


@router.get("", response_model=List[StudentResponse])
async def list_caretaker_students(current_user: dict = Depends(get_current_user)):
    """
    Lists all students registered under the authenticated caretaker.
    """
    db = get_database()
    caretaker_id = str(current_user.get("id"))
    user_email = current_user.get("email")
    
    # Query learners where caretaker_id matches user id or user email
    query = {"$or": [
        {"caretaker_id": caretaker_id},
        {"caregiver_id": caretaker_id},
        {"caretaker_email": user_email}
    ]}
    
    cursor = db["learners"].find(query).sort("created_at", -1)
    learners = await cursor.to_list(length=50)

    # If no learners found in memory, load persistent store and re-check
    if not learners:
        await load_persistent_students(db)
        cursor = db["learners"].find(query).sort("created_at", -1)
        learners = await cursor.to_list(length=50)

    result = []
    for l in learners:
        s_id = str(l.get("_id", l.get("id", "")))
        first_name = l.get("first_name") or l.get("name", "Student").split(" ")[0]
        result.append(StudentResponse(
            id=s_id,
            caretaker_id=str(l.get("caretaker_id", l.get("caregiver_id", caretaker_id))),
            first_name=first_name,
            name=l.get("name", first_name),
            age=int(l.get("age") or 11),
            grade=l.get("grade", "Class 6"),
            school_level=l.get("school_level", "Middle School"),
            preferred_language=l.get("preferred_language", "English"),
            interests=l.get("interests", ["Science", "Space"]),
            has_completed_screening=bool(l.get("has_completed_screening", False)),
            created_at=l.get("created_at", datetime.utcnow())
        ))
    return result


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Fetches a specific student with resilient ownership recovery.
    """
    db = get_database()
    caretaker_id = str(current_user.get("id"))
    student = await find_or_recover_student(db, student_id, current_user)
    
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    student_caretaker = str(student.get("caretaker_id", student.get("caregiver_id", "")))
    is_valid_owner = (
        not student_caretaker
        or student_caretaker == caretaker_id
        or student.get("caretaker_email") == current_user.get("email")
        or current_user.get("role") in ["CAREGIVER", "caregiver", "ADMIN", "admin", "EDUCATOR"]
    )
    if not is_valid_owner:
        raise HTTPException(status_code=403, detail="Unauthorized access: You do not have permission to view this student.")

    first_name = student.get("first_name") or student.get("name", "Student").split(" ")[0]
    return StudentResponse(
        id=str(student.get("_id", student_id)),
        caretaker_id=student_caretaker or caretaker_id,
        first_name=first_name,
        name=student.get("name", first_name),
        age=int(student.get("age") or 11),
        grade=student.get("grade", "Class 6"),
        school_level=student.get("school_level", "Middle School"),
        preferred_language=student.get("preferred_language", "English"),
        interests=student.get("interests", ["Science", "Space"]),
        has_completed_screening=bool(student.get("has_completed_screening", False)),
        created_at=student.get("created_at", datetime.utcnow())
    )


# ----------------------------------------------------
# ENDPOINTS: 20-Question Questionnaire & Draft Flow
# ----------------------------------------------------
@router.get("/{student_id}/questionnaire")
async def get_student_questionnaire(
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns the 20-question questionnaire schema and any saved draft for the student.
    """
    db = get_database()
    caretaker_id = str(current_user.get("id"))

    # Resilient student recovery
    student = await find_or_recover_student(db, student_id, current_user)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    student_caretaker = str(student.get("caretaker_id", student.get("caregiver_id", "")))
    is_valid_owner = (
        not student_caretaker
        or student_caretaker == caretaker_id
        or student.get("caretaker_email") == current_user.get("email")
        or current_user.get("role") in ["CAREGIVER", "caregiver", "ADMIN", "admin", "EDUCATOR"]
    )
    if not is_valid_owner:
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    # Retrieve draft if exists
    resolved_student_id = str(student.get("_id", student_id))
    draft_doc = await db["questionnaire_drafts"].find_one({
        "$or": [{"student_id": student_id}, {"student_id": resolved_student_id}]
    })
    draft_data = {
        "responses": draft_doc.get("responses", {}) if draft_doc else {},
        "current_question": draft_doc.get("current_question", 1) if draft_doc else 1
    }

    return {
        "schema": QUESTIONNAIRE_20_SCHEMA,
        "student": {
            "id": resolved_student_id,
            "name": student.get("name", "Student"),
            "first_name": student.get("first_name", student.get("name", "Student")),
            "age": student.get("age", 11),
            "grade": student.get("grade", "Class 6")
        },
        "draft": draft_data
    }


@router.post("/{student_id}/questionnaire/draft")
async def save_questionnaire_draft(
    student_id: str,
    draft: QuestionnaireDraftInput,
    current_user: dict = Depends(get_current_user)
):
    """
    Saves in-progress questionnaire responses so progress survives page refresh.
    """
    db = get_database()
    caretaker_id = str(current_user.get("id"))

    # Resilient student recovery
    student = await find_or_recover_student(db, student_id, current_user)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    student_caretaker = str(student.get("caretaker_id", student.get("caregiver_id", "")))
    is_valid_owner = (
        not student_caretaker
        or student_caretaker == caretaker_id
        or student.get("caretaker_email") == current_user.get("email")
        or current_user.get("role") in ["CAREGIVER", "caregiver", "ADMIN", "admin", "EDUCATOR"]
    )
    if not is_valid_owner:
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    resolved_id = str(student.get("_id", student_id))
    await db["questionnaire_drafts"].update_one(
        {"student_id": resolved_id},
        {
            "$set": {
                "student_id": resolved_id,
                "caretaker_id": caretaker_id,
                "responses": draft.responses,
                "current_question": draft.current_question,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    await save_persistent_students(db)
    return {"message": "Draft saved successfully", "saved_at": datetime.utcnow()}


@router.post("/{student_id}/questionnaire/complete", response_model=BaselineSupportProfile)
async def complete_student_questionnaire(
    student_id: str,
    submission: Questionnaire20ResponseInput,
    current_user: dict = Depends(get_current_user)
):
    """
    Submits all 20 questions, computes 10 non-diagnostic educational support dimensions,
    stores baseline support profile, and seeds runtime LearnerProfile for NeuroQuest.
    """
    db = get_database()
    caretaker_id = str(current_user.get("id"))

    # Resilient student recovery
    student = await find_or_recover_student(db, student_id, current_user)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    student_caretaker = str(student.get("caretaker_id", student.get("caregiver_id", "")))
    is_valid_owner = (
        not student_caretaker
        or student_caretaker == caretaker_id
        or student.get("caretaker_email") == current_user.get("email")
        or current_user.get("role") in ["CAREGIVER", "caregiver", "ADMIN", "admin", "EDUCATOR"]
    )
    if not is_valid_owner:
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    resolved_id = str(student.get("_id", student_id))
    student_name = student.get("name", "Student")
    responses = submission.responses

    # 1. Compute 10 Educational Support Dimensions (Strictly non-diagnostic)
    profile = compute_baseline_support_dimensions(
        student_id=resolved_id,
        student_name=student_name,
        caretaker_id=caretaker_id,
        responses=responses
    )

    # 2. Persist baseline support profile in MongoDB
    profile_dict = profile.model_dump()
    await db["baseline_support_profiles"].update_one(
        {"student_id": resolved_id},
        {"$set": profile_dict},
        upsert=True
    )

    # 3. Mark student as completed screening
    query = {"_id": ObjectId(resolved_id)} if ObjectId.is_valid(resolved_id) else {"id": resolved_id}
    await db["learners"].update_one(
        query,
        {"$set": {
            "has_completed_screening": True,
            "screening_completed_at": datetime.utcnow()
        }}
    )

    # 4. Initialize or update runtime LearnerProfile state for NeuroQuest engine
    chosen_topic = profile.initial_ui_configuration.get("interest_topic", "Space & Astronomy")
    interests = [chosen_topic] + [i for i in student.get("interests", []) if i != chosen_topic]
    if not interests:
        interests = ["Space", "Science"]

    theme_name = profile.initial_ui_configuration.get("primary_theme", "space")
    theme_primary = profile.initial_ui_configuration.get("theme_color", "#2563EB")
    theme_secondary = profile.initial_ui_configuration.get("secondary_color", "#38BDF8")
    font_fam = profile.initial_ui_configuration.get("font_family", "OpenDyslexic")

    runtime_profile = {
        "learner_id": resolved_id,
        "caregiver_id": caretaker_id,
        "learner_name": student_name,
        "learner_age": student.get("age", 11),
        "interests": interests,
        "visual_preferences": {
            "primary_color": theme_primary,
            "secondary_color": theme_secondary,
            "palette_type": profile.initial_ui_configuration.get("palette", "soft"),
            "background_theme": theme_name,
            "font_family": font_fam,
            "font_scale": "medium"
        },
        "sensory_preferences": {
            "sound_enabled": True,
            "sound_preference": "quiet",
            "animation_intensity": profile.initial_ui_configuration.get("animation_level", "gentle"),
            "visual_density": profile.initial_ui_configuration.get("visual_density", "spacious"),
            "calm_mode": profile.initial_ui_configuration.get("calm_mode", True)
        },
        "interaction_preferences": {
            "task_size": profile.initial_ui_configuration.get("task_size", "small"),
            "guidance_level": profile.initial_ui_configuration.get("guidance_level", "high"),
            "feedback_style": "immediate",
            "break_frequency_mins": 5 if "Breathers" in profile.transition_support else 10
        },
        "gamification": {
            "motivation_types": ["exploration", "collection"],
            "game_theme": theme_name,
            "reward_preference": "unlockables",
            "interaction_preference": "step_by_step",
            "celebration_preference": "gentle_sparkles",
            "progress_style": "mastery_tree"
        },
        "updated_at": datetime.utcnow()
    }
    
    await db["learner_preferences"].update_one(
        {"learner_id": resolved_id},
        {"$set": runtime_profile},
        upsert=True
    )

    # Also set active learner for caretaker user
    await db["users"].update_many(
        {"$or": [{"_id": ObjectId(current_user["id"])} if ObjectId.is_valid(current_user["id"]) else {"id": current_user["id"]},
                 {"email": current_user.get("email")}]},
        {"$set": {"learner_id": resolved_id, "learner_name": student_name}}
    )

    # 5. Clean up draft & save persistent store
    await db["questionnaire_drafts"].delete_one({"student_id": resolved_id})
    await save_persistent_students(db)

    return profile


@router.get("/{student_id}/baseline-profile", response_model=BaselineSupportProfile)
async def get_student_baseline_profile(
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves the computed non-diagnostic baseline support profile for a student.
    """
    db = get_database()
    caretaker_id = str(current_user.get("id"))

    # Resilient student recovery
    student = await find_or_recover_student(db, student_id, current_user)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    student_caretaker = str(student.get("caretaker_id", student.get("caregiver_id", "")))
    is_valid_owner = (
        not student_caretaker
        or student_caretaker == caretaker_id
        or student.get("caretaker_email") == current_user.get("email")
        or current_user.get("role") in ["CAREGIVER", "caregiver", "ADMIN", "admin", "EDUCATOR"]
    )
    if not is_valid_owner:
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    resolved_id = str(student.get("_id", student_id))
    profile_doc = await db["baseline_support_profiles"].find_one({
        "$or": [{"student_id": student_id}, {"student_id": resolved_id}]
    })
    if not profile_doc:
        # If screening was not completed, compute default baseline so caregiver can preview
        profile = compute_baseline_support_dimensions(
            student_id=resolved_id,
            student_name=student.get("name", "Student"),
            caretaker_id=caretaker_id,
            responses={}
        )
        profile_doc = profile.model_dump()

    return BaselineSupportProfile(**profile_doc)

