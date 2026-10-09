import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, Brain, Flame, Clock, Target, Shield, Award, 
  Sparkles, ArrowRight, Lock, CheckCircle2, ChevronRight,
  Play, BookOpen, AlertCircle, TrendingUp, Zap, Crown,
  RotateCcw, HelpCircle, Code2, X, Check, Eye
} from 'lucide-react';
import { 
  getMasteryUniverse, 
  getMasteryQuest, 
  evaluateQuestAttempt, 
  getBossChallenge, 
  evaluateBossChallenge,
  getDynamicSkillMap,
  getNextBestSkill,
  getInclusiveAdaptiveProfile
} from '../services/api';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AudioButton from '../components/common/AudioButton';
import GamifiedAvatar from '../components/common/GamifiedAvatar';
import AnimatedFeedbackMessenger from '../components/common/AnimatedFeedbackMessenger';
import DynamicSkillMap from '../components/skillmap/DynamicSkillMap';
import NextBestSkillHero from '../components/intelligence/NextBestSkillHero';
import SkillRevivalModal from '../components/intelligence/SkillRevivalModal';
import AIMentorDrawer from '../components/intelligence/AIMentorDrawer';
import InclusiveAdaptiveModal from '../components/intelligence/InclusiveAdaptiveModal';
import PersonaSwitcherBar from '../components/intelligence/PersonaSwitcherBar';

