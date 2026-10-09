import axios from 'axios';

let rawBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
if (rawBaseUrl && !rawBaseUrl.startsWith('http') && rawBaseUrl !== '/api') {
  rawBaseUrl = `https://${rawBaseUrl}`;
}
const API_BASE_URL = rawBaseUrl.startsWith('http') && !rawBaseUrl.endsWith('/api')
  ? `${rawBaseUrl.replace(/\/$/, '')}/api`
  : rawBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT Auth token - checks both key names for compatibility
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('neuroquest_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Endpoints - backend routes are /auth/register and /auth/token and /auth/me
export const registerUser = (userData) => api.post('/auth/register', userData);
export const loginUser = (credentials) => api.post('/auth/token', { username: credentials.email || credentials.username, password: credentials.password });
export const getCurrentUser = () => api.get('/auth/me');

// Medical Onboarding & Data Collection (ICMR Questions)
export const getMedicalQuestions = (learnerId) => api.get(`/medical/questions/${learnerId}`);
export const submitMedicalProfile = (data) => api.post('/medical/submit', data);

// Onboarding Questionnaire & Profile Engine
export const getQuestionnaireSchema = () => api.get('/onboarding/schema');
export const getQuestionnaireDraft = () => api.get('/onboarding/draft');
export const saveQuestionnaireDraft = (draftData) => api.post('/onboarding/draft', draftData);
export const getInitialSupportProfile = () => api.get('/onboarding/profile');
export const submitQuestionnaire = (answers) => api.post('/onboarding/questionnaire', answers);

// Learner Preferences & Theme Engine
export const getLearnerProfile = () => api.get('/learner/profile');
export const updateLearnerPreferences = (prefs) => api.put('/learner/preferences', prefs);

// Tasks & Sessions
export const getTasks = (subject, difficulty, grade) => {
  const params = {};
  if (subject) params.subject = subject;
  if (difficulty) params.difficulty = difficulty;
  if (grade) params.grade = grade;
  return api.get('/tasks', { params });
};
export const getTaskById = (taskId) => api.get(`/tasks/${taskId}`);
export const getNCERTSyllabus = (grade, subject) => {
  const params = {};
  if (grade) params.grade = grade;
  if (subject) params.subject = subject;
  return api.get('/tasks/syllabus', { params });
};
export const getNCERTStandards = () => api.get('/tasks/standards');

export const startSession = () => api.post('/session/start');
export const submitAnswer = (sessionId, data) => api.post(`/session/${sessionId}/answer`, data);
export const endSession = (sessionId) => api.post(`/session/${sessionId}/end`);

// Phase 2 Telemetry ML & Session Adaptation
export const evaluateTelemetry = (payload) => api.post('/telemetry/evaluate', payload);

// Phase 2 Caregiver Insights Dashboard
export const getCaregiverInsights = () => api.get('/caregiver/insights');

// Progress & Rewards
export const getProgressSummary = () => api.get('/progress/summary');

// AI Assist Explanation / Hint / Scaffolding
export const getAIExplanation = (data) => api.post('/ai/explain', data);
export const generatePersonalizedTask = (data) => api.post('/ai/personalized-task', data);
export const getAIHint = (data) => api.post('/ai/hint', data);
export const getAIScaffold = (data) => api.post('/ai/scaffold', data);
export const getDailyWelcomeMission = () => api.get('/ai/daily-welcome');

// Personal Game World & Non-Competitive Mastery Tree
export const getPersonalGameWorld = () => api.get('/game-world');
export const getPersonalMasteryTree = () => api.get('/game-world/mastery-tree');

// Hackathon Demo Simulation & Profile Switching
export const getDemoProfiles = () => api.get('/demo/profiles');
export const activateDemoProfile = (learnerId) => api.post('/demo/activate-profile', { learner_id: learnerId });
export const simulateState = (stateName) => api.post('/demo/simulate-state', { simulated_state: stateName });
export const getAdaptationExplanation = () => api.get('/demo/adaptation-explanation');

// Student Management & Baseline Screening Flow (Caretaker -> Student Experience)
export const getStudents = () => api.get('/students');
export const getStudent = (studentId) => api.get(`/students/${studentId}`);
export const createStudent = (studentData) => api.post('/students', studentData);
export const getStudentQuestionnaire = (studentId) => api.get(`/students/${studentId}/questionnaire`);
export const saveStudentQuestionnaireDraft = (studentId, draftData) => api.post(`/students/${studentId}/questionnaire/draft`, draftData);
export const completeStudentQuestionnaire = (studentId, submissionData) => api.post(`/students/${studentId}/questionnaire/complete`, submissionData);
export const getStudentBaselineProfile = (studentId) => api.get(`/students/${studentId}/baseline-profile`);

// SkillForge Calibration: 3-Minute Adaptive Diagnostic & Knowledge Profiling
export const getCalibrationStatus = () => api.get('/calibration/status');
export const startCalibration = () => api.post('/calibration/start');
export const submitCalibrationAnswer = (data) => api.post('/calibration/answer', data);
export const getCalibrationResult = () => api.get('/calibration/result');
export const recalibrateSkills = () => api.post('/calibration/recalibrate');

// SkillForge Mastery Game: Skill-Based Gamification Driven by Demonstrated Learning
export const getMasteryUniverse = () => api.get('/mastery/universe');
export const getSkillDetails = (skillId) => api.get(`/mastery/skills/${skillId}`);
export const getRecommendedMasteryQuest = () => api.get('/mastery/quests/recommended');
export const getMasteryQuest = (questId) => api.get(`/mastery/quests/${questId}`);
export const evaluateQuestAttempt = (questId, payload) => api.post(`/mastery/quests/${questId}/evaluate`, payload);
export const getBossChallenge = () => api.get('/mastery/boss');
export const evaluateBossChallenge = (payload) => api.post('/mastery/boss/evaluate', payload);
export const getMasteryProfile = () => api.get('/mastery/profile');

// Feature 2: Dynamic Skill Map / Learner Knowledge Graph
export const getDynamicSkillMap = () => api.get('/skills/map');
export const getLearnerSkillMap = () => api.get('/learner/skill-map');
export const getLearnerFocusSkills = () => api.get('/learner/focus-skills');
export const getSkillNodeDetail = (skillId) => api.get(`/skills/${skillId}`);
export const getSkillProgress = (skillId) => api.get(`/skills/${skillId}/progress`);
export const getSkillPrerequisites = (skillId) => api.get(`/skills/${skillId}/prerequisites`);

// Features 3, 7, 10, 11, 14: SkillForge Intelligence Layer
export const getNextBestSkill = (learnerId) => api.get('/intelligence/next-best-skill', { params: learnerId ? { learner_id: learnerId } : {} });
export const getSkillRevivalAssessment = (skillId, learnerId) => api.get(`/intelligence/revival/${skillId}`, { params: learnerId ? { learner_id: learnerId } : {} });
export const submitSkillRevival = (skillId, answers, learnerId) => api.post(`/intelligence/revival/${skillId}/submit`, { answers }, { params: learnerId ? { learner_id: learnerId } : {} });
export const askAIMentor = (data, learnerId) => api.post('/intelligence/mentor/ask', data, { params: learnerId ? { learner_id: learnerId } : {} });
export const getInclusiveAdaptiveProfile = (learnerId) => api.get('/intelligence/adaptive-profile', { params: learnerId ? { learner_id: learnerId } : {} });
export const updateInclusiveAdaptiveProfile = (updates, learnerId) => api.post('/intelligence/adaptive-profile', updates, { params: learnerId ? { learner_id: learnerId } : {} });
export const getIntelligencePersonas = () => api.get('/intelligence/personas');
export const activateIntelligencePersona = (personaId) => api.post(`/intelligence/personas/${personaId}/activate`);

export default api;


