from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class SkillEvolutionStage(str, Enum):
    UNEXPLORED = "unexplored"
    SEED = "seed"         # 30-49%
    SPROUT = "sprout"     # 50-69%
    STRONG = "strong"     # 70-84%
    MASTERED = "mastered" # 85-100%

class SkillBreakdown(BaseModel):
    concept_understanding: float = 0.0
    recall: float = 0.0
    application: float = 0.0
    independent_problem_solving: float = 0.0

class SkillProgressNode(BaseModel):
    skill_id: str
    title: str
    description: str
    prerequisites: List[str] = Field(default_factory=list)
    prerequisite_threshold: float = 0.70
    previous_mastery: Optional[float] = None
    current_mastery: Optional[float] = None  # None if NOT_ASSESSED
    mastery_status: str = "NOT_ASSESSED"     # NOT_ASSESSED, NEEDS_PRACTICE, DEVELOPING, PROFICIENT, MASTERED
    evolution_stage: str = "unexplored"      # unexplored, seed, sprout, strong, mastered
    is_unlocked: bool = False
    is_skipped_as_known: bool = False
    lock_reason: Optional[str] = None
    confidence: str = "LOW"                  # LOW, MEDIUM, HIGH
    evidence_count: int = 0
    breakdown: SkillBreakdown = Field(default_factory=SkillBreakdown)
    last_assessed_at: Optional[datetime] = None

class QuestStage(BaseModel):
    stage_number: int
    stage_type: str  # understand, identify, apply, challenge, demonstrate
    title: str
    prompt: str
    code_snippet: Optional[str] = None
    options: List[str] = Field(default_factory=list)
    correct_answer: str
    explanation: str
    hints: List[str] = Field(default_factory=list)
    weight: float = 1.0

class MasteryQuest(BaseModel):
    id: str
    skill_id: str
    title: str
    description: str
    difficulty: str = "medium"  # beginner, medium, advanced
    target_mastery: float = 0.70
    required_mastery: float = 0.0
    estimated_minutes: int = 8
    stages: List[QuestStage] = Field(default_factory=list)
    reward_xp: int = 100

class QuestStageSubmission(BaseModel):
    stage_number: int
    selected_answer: str
    response_time_seconds: float = 10.0
    hint_used: bool = False

class QuestEvaluationRequest(BaseModel):
    stage_submissions: List[QuestStageSubmission]

class QuestEvaluationResult(BaseModel):
    quest_id: str
    skill_id: str
    mastery_before: Optional[float] = None
    mastery_after: float
    gain_percentage: float
    status_before: str
    status_after: str
    evolution_before: str
    evolution_after: str
    evolution_changed: bool
    is_completed: bool
    unlocked_skills: List[str] = Field(default_factory=list)
    learning_xp_earned: int = 0
    remedial_feedback: Optional[str] = None
    next_recommended_quest: Optional[Dict[str, Any]] = None

class BossChallengeScenario(BaseModel):
    id: str
    title: str
    prompt: str
    code_context: str
    options: List[str]
    correct_answer: str
    explanation: str
    skills_addressed: List[str]

class BossChallenge(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str = "hard"
    skills_tested: List[str]
    scenarios: List[BossChallengeScenario]
    reward_xp: int = 150
    estimated_minutes: int = 12

class MasteryAchievement(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    unlocked_at: Optional[datetime] = None
    is_unlocked: bool = False

class LearnerMasteryProfile(BaseModel):
    learner_id: str
    learner_level: int = 1
    level_title: str = "Skill Explorer"
    learning_xp: int = 0
    activity_minutes: int = 0
    skills_mastered_count: int = 0
    skills_in_progress_count: int = 0
    mastery_streak_days: int = 1
    achievements: List[MasteryAchievement] = Field(default_factory=list)
    last_learning_date: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SkillUniverseResponse(BaseModel):
    learner_id: str
    level: int
    level_title: str
    learning_xp: int
    activity_minutes: int
    mastery_streak: int
    nodes: List[SkillProgressNode]
    active_node_id: str  # "📍 YOU ARE HERE"
    next_quest: Optional[Dict[str, Any]] = None
    boss_challenge: Optional[BossChallenge] = None
    achievements: List[MasteryAchievement] = Field(default_factory=list)
