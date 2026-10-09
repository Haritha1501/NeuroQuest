from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class NodeStateEnum(str, Enum):
    MASTERED = "MASTERED"             # 🟢
    DEVELOPING = "DEVELOPING"         # 🟡
    NEEDS_PRACTICE = "NEEDS_PRACTICE" # 🔴
    CURRENT = "CURRENT"               # 🔵
    NOT_ASSESSED = "NOT_ASSESSED"     # ⚪
    LOCKED = "LOCKED"                 # 🔒

class RelationshipTypeEnum(str, Enum):
    PREREQUISITE = "prerequisite"
    DEPENDS_ON = "depends_on"
    RELATED_TO = "related_to"
    PART_OF = "part_of"
    UNLOCKS = "unlocks"

class SkillEdge(BaseModel):
    id: str
    source_skill_id: str
    target_skill_id: str
    relationship_type: str = "prerequisite"  # prerequisite, depends_on, related_to, part_of, unlocks
    required_mastery: float = 0.70
    label: str = "prerequisite"
    is_satisfied: bool = False

class PrerequisiteCheckItem(BaseModel):
    skill_id: str
    skill_name: str
    required_mastery: float = 0.70
    required_percentage: int = 70
    current_mastery: Optional[float] = None
    current_percentage: Optional[int] = None
    is_met: bool = False

class SkillGraphNodeDefinition(BaseModel):
    id: str
    name: str
    short_name: str
    description: str
    parent_skill_id: Optional[str] = None
    level: int = 1
    category: str = "Java"
    difficulty: int = 1
    quest_id: Optional[str] = None

class LearnerSkillStateNode(BaseModel):
    skill_id: str
    name: str
    short_name: str
    description: str
    level: int = 2
    parent_skill_id: Optional[str] = None
    category: str = "Java"
    difficulty: int = 2
    
    # Learner-specific state (None when NOT_ASSESSED — never 0%!)
    mastery_score: Optional[float] = None
    previous_mastery: Optional[float] = None
    mastery_percentage: Optional[int] = None
    
    # Visual & Pedagogical States
    node_state: str = "NOT_ASSESSED"      # MASTERED, DEVELOPING, NEEDS_PRACTICE, CURRENT, NOT_ASSESSED, LOCKED
    mastery_status: str = "NOT_ASSESSED"  # MASTERED, PROFICIENT, DEVELOPING, NEEDS_PRACTICE, NOT_ASSESSED, LOCKED
    evolution_stage: str = "unexplored"   # unexplored, seed, sprout, strong, mastered
    evolution_label: str = "🔒 Unexplored"
    
    # Graph Navigation Indicators
    is_unlocked: bool = True
    is_you_are_here: bool = False
    is_next_recommended: bool = False
    is_primary_gap: bool = False
    
    # Evidence & Confidence
    confidence: str = "LOW"               # LOW, MEDIUM, HIGH
    evidence_count: int = 0
    evidence_items: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    needs_practice: List[str] = Field(default_factory=list)
    
    # Relationships & Explainability
    prerequisites: List[PrerequisiteCheckItem] = Field(default_factory=list)
    unlocks_skills: List[str] = Field(default_factory=list)
    related_skills: List[str] = Field(default_factory=list)
    why_locked: Optional[str] = None
    why_recommended: Optional[str] = None
    why_here: str = ""
    
    # Gamification & Decay Tracking
    quest_id: Optional[str] = None
    quest_title: Optional[str] = None
    target_mastery: float = 0.70
    last_assessed_at: Optional[datetime] = None
    last_practiced_at: Optional[datetime] = None
    refresh_recommended: bool = False

class FocusModeStep(BaseModel):
    step_order: int
    step_type: str  # YOU_ARE_HERE, TARGET_MILESTONE, NEXT_UNLOCK, FUTURE_HORIZON
    badge: str
    skill_id: str
    skill_name: str
    mastery_percentage: Optional[int] = None
    target_percentage: int = 70
    node_state: str
    summary: str
    quest_id: Optional[str] = None

class CandidateSkillInfo(BaseModel):
    skill_id: str
    skill_name: str
    mastery_score: Optional[float] = None
    confidence: str = "LOW"
    difficulty: int = 2
    prerequisites_met: bool = True
    learning_value: float = 0.0
    unlock_value: float = 0.0
    priority_score: float = 0.0
    reason: str = ""

class DynamicSkillMapResponse(BaseModel):
    learner_id: str
    subject_root: str = "Java"
    graph_definition: Dict[str, Any] = Field(default_factory=dict)
    nodes: List[LearnerSkillStateNode] = Field(default_factory=list)
    edges: List[SkillEdge] = Field(default_factory=list)
    you_are_here_node_id: str
    next_recommended_node_id: str
    primary_gap_node_id: Optional[str] = None
    focus_path: List[FocusModeStep] = Field(default_factory=list)
    candidate_skills: List[CandidateSkillInfo] = Field(default_factory=list)
    summary_stats: Dict[str, Any] = Field(default_factory=dict)
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)
