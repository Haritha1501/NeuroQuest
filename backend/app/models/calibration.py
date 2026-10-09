from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class CalibrationQuestion(BaseModel):
    id: str
    topic: str = "Java & Programming"
    skill: str
    subskill: str
    difficulty: int = Field(ge=1, le=5)
    type: str = "mcq"  # mcq, code_prediction, code_debugging, concept_identification
    prompt: str
    code_snippet: Optional[str] = None
    options: List[str] = Field(default_factory=list)
    correct_answer: str
    explanation: Optional[str] = None
    prerequisites: List[str] = Field(default_factory=list)
    estimated_time_seconds: int = 30
    hint: Optional[str] = None

class CalibrationAnswerSubmit(BaseModel):
    session_id: str
    question_id: str
    selected_answer: str
    response_time_seconds: float = 5.0
    attempt_count: int = 1
    hint_used: bool = False
    confidence_level: Optional[float] = None  # 0.3 (not sure), 0.6 (somewhat), 0.9 (very)
    hesitation_seconds: Optional[float] = 1.0

class SkillMasteryItem(BaseModel):
    skill_name: str
    status: str = "NOT_ASSESSED"  # ASSESSED, NOT_ASSESSED
    mastery_score: Optional[float] = None  # 0.0 - 1.0 (None if not assessed)
    mastery_level: str = "Not Yet Assessed"  # Strong, Proficient, Developing, Needs Practice, Not Yet Assessed
    evidence_level: str = "None"  # None, Low, Medium, High
    evidence_count: int = 0
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)

class RecommendedStartingPoint(BaseModel):
    quest_title: str
    skill: str
    difficulty: int = 2
    why: List[str] = Field(default_factory=list)
    quest_action_url: str = "/session"

class LearnerSkillProfile(BaseModel):
    learner_id: str
    calibrated_at: datetime = Field(default_factory=datetime.utcnow)
    total_questions_answered: int = 0
    skills: Dict[str, SkillMasteryItem] = Field(default_factory=dict)
    discovered_insights: List[str] = Field(default_factory=list)
    recommended_starting_point: Optional[RecommendedStartingPoint] = None

class CalibrationSessionStatus(BaseModel):
    session_id: Optional[str] = None
    calibration_completed: bool = False
    current_question_index: int = 0
    total_questions: int = 4
    last_profile: Optional[LearnerSkillProfile] = None