const EVOLUTION_METAPHORS = {
  unexplored: { label: 'Unexplored', icon: '⚪', color: 'text-slate-400 bg-slate-100 border-slate-200' },
  seed: { label: '🌱 Seed (Discovered)', icon: '🌱', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  sprout: { label: '🌿 Sprout (Developing)', icon: '🌿', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  strong: { label: '🌳 Strong (Proficient)', icon: '🌳', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  mastered: { label: '🌲 Mastered (Sage)', icon: '🌲', color: 'text-purple-700 bg-purple-50 border-purple-200' }
};

const SkillForgeMasteryPage = () => {
  const navigate = useNavigate();

  const [universe, setUniverse] = useState(null);
  const [skillMap, setSkillMap] = useState(null);
  const [lastMapChange, setLastMapChange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  // Intelligence Layer states (Features 3, 7, 10, 11, 14)
  const [nextBestSkill, setNextBestSkill] = useState(null);
  const [adaptiveProfile, setAdaptiveProfile] = useState(null);
  const [revivalSkillId, setRevivalSkillId] = useState(null);
  const [isRevivalOpen, setIsRevivalOpen] = useState(false);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [isAdaptiveModalOpen, setIsAdaptiveModalOpen] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState('fast_learner');

  // Quest Player state
  const [activeQuest, setActiveQuest] = useState(null);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [stageSubmissions, setStageSubmissions] = useState({});
  const [stageSelectedAnswer, setStageSelectedAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintUsedForStage, setHintUsedForStage] = useState(false);
  const [submittingQuest, setSubmittingQuest] = useState(false);

  // Before -> After Result Modal state
  const [questResult, setQuestResult] = useState(null);

  // Boss Challenge state
  const [bossChallenge, setBossChallenge] = useState(null);
  const [bossSubmissions, setBossSubmissions] = useState({});
  const [submittingBoss, setSubmittingBoss] = useState(false);
  const [bossResult, setBossResult] = useState(null);

  useEffect(() => {
    fetchUniverse();
  }, []);

  const fetchUniverse = async () => {
    try {
      setLoading(true);
      const [uniRes, mapRes, nbsRes, adaptRes] = await Promise.all([
        getMasteryUniverse(),
        getDynamicSkillMap().catch(() => ({ data: null })),
        getNextBestSkill().catch(() => ({ data: null })),
        getInclusiveAdaptiveProfile().catch(() => ({ data: null }))
      ]);
      setUniverse(uniRes.data);
      if (mapRes?.data) {
        setSkillMap(mapRes.data);
      }
      if (nbsRes?.data) {
        setNextBestSkill(nbsRes.data);
      }
      if (adaptRes?.data) {
        setAdaptiveProfile(adaptRes.data);
      }
    } catch (err) {
      console.error('Failed to load Skill Universe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQuest = async (questId) => {
    try {
      setLoading(true);
      const res = await getMasteryQuest(questId);
      setActiveQuest(res.data);
      setCurrentStageIdx(0);
      setStageSubmissions({});
      setStageSelectedAnswer('');
      setShowHint(false);
      setHintUsedForStage(false);
    } catch (err) {
      console.error('Failed to open quest:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageNext = () => {
    if (!stageSelectedAnswer) return;

    const currentStage = activeQuest.stages[currentStageIdx];
    const newSubs = {
      ...stageSubmissions,
      [currentStage.stage_number]: {
        stage_number: currentStage.stage_number,
        selected_answer: stageSelectedAnswer,
        hint_used: hintUsedForStage,
        response_time_seconds: 12.0
      }
    };
    setStageSubmissions(newSubs);

    if (currentStageIdx < activeQuest.stages.length - 1) {
      setCurrentStageIdx(prev => prev + 1);
      setStageSelectedAnswer('');
      setShowHint(false);
      setHintUsedForStage(false);
    } else {
      // Completed all 5 stages, submit evaluation
      submitQuestEvaluation(newSubs);
    }
  };

  const submitQuestEvaluation = async (submissionsMap) => {
    try {
      setSubmittingQuest(true);
      const payload = {
        stage_submissions: Object.values(submissionsMap)
      };
      const res = await evaluateQuestAttempt(activeQuest.id, payload);
      const evalData = res.data;
      setQuestResult(evalData);
      setActiveQuest(null);

      // Record live map change for the "Your learning changed your Skill Map" banner
      setLastMapChange({
        skillName: evalData.skill_id ? evalData.skill_id.replace('_', ' ').toUpperCase() : 'Skill',
        beforePct: evalData.mastery_before !== null && evalData.mastery_before !== undefined ? Math.round(evalData.mastery_before * 100) : null,
        afterPct: Math.round(evalData.mastery_after * 100),
        statusAfter: evalData.status_after,
        unlockedSkills: evalData.unlocked_skills || []
      });

      // Refresh universe & dynamic skill map in background
      fetchUniverse();
    } catch (err) {
      console.error('Failed to evaluate quest:', err);
    } finally {
      setSubmittingQuest(false);
    }
  };

  const handleOpenBoss = async () => {
    try {
      setLoading(true);
      const res = await getBossChallenge();
      setBossChallenge(res.data);
      setBossSubmissions({});
      setBossResult(null);
    } catch (err) {
      console.error('Failed to open boss challenge:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitBossChallenge = async () => {
    try {
      setSubmittingBoss(true);
      const scenarioList = Object.entries(bossSubmissions).map(([id, answer]) => ({
        id,
        selected_answer: answer
      }));
      const payload = {
        boss_id: bossChallenge.id,
        scenario_submissions: scenarioList
      };
      const res = await evaluateBossChallenge(payload);
      setBossResult(res.data);
      fetchUniverse();
    } catch (err) {
      console.error('Failed to evaluate boss challenge:', err);
    } finally {
      setSubmittingBoss(false);
    }
  };

  if (loading && !universe) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-bold text-sm">Synchronizing Real Knowledge Game State...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const nodes = universe?.nodes || [];
  const activeNode = nodes.find(n => n.skill_id === universe?.active_node_id) || nodes[0];
  const nextQuest = universe?.next_quest;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 relative">
      <Navbar />

      {/* Feature 3, 7, 10, 11, 14: Live Persona Switcher & Intelligence Tools Bar */}
      <PersonaSwitcherBar
        activePersonaId={activePersonaId}
        onPersonaChanged={(data) => {
          setActivePersonaId(data.persona_id);
          fetchUniverse();
        }}
        onOpenAIMentor={() => setIsMentorOpen(true)}
        onOpenSDG10={() => setIsAdaptiveModalOpen(true)}
        onOpenRevival={() => {
          setRevivalSkillId('inheritance');
          setIsRevivalOpen(true);
        }}
      />

      <main className={`flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full ${
        adaptiveProfile?.focus_mode_active ? 'space-y-6 max-w-5xl' : 'space-y-8'
      }`}>

        {/* Focus Mode active indicator if enabled */}
        {adaptiveProfile?.focus_mode_active && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-teal-900">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-600" />
              <span>Low-Distraction Focus Mode Active (SDG 10) • Reduced Visual Noise</span>
            </span>
            <button
              onClick={() => setIsAdaptiveModalOpen(true)}
              className="text-teal-700 underline font-black hover:text-teal-950"
            >
              Adjust Settings
            </button>
          </div>
        )}

        {/* 1. DUAL-TRACK HEADER: LEVEL + LEARNING XP VS. ACTIVITY TIME */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex flex-col items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">LEVEL</span>
              <span className="text-2xl font-black">{universe?.level || 1}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{universe?.level_title || 'Skill Explorer'}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Java Universe
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Progression is driven strictly by demonstrated knowledge, verified challenges, and mastery evolution.
              </p>
            </div>
          </div>

          {/* Dual-Track Stats Grid */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
            {/* Learning XP */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 text-center min-w-[100px]">
              <div className="flex items-center justify-center gap-1 text-indigo-600 mb-0.5">
                <Brain className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Learning XP</span>
              </div>
              <div className="text-xl font-black text-indigo-950">{universe?.learning_xp || 0}</div>
              <span className="text-[9px] font-bold text-indigo-600/80">From Mastery</span>
            </div>

            {/* Activity Time (Separate!) */}
            <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3 text-center min-w-[100px]">
              <div className="flex items-center justify-center gap-1 text-slate-600 mb-0.5">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Activity</span>
              </div>
              <div className="text-xl font-black text-slate-800">{universe?.activity_minutes || 0}m</div>
              <span className="text-[9px] font-bold text-slate-500">Quest Minutes</span>
            </div>

            {/* Mastery Streak */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-center min-w-[100px]">
              <div className="flex items-center justify-center gap-1 text-amber-600 mb-0.5">
                <Flame className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Streak</span>
              </div>
              <div className="text-xl font-black text-amber-950">{universe?.mastery_streak || 1}d</div>
              <span className="text-[9px] font-bold text-amber-700/80">Learning Days</span>
            </div>
          </div>
        </div>

        {/* 2. FEATURE 7 & 3: 🧭 "WHAT SHOULD I LEARN NEXT?" HERO CARD */}
        <NextBestSkillHero
          recommendation={nextBestSkill || (nextQuest ? {
            learner_id: 'current',
            skill_id: nextQuest.skill_id,
            skill_name: nextQuest.title,
            score: 0.85,
            recommendation_confidence: 'HIGH',
            quest_id: nextQuest.id,
            quest_title: nextQuest.title,
            difficulty: nextQuest.difficulty,
            estimated_minutes: nextQuest.estimated_minutes,
            why_reasons: nextQuest.why_this_quest || ["Optimized next step based on prerequisite readiness"],
            alternative_paths: []
          } : null)}
          onStartQuest={handleOpenQuest}
          onOpenRevival={(skillId) => {
            setRevivalSkillId(skillId);
            setIsRevivalOpen(true);
          }}
          onSelectAlternative={(alt) => {
            if (alt.quest_id) {
              handleOpenQuest(alt.quest_id);
            } else if (alt.skill_id) {
              if (alt.reason?.toLowerCase().includes('decay') || alt.reason?.toLowerCase().includes('refresh')) {
                setRevivalSkillId(alt.skill_id);
                setIsRevivalOpen(true);
              } else {
                const matchedNode = nodes.find(n => n.skill_id === alt.skill_id);
                if (matchedNode) setSelectedNode(matchedNode);
              }
            }
          }}
          loading={loading}
        />

        {/* 3. FEATURE 2: DYNAMIC SKILL MAP / LIVING KNOWLEDGE GRAPH */}
        {skillMap && (
          <DynamicSkillMap
            skillMap={skillMap}
            onStartQuest={handleOpenQuest}
            lastMapChange={lastMapChange}
            onDismissChange={() => setLastMapChange(null)}
          />
        )}

        {/* 3B. INTERACTIVE 🌍 SKILL UNIVERSE NODE GRAPH */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                <span>Skill Universe Map</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Interactive prerequisite journey. Advanced skills require demonstrated mastery (&ge;70%) to unlock.
              </p>
            </div>

            {/* Status Legend */}
            <div className="flex items-center gap-3 flex-wrap text-[11px] font-bold">
              <span className="flex items-center gap-1 text-purple-700"><span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Mastered</span>
              <span className="flex items-center gap-1 text-indigo-700"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Proficient</span>
              <span className="flex items-center gap-1 text-emerald-700"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Developing</span>
              <span className="flex items-center gap-1 text-slate-400"><Lock className="w-3 h-3 text-slate-400" /> Locked</span>
              <span className="flex items-center gap-1 text-slate-400">⚪ Not Assessed</span>
            </div>
          </div>

          {/* Node Grid with Connections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {nodes.map((node) => {
              const isCurrent = node.skill_id === universe?.active_node_id;
              const isLocked = !node.is_unlocked;
              const hasScore = node.current_mastery !== null && node.current_mastery !== undefined;
              const scorePct = hasScore ? Math.round(node.current_mastery * 100) : null;
              const evoMeta = EVOLUTION_METAPHORS[node.evolution_stage] || EVOLUTION_METAPHORS.unexplored;

              return (
                <div
                  key={node.skill_id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden group ${
                    isCurrent
                      ? 'bg-gradient-to-b from-indigo-50/90 to-white border-indigo-400 ring-2 ring-indigo-500/20 shadow-md'
                      : isLocked
                      ? 'bg-slate-50/80 border-slate-200 opacity-60 hover:opacity-80'
                      : 'bg-white border-slate-200/90 hover:shadow-md hover:border-indigo-300'
                  }`}
                >
                  {/* Top indicator: Status pill & Current badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${evoMeta.color}`}>
                      {evoMeta.icon} {node.mastery_status.replace('_', ' ')}
                    </span>

                    {isCurrent && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm animate-pulse">
                        📍 YOU ARE HERE
                      </span>
                    )}

                    {isLocked && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 bg-slate-200/80 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}

                    {node.is_skipped_as_known && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-emerald-800 bg-emerald-100">
                        ✓ Calibrated Mastered
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {node.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{node.description}</p>
                  </div>

                  {/* Mastery Progress Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">Demonstrated Mastery</span>
                      {hasScore ? (
                        <span className="font-black text-slate-900">{scorePct}%</span>
                      ) : (
                        <span className="font-semibold text-slate-400 italic">⚪ Not Yet Assessed</span>
                      )}
                    </div>
                    
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      {hasScore ? (
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${
                            scorePct >= 85 ? 'bg-purple-600' : scorePct >= 70 ? 'bg-indigo-600' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${scorePct}%` }}
                        />
                      ) : (
                        <div className="h-full bg-slate-200/60 w-full" />
                      )}
                    </div>

                    {/* Lock reason if locked */}
                    {isLocked && node.lock_reason && (
                      <p className="text-[11px] font-bold text-amber-700 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200 mt-2">
                        🔒 {node.lock_reason}
                      </p>
                    )}
                  </div>

                  {/* Card Footer action */}
                  <div className="pt-1 flex items-center justify-between text-xs font-bold text-indigo-600">
                    <span>Inspect Evidence</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. ⚔️ CHALLENGE ARENA & 👑 BOSS CHALLENGE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Boss Challenge Hero Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-3 max-w-xl z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 text-white rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-sm border border-white/20">
                <Crown className="w-4 h-4 text-amber-200" />
                <span>👑 Milestone Boss Challenge</span>
              </div>
              <h3 className="text-2xl font-black">Galactic Fleet Dispatcher (OOP Synthesis)</h3>
              <p className="text-amber-100 text-xs sm:text-sm font-medium leading-relaxed">
                Test true application rather than memorization. Synthesize Classes, Inheritance, Polymorphism, and Methods to architect an autonomous fleet dispatcher.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-end gap-2 shrink-0 z-10 w-full sm:w-auto">
              <span className="text-xs font-black text-amber-200 uppercase tracking-wider">+150 Learning XP</span>
              <button
                onClick={handleOpenBoss}
                className="w-full sm:w-auto px-6 py-3.5 bg-white text-orange-900 hover:bg-orange-50 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95 hover:scale-105"
              >
                <Zap className="w-4 h-4 text-orange-600" />
                <span>Enter Boss Arena</span>
              </button>
            </div>
          </div>

          {/* Quick Challenge Arena Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Adaptive Challenge Arena</h3>
              <p className="text-xs text-slate-500 font-medium">
                Attempt targeted challenges scaled to your current mastery level to gather learning evidence.
              </p>
            </div>

            <button
              onClick={() => handleOpenQuest(nextQuest?.id || 'quest_fundamentals')}
              className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs rounded-2xl border border-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <span>Launch Quick Challenge (3 min)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </main>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: SKILL BREAKDOWN & EVIDENCE DETAILS MODAL */}
      {/* ------------------------------------------------------------------ */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                  Skill Breakdown
                </span>
                <h3 className="text-xl font-black text-slate-900">{selectedNode.title}</h3>
                <p className="text-xs text-slate-500">{selectedNode.description}</p>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Multi-Dimensional Competency Breakdown */}
            <div className="p-6 space-y-5">
              {/* Overall status + uncertainty callout */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 block">Overall Mastery</span>
                  <div className="text-2xl font-black text-slate-900">
                    {selectedNode.current_mastery !== null ? `${Math.round(selectedNode.current_mastery * 100)}%` : '⚪ Not Assessed'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 block">System Confidence</span>
                  <span className={`text-xs font-black uppercase ${selectedNode.confidence === 'HIGH' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedNode.confidence} ({selectedNode.evidence_count} interactions)
                  </span>
                </div>
              </div>

              {selectedNode.confidence === 'LOW' && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>We're still learning about your skill level. Complete a quest to build high-confidence evidence.</span>
                </div>
              )}

              {/* Competency 4-bar breakdown */}
              {selectedNode.current_mastery !== null && (
                <div className="space-y-3">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide block">Competency Dimensions</span>
                  
                  {[
                    { label: 'Concept Understanding', val: selectedNode.breakdown?.concept_understanding },
                    { label: 'Recall & Syntax', val: selectedNode.breakdown?.recall },
                    { label: 'Code Application', val: selectedNode.breakdown?.application },
                    { label: 'Independent Problem Solving', val: selectedNode.breakdown?.independent_problem_solving }
                  ].map((dim, idx) => {
                    const pct = Math.round((dim.val || 0) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600">{dim.label}</span>
                          <span className="text-slate-900">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Locked Notice */}
              {!selectedNode.is_unlocked && selectedNode.lock_reason && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Prerequisite Gate: {selectedNode.lock_reason}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedNode(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              {selectedNode.is_unlocked && (
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    handleOpenQuest(`quest_${selectedNode.skill_id}`);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Skill Quest</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: 5-STAGE QUEST PLAYER (UNDERSTAND -> IDENTIFY -> APPLY -> CHALLENGE -> DEMONSTRATE) */}
      {/* ------------------------------------------------------------------ */}
      {activeQuest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Player Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                    Stage {currentStageIdx + 1} of {activeQuest.stages.length}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{activeQuest.title}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  {activeQuest.stages[currentStageIdx].title}
                </h3>
              </div>
              <button 
                onClick={() => setActiveQuest(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${((currentStageIdx + 1) / activeQuest.stages.length) * 100}%` }}
              />
            </div>

            {/* Player Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {(() => {
                const stage = activeQuest.stages[currentStageIdx];
                return (
                  <div className="space-y-5">
                    {/* Companion Avatar */}
                    <div className="bg-gradient-to-r from-indigo-50/70 to-purple-50/40 p-3 rounded-2xl border border-indigo-100">
                      <GamifiedAvatar 
                        state={stageSelectedAnswer ? 'answering' : showHint ? 'thinking' : 'idle'}
                        size="sm"
                        compact={false}
                      />
                    </div>

                    {/* Prompt + TTS */}
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                        {stage.prompt}
                      </p>
                      <AudioButton text={stage.prompt} label="Read Question" className="shrink-0" />
                    </div>

                    {/* Syntax Code block if present */}
                    {stage.code_snippet && (
                      <div className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
                        <pre>{stage.code_snippet}</pre>
                      </div>
                    )}

                    {/* Single-choice options */}
                    <div className="space-y-2.5 pt-2">
                      <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block">
                        Select Demonstrated Answer:
                      </span>
                      {stage.options.map((opt, oIdx) => {
                        const isSelected = stageSelectedAnswer === opt;
                        return (
                          <button
                            key={oIdx}
                            onClick={() => setStageSelectedAnswer(opt)}
                            className={`w-full p-4 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-300 shadow-sm'
                                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Hint Ladder */}
                    {stage.hints && stage.hints.length > 0 && (
                      <div className="pt-2">
                        {!showHint ? (
                          <button
                            onClick={() => {
                              setShowHint(true);
                              setHintUsedForStage(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors"
                          >
                            <HelpCircle className="w-4 h-4" />
                            <span>Request Scaffold Hint</span>
                          </button>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                            💡 <strong>Hint:</strong> {stage.hints[0]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Player Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Stage {currentStageIdx + 1} of {activeQuest.stages.length}
              </span>
              <button
                disabled={!stageSelectedAnswer || submittingQuest}
                onClick={handleStageNext}
                className="px-6 py-2.5 rounded-2xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-2"
              >
                <span>{currentStageIdx < activeQuest.stages.length - 1 ? 'Next Stage' : 'Complete Quest'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 3: BEFORE -> AFTER LEARNING CELEBRATION MODAL */}
      {/* ------------------------------------------------------------------ */}
      {questResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <AnimatedFeedbackMessenger
              isCorrect={questResult.is_completed}
              feedbackMessage={
                questResult.is_completed
                  ? `Quest accomplished! Your mastery surged to ${Math.round(questResult.mastery_after * 100)}% (+${questResult.gain_percentage}% gain)!`
                  : `Good effort! Mastery is at ${Math.round(questResult.mastery_after * 100)}%. Every quest attempt strengthens your neural foundation!`
              }
              explanation={`Verified learning evidence: +${questResult.learning_xp_earned} Learning XP earned across ${questResult.stages_count} stages.`}
              onClose={() => setQuestResult(null)}
            />

            <div className="space-y-1">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-200">
                Learning Verification Complete
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                {questResult.is_completed ? '🎉 Demonstrated Knowledge Growth!' : 'Skill Still Developing'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Every percentage change represents verified learning evidence.
              </p>
            </div>

            {/* Before vs After Visual Bar */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-left">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">Demonstrated Mastery Comparison</span>

              {/* Before */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Before Quest</span>
                  <span>{questResult.mastery_before !== null ? `${Math.round(questResult.mastery_before * 100)}%` : '⚪ Not Assessed'}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400" style={{ width: `${(questResult.mastery_before || 0) * 100}%` }} />
                </div>
              </div>

              {/* After */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="flex items-center gap-1.5 text-indigo-600">
                    <TrendingUp className="w-4 h-4" /> After Quest
                  </span>
                  <span className="text-base font-black text-indigo-600">
                    {Math.round(questResult.mastery_after * 100)}% ({questResult.gain_percentage >= 0 ? `+${questResult.gain_percentage}%` : `${questResult.gain_percentage}%`})
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${questResult.mastery_after * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Evolution or Unlocked Gate Alert */}
            {questResult.evolution_changed && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-black text-emerald-800 flex items-center justify-center gap-2">
                <span>🌱 SKILL EVOLVED:</span>
                <span className="uppercase">{questResult.evolution_before} → {questResult.evolution_after}</span>
              </div>
            )}

            {questResult.unlocked_skills?.length > 0 && (
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-black text-indigo-900 space-y-1">
                <span className="block text-indigo-600">🔓 NEW SKILL UNLOCKED:</span>
                <span className="text-sm block">{questResult.unlocked_skills.join(', ')}</span>
              </div>
            )}

            {/* Learning XP Earned */}
            {questResult.learning_xp_earned > 0 && (
              <div className="text-xs font-black text-amber-600">
                +{questResult.learning_xp_earned} Learning XP Awarded
              </div>
            )}

            {/* Remedial Feedback if not completed */}
            {questResult.remedial_feedback && (
              <p className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
                {questResult.remedial_feedback}
              </p>
            )}

            <button
              onClick={() => setQuestResult(null)}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all"
            >
              Continue My Journey
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 4: 👑 OOP BOSS CHALLENGE MODAL */}
      {/* ------------------------------------------------------------------ */}
      {bossChallenge && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-200" />
                  <span className="text-xs font-black uppercase tracking-wider">Boss Arena</span>
                </div>
                <h3 className="text-xl font-black mt-1">{bossChallenge.title}</h3>
              </div>
              <button 
                onClick={() => setBossChallenge(null)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Boss Body: Scenarios */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {!bossResult ? (
                <>
                  {/* Boss Arena Companion */}
                  <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
                    <GamifiedAvatar 
                      state="thinking"
                      size="sm"
                      message="Synthesize your OOP powers to dispatch the fleet!"
                    />
                  </div>

                  <p className="text-xs text-slate-600 font-medium">
                    Solve all 3 architectural synthesis milestones to demonstrate comprehensive mastery and conquer the Galactic Fleet Dispatcher.
                  </p>

                  <div className="space-y-6">
                    {bossChallenge.scenarios.map((sc, sIdx) => (
                      <div key={sc.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-orange-700 uppercase tracking-wide">
                            {sc.title}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-800">{sc.prompt}</p>

                        <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
                          <pre>{sc.code_context}</pre>
                        </div>

                        <div className="space-y-2 pt-1">
                          {sc.options.map((opt, oIdx) => {
                            const isChosen = bossSubmissions[sc.id] === opt;
                            return (
                              <button
                                key={oIdx}
                                onClick={() => setBossSubmissions(prev => ({ ...prev, [sc.id]: opt }))}
                                className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                                  isChosen
                                    ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-300'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span>{opt}</span>
                                {isChosen && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Boss Result Screen */
                <div className="py-4 space-y-4">
                  <AnimatedFeedbackMessenger
                    isCorrect={bossResult.passed}
                    feedbackMessage={
                      bossResult.passed
                        ? `Boss Challenge CONQUERED! Solved ${bossResult.correct_scenarios} of ${bossResult.total_scenarios} synthesis milestones!`
                        : `Good effort! Solved ${bossResult.correct_scenarios} of ${bossResult.total_scenarios} synthesis milestones.`
                    }
                    explanation={`Awarded +${bossResult.xp_earned} Learning XP! Review the concept synthesis and tackle it again whenever you're ready.`}
                  />
                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-500 font-medium">
                      Demonstrated synthesis: {bossResult.correct_scenarios}/{bossResult.total_scenarios} milestones passed
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Reward: +150 Learning XP</span>
              {!bossResult ? (
                <button
                  disabled={Object.keys(bossSubmissions).length < bossChallenge.scenarios.length || submittingBoss}
                  onClick={submitBossChallenge}
                  className="px-6 py-2.5 rounded-2xl font-black text-xs text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                >
                  Submit Boss Challenge
                </button>
              ) : (
                <button
                  onClick={() => setBossChallenge(null)}
                  className="px-6 py-2.5 rounded-2xl font-black text-xs text-white bg-slate-900 hover:bg-slate-800 transition-all"
                >
                  Close Arena
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature 10: Skill Revival Modal (Non-punitive rapid restoration) */}
      <SkillRevivalModal
        skillId={revivalSkillId}
        isOpen={isRevivalOpen}
        onClose={() => setIsRevivalOpen(false)}
        onRevivalComplete={() => fetchUniverse()}
      />

      {/* Feature 11: Context-Aware AI Mentor Drawer */}
      <AIMentorDrawer
        isOpen={isMentorOpen}
        onClose={() => setIsMentorOpen(false)}
        currentSkill={activeNode}
        currentMastery={activeNode?.current_mastery}
        recentMistake={bossResult && !bossResult.passed ? "Method signature or return type mismatch" : null}
        currentQuest={activeQuest || universe?.next_quest}
      />

      {/* Feature 14: Inclusive Adaptive Learning (SDG 10) Modal */}
      <InclusiveAdaptiveModal
        isOpen={isAdaptiveModalOpen}
        onClose={() => setIsAdaptiveModalOpen(false)}
        onProfileUpdated={(updated) => setAdaptiveProfile(updated)}
      />

      <Footer />
    </div>
  );
};

export default SkillForgeMasteryPage;
