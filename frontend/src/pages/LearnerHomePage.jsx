import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, BookOpen, Calculator, Globe, Music, Cpu, Palette,
  Award, Play, ArrowRight, Star, Flame, CheckCircle, Rocket,
  GraduationCap, BookCheck, ExternalLink, X, CheckCircle2, Layers,
  Compass, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSensory } from '../context/SensoryContext';
import { 
  getProgressSummary, getTasks, getDailyWelcomeMission, 
  getPersonalGameWorld, getPersonalMasteryTree,
  getNCERTSyllabus, getNCERTStandards, getStudent,
  getCalibrationStatus
} from '../services/api';
import ThemeBanner from '../components/dashboard/ThemeBanner';
import PersonalWorldMap from '../components/dashboard/PersonalWorldMap';
import HackathonDemoBar from '../components/common/HackathonDemoBar';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AudioButton from '../components/common/AudioButton';

const SUBJECT_CARDS = [
  { id: 'Mathematics', label: 'Mathematics', desc: 'Space counting, pattern jumps & arithmetic', icon: Calculator, color: 'from-blue-500 to-indigo-600' },
  { id: 'Science', label: 'Science / EVS', desc: 'Habitats, human body, ecosystems & discovery', icon: Globe, color: 'from-emerald-500 to-teal-600' },
  { id: 'English', label: 'English', desc: 'Comprehension, phonics, stories & grammar', icon: BookOpen, color: 'from-purple-500 to-pink-600' }
];

const getStageInfo = (grade) => {
  if (grade <= 2) return { name: 'Foundational Stage', desc: 'Classes 1–2 • Play & Activity Based Learning' };
  if (grade <= 5) return { name: 'Preparatory Stage', desc: 'Classes 3–5 • Discovery & Interactive Inquiry' };
  if (grade <= 8) return { name: 'Middle Stage', desc: 'Classes 6–8 • Experiential & Conceptual Learning' };
  return { name: 'Secondary Stage', desc: 'Classes 9–10 • Critical Thinking & Deep Concepts' };
};

