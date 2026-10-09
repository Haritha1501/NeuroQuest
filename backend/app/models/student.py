from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class StudentCreateInput(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    age: int = Field(ge=4, le=25, description="Student age in years")
    date_of_birth: Optional[str] = None
    grade: str = Field(default="Class 7", description="Class/grade level, e.g. Class 6, Class 7, Class 8")
    school_level: Optional[str] = "Middle School"
    school_name: Optional[str] = None
    preferred_language: str = "English"
    interests: List[str] = Field(default_factory=lambda: ["Science", "Space", "Puzzles"])
    learning_environment: Optional[str] = "Home / Quiet Space"
    preferred_communication: Optional[str] = "Visual and spoken"
    guardian_consent: bool = Field(default=True, description="Caretaker guardian consent confirmation")

class StudentUpdateInput(BaseModel):
    first_name: Optional[str] = None
    age: Optional[int] = None
    grade: Optional[str] = None
    school_level: Optional[str] = None
    preferred_language: Optional[str] = None
    interests: Optional[List[str]] = None
    learning_environment: Optional[str] = None

class StudentResponse(BaseModel):
    id: str
    caretaker_id: str
    first_name: str
    name: str
    age: Optional[int] = 11
    grade: str
    school_level: Optional[str] = "Middle School"
    preferred_language: str = "English"
    interests: List[str] = Field(default_factory=list)
    has_completed_screening: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Questionnaire20ResponseInput(BaseModel):
    responses: Dict[str, Any] = Field(
        description="Responses to baseline screening questions"
    )
    current_question: Optional[int] = None

class QuestionnaireDraftInput(BaseModel):
    responses: Dict[str, Any] = Field(default_factory=dict)
    current_question: int = Field(default=1, ge=1, le=50)
    last_updated: Optional[datetime] = None

class BaselineSupportDimension(BaseModel):
    dimension_key: str
    title: str
    support_level: str # e.g. High Support, Moderate Support, Low/Standard
    recommended_strategy: str
    rationale: str

class BaselineSupportProfile(BaseModel):
    student_id: str
    student_name: str
    caretaker_id: str
    version: str = "baseline-v1"
    
    # 10 Educational Support Dimensions
    attention_support: str
    instruction_style: str
    information_density_support: str
    content_representation: str
    task_granularity: str
    pace_support: str
    scaffolding_support: str
    feedback_support: str
    repetition_support: str
    transition_support: str
    
    dimensions: List[BaselineSupportDimension] = Field(default_factory=list)
    recommended_accommodations: List[str] = Field(default_factory=list)
    initial_ui_configuration: Dict[str, Any] = Field(default_factory=dict)
    clinical_domain_indices: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Pedagogical educational support indices (Sensory, Executive, Reading, Pacing, Environment; Zero Medical Data)"
    )
    
    disclaimer: str = (
        "This profile is based on reported observations to personalize the educational experience. "
        "It is strictly non-diagnostic and does not constitute or substitute for an assessment by a "
        "qualified healthcare or education professional."
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
