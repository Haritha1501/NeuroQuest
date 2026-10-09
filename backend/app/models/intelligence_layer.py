from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# ==============================================================================
# FEATURE 3 & 7: NEXT-BEST-SKILL ENGINE & RECOMMENDATION EXPERIENCE
# ==============================================================================
class AlternativePathItem(BaseModel):
    skill_id: str
    skill_name: str
    score: float
    current_mastery: Optional[float] = None
    reason: str
    quest_id: Optional[str] = None

class NextBestSkillRecommendation(BaseModel):
    learner_id: str
    skill_id: str
    skill_name: str
    score: float
    recommendation_confidence: str = "HIGH"  # HIGH, MEDIUM, LOW
    current_mastery: Optional[float] = None
    target_mastery: float = 0.70
    difficulty: str = "medium"
    estimated_minutes: int = 8
    quest_id: str
    quest_title: str
    reason_codes: List[str] = Field(default_factory=list)
    why_reasons: List[str] = Field(default_factory=list)
    alternative_paths: List[AlternativePathItem] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# ==============================================================================
# FEATURE 10: KNOWLEDGE DECAY & SKILL REVIVAL
# ==============================================================================
class SkillRevivalQuestion(BaseModel):
    question_id: str
    type: str  # recall, application, challenge
    title: str
    prompt: str
    code_snippet: Optional[str] = None
    options: List[str]
    correct_answer: str
    explanation: str

class SkillRevivalAssessment(BaseModel):
    skill_id: str
    skill_name: str
    previous_mastery: float
    estimated_retention: float
    days_since_practice: int
    status: str = "REFRESH_RECOMMENDED"
    estimated_minutes: int = 2
    questions: List[SkillRevivalQuestion] = Field(default_factory=list)

class RevivalSubmissionRequest(BaseModel):
    answers: Dict[str, str]  # question_id -> selected_answer

class RevivalEvaluationResult(BaseModel):
    skill_id: str
    skill_name: str
    previous_mastery: float
    restored_mastery: float
    score_fraction: float
    recall_outcome: str  # STRONG, PARTIAL, WEAK
    status: str  # SKILL_RETAINED, REFRESH_COMPLETED, GAP_DETECTED
    headline: str
    feedback_message: str
    recommended_action: str
    quest_to_launch: Optional[str] = None

# ==============================================================================
# FEATURE 11: CONTEXT-AWARE AI MENTOR
# ==============================================================================
class AIMentorQueryRequest(BaseModel):
    learner_query: str
    mode: str = "explain"  # explain, example, hint, reframe, check, simplify, challenge
    skill_id: Optional[str] = None
    current_question_prompt: Optional[str] = None
    recent_mistake: Optional[str] = None
    hint_step: int = 1

class AIMentorResponse(BaseModel):
    response_text: str
    mode_used: str
    context_summary: Dict[str, Any]
    progressive_hint_level: Optional[int] = None
    max_hints_available: int = 3
    suggested_follow_up_modes: List[str] = Field(default_factory=list)

# ==============================================================================
# FEATURE 14: INCLUSIVE ADAPTIVE LEARNING (SDG 10)
# ==============================================================================
class InclusiveAdaptiveProfile(BaseModel):
    learner_id: str
    content_chunking: str = "standard"  # standard, micro_chunked
    visual_density: str = "standard"    # standard, minimal_low_distraction
    guided_hint_frequency: str = "standard"  # standard, proactive
    focus_mode_active: bool = False
    challenge_chunk_size: str = "standard"  # standard (5 questions), bite_sized (2 questions)
    preferred_modality: str = "multimodal"  # visual, voice, interactive, text, multimodal
    target_competency: str = "Java Inheritance Mastery ≥ 70%"
    path_profile_label: str = "Standard Adaptive Path"
    path_description: str = "Full multi-stage lessons, standard visual layout, and standard challenge length."

class TestPersona(BaseModel):
    persona_id: str
    name: str
    subtitle: str
    description: str
    expected_recommendation: str
    initial_skills: Dict[str, Any]
    adaptive_settings: Dict[str, Any]