const LearnerHomePage = () => {
  const { user } = useAuth();
  const { primaryColor, profile } = useTheme();
  const { applyStateAdaptation } = useSensory();
  const navigate = useNavigate();

  const [progress, setProgress] = useState(null);
  const [recommendedTask, setRecommendedTask] = useState(null);
  const [dailyWelcome, setDailyWelcome] = useState(null);
  const [gameWorld, setGameWorld] = useState(null);
  const [masteryTree, setMasteryTree] = useState(null);
  const [calibrationStatus, setCalibrationStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // NCERT Standard & Syllabus state (read active student grade)
  const [selectedGrade, setSelectedGrade] = useState(() => {
    const saved = localStorage.getItem('neuroquest_active_student_grade');
    return saved ? parseInt(saved, 10) : 6;
  });
  const [standardsList, setStandardsList] = useState([]);
  const [activeSyllabus, setActiveSyllabus] = useState(null);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [activeModalSubject, setActiveModalSubject] = useState('Mathematics');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchSyllabusForGrade(selectedGrade);
  }, [selectedGrade]);

  const fetchDashboardData = async () => {
    try {
      const [progRes, tasksRes, welcomeRes, worldRes, treeRes, stdRes, calibRes] = await Promise.all([
        getProgressSummary().catch(() => ({ data: { total_stars: 10, total_tasks_completed: 0, streak_days: 1 } })),
        getTasks(null, null, selectedGrade).catch(() => ({ data: [] })),
        getDailyWelcomeMission().catch(() => ({ data: null })),
        getPersonalGameWorld().catch(() => ({ data: null })),
        getPersonalMasteryTree().catch(() => ({ data: null })),
        getNCERTStandards().catch(() => ({ data: { standards: [] } })),
        getCalibrationStatus().catch(() => ({ data: null }))
      ]);
      
      if (progRes?.data) setProgress(progRes.data);
      if (tasksRes?.data && tasksRes.data.length > 0) {
        setRecommendedTask(tasksRes.data[0]);
      }
      if (welcomeRes.data) setDailyWelcome(welcomeRes.data);
      if (worldRes.data) setGameWorld(worldRes.data);
      if (treeRes.data) setMasteryTree(treeRes.data);
      if (calibRes?.data) setCalibrationStatus(calibRes.data);
      if (stdRes.data?.standards?.length) {
        setStandardsList(stdRes.data.standards);
      }

      const activeStudentId = localStorage.getItem('neuroquest_active_student_id');
      if (activeStudentId && !localStorage.getItem('neuroquest_active_student_grade')) {
        try {
          const sRes = await getStudent(activeStudentId);
          if (sRes.data?.grade) {
            const gMatch = String(sRes.data.grade).match(/\d+/);
            if (gMatch) {
              const parsedG = parseInt(gMatch[0], 10);
              setSelectedGrade(parsedG);
              localStorage.setItem('neuroquest_active_student_grade', parsedG.toString());
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyllabusForGrade = async (grade) => {
    try {
      const [sylRes, tRes] = await Promise.all([
        getNCERTSyllabus(grade).catch(() => ({ data: null })),
        getTasks(null, null, grade).catch(() => ({ data: [] }))
      ]);
      if (sylRes.data?.standards?.[0]) {
        setActiveSyllabus(sylRes.data.standards[0]);
      }
      if (tRes.data && tRes.data.length > 0) {
        setRecommendedTask(tRes.data[0]);
      }
    } catch (e) {
      console.error('Error fetching grade curriculum:', e);
    }
  };

  const handleDemoProfileActivated = () => {
    fetchDashboardData();
  };

  const learnerName = localStorage.getItem('neuroquest_active_student_name') || profile?.learner_name || user?.full_name || 'Learner';
  const totalStars = progress?.total_stars || 10;
  const streakDays = progress?.streak_days || 1;
  const completedCount = progress?.total_tasks_completed || 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-x-hidden">
      {/* Ambient background soft glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-50/60 via-purple-50/30 to-transparent pointer-events-none" />

      {/* Hackathon Presenter Demo Bar */}
      <HackathonDemoBar 
        onProfileActivated={handleDemoProfileActivated} 
        onStateSimulated={(data) => applyStateAdaptation(data?.adaptation, data?.state)}
      />

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 relative z-10">
        
        {/* Hero Personalized Banner */}
        <ThemeBanner learnerName={learnerName} totalStars={totalStars} />

        {/* SkillForge Calibration Prompt (First-time or not completed) */}
        {calibrationStatus && !calibrationStatus.calibration_completed && (
          <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-purple-400/30 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 max-w-xl z-10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/20 text-white font-black rounded-full text-[11px] uppercase tracking-wider backdrop-blur-sm border border-white/20">
                  🎯 Quest 00 • Calibration
                </span>
                <span className="text-purple-200 text-xs font-semibold">3-Minute Adaptive Diagnostic</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight">
                Discover Your Skill Map
              </h3>
              <p className="text-purple-100 text-xs sm:text-sm font-medium leading-relaxed">
                Take a quick 3-minute diagnostic (3–5 adaptive questions) so NeuroQuest can pinpoint your strengths and tailor quests directly to your level!
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 z-10">
              <button
                onClick={() => navigate('/calibration')}
                className="px-6 py-3.5 bg-white text-purple-900 hover:bg-purple-50 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 transform active:scale-95 hover:scale-105"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Launch SkillForge (3 min)</span>
                <ArrowRight className="w-4 h-4 text-purple-700" />
              </button>
            </div>
          </div>
        )}

        {/* SkillForge Calibration Completed Quick Card */}
        {calibrationStatus && calibrationStatus.calibration_completed && (
          <div className="bg-white rounded-3xl px-6 py-4 border border-purple-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-purple-950 uppercase tracking-wide">SkillForge Calibrated</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">Active Profile</span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Recommended starting point: <strong className="text-purple-700">{calibrationStatus.skill_profile?.recommended_starting_point?.title || 'Personalized Path'}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/calibration')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
            >
              <span>View Skill Map / Recalibrate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SkillForge Mastery Game Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 max-w-xl z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/30 text-indigo-300 font-black rounded-full text-[11px] uppercase tracking-wider backdrop-blur-sm border border-indigo-400/30 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                SkillForge Mastery Game
              </span>
              <span className="text-purple-300 text-xs font-semibold">Real Learning Driven Progression</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              Enter The Skill Universe
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
              Every quest, unlock, and evolution is driven strictly by demonstrated knowledge. Master skills to unlock gates, evolve your skill tree, and conquer the OOP Boss Challenge.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 z-10">
            <button
              onClick={() => navigate('/mastery')}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 transform active:scale-95 hover:scale-105"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-current" />
              <span>Launch Mastery Universe</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Phase 3 Personalized Daily Return Experience Mission */}
        {dailyWelcome && (
          <div className="bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-bold shadow-md">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-indigo-300 tracking-wider">Daily Return Mission</span>
                  <h3 className="text-xl font-black text-white">{dailyWelcome.mission_title}</h3>
                </div>
              </div>
              <AudioButton
                text={`${dailyWelcome.greeting}`}
                label="Listen Welcome"
                className="bg-indigo-800 text-indigo-100 border-indigo-700"
              />
            </div>
            <p className="text-sm text-indigo-100 leading-relaxed font-medium bg-indigo-950/60 p-4 rounded-2xl border border-indigo-800/60">
              {dailyWelcome.greeting}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => navigate('/session')}
                className="px-6 py-3 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-98"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Today's Mission</span>
              </button>
            </div>
          </div>
        )}

        {/* Phase 3 Personal Game World Map & Mastery Tree */}
        <PersonalWorldMap gameWorld={gameWorld} masteryTree={masteryTree} />

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            onClick={() => navigate('/progress')}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer flex items-center gap-4 group"
            title="View Badges & Stars"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-black text-slate-900">{totalStars}</div>
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Stars Earned</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/progress')}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-pointer flex items-center gap-4 group"
            title="View Streak Progress"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 fill-current" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-black text-slate-900">{streakDays} Day Streak</div>
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Daily Quest Streak</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/session')}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex items-center gap-4 group"
            title="Go to Quest Room"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-black text-slate-900">{completedCount} Quests</div>
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Completed Activities</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Featured Quest Start Banner */}
        {recommendedTask && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-500/30 text-indigo-300 rounded-full text-xs font-extrabold uppercase tracking-wider border border-indigo-400/30">
                  Recommended Quest
                </span>
                <AudioButton
                  text={`Recommended Quest: ${recommendedTask.title}. ${recommendedTask.question}`}
                  label="Listen Quest"
                  className="bg-slate-800 text-slate-200 border-slate-700"
                />
              </div>
              <h3 className="text-2xl font-extrabold">{recommendedTask.title}</h3>
              <p className="text-slate-300 text-sm">{recommendedTask.question}</p>
            </div>

            <button
              onClick={() => navigate('/session', { state: { taskId: recommendedTask.id } })}
              className="px-7 py-3.5 rounded-2xl font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 shrink-0 transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Activity</span>
            </button>
          </div>
        )}

        {/* NCERT Standard / Class Selector */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-black tracking-wide border border-indigo-200">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  NCERT & NEP 2020 CURRICULUM
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {getStageInfo(selectedGrade).name} • {getStageInfo(selectedGrade).desc}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Explore Class {selectedGrade} Syllabus & Adaptive Quests
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Choose any standard from Class 1 to 10 to switch curriculum chapters, step-by-step scaffolds, and learning outcomes.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveModalSubject('Mathematics');
                setShowSyllabusModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all shrink-0 hover:scale-105 active:scale-95 shadow-sm"
            >
              <BookCheck className="w-4 h-4 text-indigo-600" />
              <span>Browse Class {selectedGrade} Syllabus</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>

          {/* Standard Selector Pills (Class 1 to 10) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {(standardsList.length > 0 ? standardsList : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => ({ grade: g }))).map(std => {
              const grade = std.grade;
              const isSelected = selectedGrade === grade;
              return (
                <button
                  key={grade}
                  onClick={() => {
                    setSelectedGrade(grade);
                    localStorage.setItem('neuroquest_active_student_grade', grade.toString());
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105 ring-2 ring-indigo-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <span>Class {grade}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject Exploration Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Class {selectedGrade} Learning Quests by Subject
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Aligned with official NCERT textbooks and neurodivergent-adaptive learning scaffolds
              </p>
            </div>
            <Link to="/session" state={{ grade: selectedGrade }} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
              View All Class {selectedGrade} Quests <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SUBJECT_CARDS.map(sub => {
              const IconComponent = sub.icon;
              const sylMatch = activeSyllabus?.subjects?.find(s => 
                s.subject.toLowerCase() === sub.id.toLowerCase() || 
                (sub.id === 'Science' && s.subject.toLowerCase().includes('evs'))
              );
              const chapterCount = sylMatch?.chapters?.length;
              const textbookName = sylMatch?.textbook;

              return (
                <div
                  key={sub.id}
                  onClick={() => navigate('/session', { state: { subject: sub.id, grade: selectedGrade } })}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${sub.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      {chapterCount ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <BookCheck className="w-3 h-3 text-indigo-500" />
                          {chapterCount} Chapters
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {sub.label}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {sub.desc}
                      </p>
                      {textbookName && (
                        <p className="text-[11px] font-semibold text-indigo-600/80 mt-2 truncate" title={textbookName}>
                          📖 {textbookName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 flex items-center justify-between border-t border-slate-100 mt-4">
                    <span className="text-xs font-bold text-slate-400">Class {selectedGrade} NCERT</span>
                    <span className="text-xs font-extrabold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Enter Subject <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earned Rewards Preview */}
        {progress?.earned_badges && progress.earned_badges.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Unlocked Trophies & Badges
              </h2>
              <Link to="/progress" className="text-xs font-bold text-indigo-600 hover:underline">
                View Collection
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {progress.earned_badges.slice(0, 4).map(badge => (
                <div
                  key={badge.id}
                  onClick={() => navigate('/progress')}
                  className={`p-4 rounded-2xl border text-center space-y-2 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all ${
                    badge.is_unlocked
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                  title="View Badge in Progress Hub"
                >
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 mx-auto flex items-center justify-center font-bold shadow-sm">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-extrabold">{badge.title}</div>
                  <div className="text-[10px] text-slate-500">{badge.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NCERT Syllabus Explorer Modal */}
        {showSyllabusModal && activeSyllabus && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-black border border-indigo-200">
                      NCERT Class {selectedGrade}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {getStageInfo(selectedGrade).name} • {getStageInfo(selectedGrade).desc}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mt-1">
                    {activeSyllabus.standard_name} Curriculum & Chapters
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    National Council of Educational Research and Training (NCERT) aligned with NEP 2020 Learning Outcomes.
                  </p>
                </div>
                <button
                  onClick={() => setShowSyllabusModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subject Tabs */}
              <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 overflow-x-auto">
                {activeSyllabus.subjects?.map(s => {
                  const isTabActive = activeModalSubject.toLowerCase() === s.subject.toLowerCase();
                  return (
                    <button
                      key={s.subject}
                      onClick={() => setActiveModalSubject(s.subject)}
                      className={`pb-3 px-4 text-xs font-extrabold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
                        isTabActive
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>{s.subject}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        isTabActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {s.chapters?.length || 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Modal Body: Chapters & Outcomes */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                {(() => {
                  const currentSub = activeSyllabus.subjects?.find(s => 
                    s.subject.toLowerCase() === activeModalSubject.toLowerCase()
                  ) || activeSyllabus.subjects?.[0];

                  if (!currentSub) {
                    return (
                      <div className="text-center py-12 text-slate-500 text-sm">
                        No syllabus details found for this subject.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Textbook Info */}
                      {currentSub.textbook && (
                        <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
                            <div>
                              <div className="text-xs font-black text-indigo-900">Official NCERT Textbook</div>
                              <div className="text-xs font-semibold text-indigo-700">{currentSub.textbook}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setShowSyllabusModal(false);
                              navigate('/session', { 
                                state: { 
                                  subject: currentSub.subject.includes('EVS') ? 'Science' : currentSub.subject, 
                                  grade: selectedGrade 
                                } 
                              });
                            }}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                          >
                            <span>Practice All Tasks</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Chapters List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentSub.chapters?.map(chap => (
                          <div 
                            key={chap.chapter_number}
                            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-extrabold text-[11px] rounded-lg border border-slate-200">
                                  Ch {chap.chapter_number}
                                </span>
                                <span className="text-[11px] font-semibold text-indigo-600">
                                  {chap.topics?.length || 0} Core Topics
                                </span>
                              </div>
                              <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                                {chap.title}
                              </h4>
                              {/* Topics */}
                              {chap.topics && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {chap.topics.slice(0, 4).map(t => (
                                    <span key={t} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-medium rounded-md border border-slate-200">
                                      {t}
                                    </span>
                                  ))}
                                  {chap.topics.length > 4 && (
                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] font-medium rounded-md">
                                      +{chap.topics.length - 4} more
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Learning outcomes preview */}
                              {chap.learning_outcomes && chap.learning_outcomes.length > 0 && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 italic pt-1 border-t border-slate-100">
                                  🎯 {chap.learning_outcomes[0]}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setShowSyllabusModal(false);
                                navigate('/session', { 
                                  state: { 
                                    subject: currentSub.subject.includes('EVS') ? 'Science' : currentSub.subject, 
                                    grade: selectedGrade,
                                    chapter: chap.title
                                  } 
                                });
                              }}
                              className="w-full py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 mt-2"
                            >
                              <span>Start Chapter Tasks</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/80">
                <div className="text-xs text-slate-500 font-medium">
                  Showing official curriculum for <span className="font-bold text-slate-700">Class {selectedGrade}</span>
                </div>
                <button
                  onClick={() => setShowSyllabusModal(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default LearnerHomePage;
