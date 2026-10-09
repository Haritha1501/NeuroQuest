import React, { useState } from 'react';
import {
  Compass, Target, Lock, Unlock, Sparkles, CheckCircle2, AlertCircle,
  HelpCircle, ArrowRight, ArrowDown, ZoomIn, ZoomOut, RotateCcw,
  Layers, Eye, Zap, TrendingUp, Shield, Award, Play, X, Check,
  GitBranch, Info, RefreshCw, Brain
} from 'lucide-react';
import AudioButton from '../common/AudioButton';

const NODE_STATE_STYLES = {
  MASTERED: {
    badge: '🟢 Mastered',
    dot: 'bg-emerald-500',
    border: 'border-emerald-400 hover:border-emerald-500',
    bg: 'bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50',
    bar: 'bg-emerald-500',
    text: 'text-emerald-900',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    ring: 'ring-emerald-400/40'
  },
  DEVELOPING: {
    badge: '🟡 Developing',
    dot: 'bg-amber-500',
    border: 'border-amber-400 hover:border-amber-500',
    bg: 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40',
    bar: 'bg-amber-500',
    text: 'text-amber-900',
    pill: 'bg-amber-100 text-amber-800 border-amber-300',
    ring: 'ring-amber-400/40'
  },
  NEEDS_PRACTICE: {
    badge: '🔴 Needs Practice',
    dot: 'bg-rose-500',
    border: 'border-rose-400 hover:border-rose-500',
    bg: 'bg-gradient-to-br from-rose-50/90 via-white to-orange-50/40',
    bar: 'bg-rose-500',
    text: 'text-rose-900',
    pill: 'bg-rose-100 text-rose-800 border-rose-300',
    ring: 'ring-rose-400/40'
  },
  CURRENT: {
    badge: '🔵 Current Focus',
    dot: 'bg-indigo-600',
    border: 'border-indigo-500 hover:border-indigo-600',
    bg: 'bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/60',
    bar: 'bg-indigo-600',
    text: 'text-indigo-950',
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    ring: 'ring-indigo-500/40'
  },
  NOT_ASSESSED: {
    badge: '⚪ Not Yet Assessed',
    dot: 'bg-slate-400',
    border: 'border-slate-300 hover:border-indigo-300 border-dashed',
    bg: 'bg-gradient-to-br from-slate-50 via-white to-slate-50/80',
    bar: 'bg-slate-300',
    text: 'text-slate-700',
    pill: 'bg-slate-100 text-slate-700 border-slate-300',
    ring: 'ring-slate-300/40'
  },
  LOCKED: {
    badge: '🔒 Locked',
    dot: 'bg-slate-400',
    border: 'border-slate-200 bg-slate-100/70',
    bg: 'bg-slate-100/80 opacity-85',
    bar: 'bg-slate-300',
    text: 'text-slate-500',
    pill: 'bg-slate-200/80 text-slate-600 border-slate-300',
    ring: 'ring-slate-200'
  }
};

const LEVEL_TITLES = {
  1: { title: 'Level 1 • Programming Root & Core Foundations', subtitle: 'Essential memory, variables, and execution flow' },
  2: { title: 'Level 2 • Building Blocks & Object-Oriented Pillars', subtitle: 'Modular functions, arrays, classes, and object blueprints' },
  3: { title: 'Level 3 • Class Hierarchies & Reuse', subtitle: 'Subclassing, inheritance trees, and method overriding' },
  4: { title: 'Level 4 • Advanced Architecture & Data Structures', subtitle: 'Dynamic dispatch, interface contracts, and generic collections' }
};

const DynamicSkillMap = ({
  skillMap,
  onStartQuest,
  lastMapChange = null,
  onDismissChange = null
}) => {
  // Mode: 'explore' ("Explore Skill Map") | 'focus' ("Smart Focus Mode")
  const [viewMode, setViewMode] = useState('explore');
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [stateFilter, setStateFilter] = useState('ALL');
  const [zoomScale, setZoomScale] = useState(1);
  const [showRelationships, setShowRelationships] = useState(true);

  if (!skillMap || !skillMap.nodes) {
    return null;
  }

  const nodes = skillMap.nodes || [];
  const edges = skillMap.edges || [];
  const focusPath = skillMap.focus_path || [];
  const candidates = skillMap.candidate_skills || [];
  const stats = skillMap.summary_stats || {};

  const nodeById = {};
  nodes.forEach((n) => {
    nodeById[n.skill_id] = n;
  });

  const youAreHereNode = nodeById[skillMap.you_are_here_node_id] || nodes[0];
  const nextRecommendedNode = nodeById[skillMap.next_recommended_node_id];
  const primaryGapNode = skillMap.primary_gap_node_id ? nodeById[skillMap.primary_gap_node_id] : null;
  const selectedNode = selectedSkillId ? nodeById[selectedSkillId] : null;

  // Group nodes by level (1..4) for structured multi-level graph rendering
  const levelsMap = { 1: [], 2: [], 3: [], 4: [] };
  nodes.forEach((n) => {
    if (stateFilter !== 'ALL' && n.node_state !== stateFilter) return;
    const lvl = n.level || 2;
    if (!levelsMap[lvl]) levelsMap[lvl] = [];
    levelsMap[lvl].push(n);
  });

  const handleZoomIn = () => setZoomScale((z) => Math.min(1.15, +(z + 0.08).toFixed(2)));
  const handleZoomOut = () => setZoomScale((z) => Math.max(0.85, +(z - 0.08).toFixed(2)));
  const handleZoomReset = () => setZoomScale(1);

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* LIVE EVOLUTION BANNER ("Your learning changed your Skill Map")       */}
      {/* ==================================================================== */}
      {lastMapChange && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Your learning changed your Skill Map!</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black">
              {lastMapChange.skillName}:{' '}
              <span className="opacity-80">
                {lastMapChange.beforePct !== null ? `${lastMapChange.beforePct}%` : 'Not Assessed'}
              </span>{' '}
              → <span className="text-amber-300">{lastMapChange.afterPct}%</span> ({lastMapChange.statusAfter})
            </h3>
            {lastMapChange.unlockedSkills && lastMapChange.unlockedSkills.length > 0 && (
              <p className="text-xs sm:text-sm font-bold text-emerald-100 flex items-center gap-1.5">
                <Unlock className="w-4 h-4 text-amber-300 shrink-0" />
                <span>New Path Unlocked: {lastMapChange.unlockedSkills.join(', ')}!</span>
              </p>
            )}
          </div>
          {onDismissChange && (
            <button
              onClick={onDismissChange}
              className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4 IMMEDIATE QUESTIONS OVERVIEW BAR                                   */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Q1: What do I already know? */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
              1. What I Already Know
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="my-2">
            <div className="text-xl font-black text-slate-900">
              {stats.mastered_count || 0} <span className="text-xs font-bold text-slate-500">of {stats.total_skills || nodes.length} Skills Proficient+</span>
            </div>
            <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
              {nodes.filter((n) => n.node_state === 'MASTERED').map((n) => n.short_name).join(', ') || 'Complete calibration or a quest to verify'}
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg self-start">
            🟢 Demonstrated Mastery
          </span>
        </div>

        {/* Q2: What am I currently learning? (YOU ARE HERE) */}
        <div
          onClick={() => youAreHereNode && setSelectedSkillId(youAreHereNode.skill_id)}
          className="bg-white rounded-2xl p-4 border-2 border-indigo-500/80 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-indigo-50/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
              2. 📍 You Are Here
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
              ACTIVE
            </span>
          </div>
          <div className="my-2">
            <div className="text-lg font-black text-slate-900 truncate">
              {youAreHereNode?.short_name || 'Java Fundamentals'}
            </div>
            <p className="text-xs text-indigo-700 font-bold mt-0.5">
              {youAreHereNode?.mastery_percentage !== null && youAreHereNode?.mastery_percentage !== undefined
                ? `Current: ${youAreHereNode.mastery_percentage}% → Goal: ${Math.round((youAreHereNode.target_mastery || 0.7) * 100)}%`
                : '⚪ Not Yet Assessed — Ready to start'}
            </p>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg self-start">
            🔵 Click to inspect or launch quest
          </span>
        </div>

        {/* Q3: Where are my knowledge gaps? */}
        <div
          onClick={() => primaryGapNode && setSelectedSkillId(primaryGapNode.skill_id)}
          className="bg-white rounded-2xl p-4 border border-rose-200/90 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-rose-50/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">
              3. Priority Skill Gap
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <div className="my-2">
            <div className="text-lg font-black text-slate-900 truncate">
              {primaryGapNode ? primaryGapNode.short_name : 'No Critical Gaps Detected'}
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {primaryGapNode
                ? `${primaryGapNode.mastery_percentage}% Mastery • Prioritized for review`
                : `${stats.not_assessed_count || 0} skills not yet assessed`}
            </p>
          </div>
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg self-start">
            {primaryGapNode ? '🔴 Focused Remediation Target' : '⚪ Explore unassessed nodes'}
          </span>
        </div>

        {/* Q4: What can I learn next? */}
        <div
          onClick={() => nextRecommendedNode && setSelectedSkillId(nextRecommendedNode.skill_id)}
          className="bg-white rounded-2xl p-4 border border-amber-300/90 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-amber-50/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
              4. ⭐ What to Learn Next
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-2">
            <div className="text-lg font-black text-slate-900 truncate">
              {nextRecommendedNode?.short_name || 'Polymorphism'}
            </div>
            <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
              {nextRecommendedNode?.is_unlocked
                ? 'Unlocked & Ready for Quest'
                : nextRecommendedNode?.why_locked || 'Unlocks after current goal'}
            </p>
          </div>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg self-start">
            ⭐ Next Best Skill Candidate
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODE SWITCHER & GRAPH CONTROLS BAR                                   */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Mode Toggle (Explore Mode vs Smart Focus Mode) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('explore')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              viewMode === 'explore'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>🗺️ Explore Skill Map ("Where can I go?")</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('focus')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              viewMode === 'focus'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>🎯 Smart Focus Mode ("Show me what I should focus on")</span>
          </button>
        </div>

        {/* Right: State Filter Pills & Zoom Controls (when in Explore mode) */}
        {viewMode === 'explore' && (
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'MASTERED', label: '🟢 Mastered' },
                { key: 'DEVELOPING', label: '🟡 Developing' },
                { key: 'NEEDS_PRACTICE', label: '🔴 Gap' },
                { key: 'NOT_ASSESSED', label: '⚪ Unassessed' },
                { key: 'LOCKED', label: '🔒 Locked' }
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStateFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all ${
                    stateFilter === f.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Zoom & Edge Toggle Controls */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setShowRelationships(!showRelationships)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                  showRelationships ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                }`}
                title="Toggle Prerequisite & Relationship Edges"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edges</span>
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-700 hover:bg-white"
                title="Reset Zoom"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* VIEW 1: SMART FOCUS MODE ("Show me what I should focus on")          */}
      {/* ==================================================================== */}
      {viewMode === 'focus' ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-8 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider border border-indigo-200">
                <Target className="w-3.5 h-3.5" />
                <span>Smart Focus Mode • Low Cognitive Load</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Your Streamlined Learning Path
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                All non-essential branches are hidden so you can focus strictly on your current skill, target milestone, and next unlock.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('explore')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors self-start"
            >
              Show Full Knowledge Graph
            </button>
          </div>

          {/* 4-Step Vertical Focus Chain */}
          <div className="max-w-2xl mx-auto space-y-3">
            {focusPath.map((step, idx) => {
              const isFirst = idx === 0;
              const isActionable = step.step_type === 'YOU_ARE_HERE' || step.step_type === 'TARGET_MILESTONE';
              const stepNode = nodeById[step.skill_id];

              return (
                <React.Fragment key={idx}>
                  <div
                    onClick={() => stepNode && setSelectedSkillId(stepNode.skill_id)}
                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${
                      isFirst
                        ? 'bg-gradient-to-r from-indigo-50 via-white to-violet-50 border-indigo-500 shadow-md'
                        : step.step_type === 'TARGET_MILESTONE'
                        ? 'bg-emerald-50/70 border-emerald-400 shadow-sm'
                        : step.step_type === 'NEXT_UNLOCK'
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-slate-50 border-slate-200 opacity-85'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-900 text-white">
                            {step.badge}
                          </span>
                          {step.mastery_percentage !== null && step.mastery_percentage !== undefined ? (
                            <span className="text-xs font-black text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                              Mastery: {step.mastery_percentage}% → Target: {step.target_percentage}%
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                              ⚪ Not Yet Assessed
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-black text-slate-900">{step.skill_name}</h4>
                        <p className="text-xs text-slate-600 font-medium">{step.summary}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActionable && step.quest_id && onStartQuest && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartQuest(step.quest_id);
                            }}
                            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>START QUEST</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar if assessed */}
                    {step.mastery_percentage !== null && step.mastery_percentage !== undefined && (
                      <div className="mt-3 w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${step.mastery_percentage}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {idx < focusPath.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                        <ArrowDown className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Next-Best-Skill Candidate Engine Readiness Breakdown */}
          {candidates.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  <span>Adaptive Decision Engine • Candidate Skill Ranking</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Ranked by Learning Value + Unlock Potential + Gap Priority
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {candidates.slice(0, 3).map((cand, idx) => (
                  <div
                    key={cand.skill_id}
                    onClick={() => setSelectedSkillId(cand.skill_id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      idx === 0
                        ? 'bg-indigo-50/50 border-indigo-300 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        Candidate #{idx + 1}
                      </span>
                      <span className="text-xs font-black text-indigo-600">
                        Score: {Math.round(cand.priority_score * 100)}
                      </span>
                    </div>
                    <h5 className="text-sm font-black text-slate-900">{cand.skill_name}</h5>
                    <p className="text-[11px] text-slate-600 font-medium mt-1 line-clamp-2">
                      {cand.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================================================================== */
        /* VIEW 2: EXPLORE SKILL MAP (MULTI-LEVEL LIVING KNOWLEDGE GRAPH)     */
        /* ================================================================== */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-sm space-y-6 overflow-x-auto">
          {/* Graph Header & Legend */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-black uppercase tracking-wider">
                  JAVA KNOWLEDGE GRAPH
                </span>
                <span className="text-xs font-bold text-slate-400">
                  • Click any skill node to inspect evidence, prerequisites & quests
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                Personal Skill Map — Living Knowledge State
              </h3>
            </div>

            {/* State Legend */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600">
              <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">🟢 Mastered</span>
              <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">🟡 Developing</span>
              <span className="px-2 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">🔴 Needs Practice</span>
              <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">📍 You Are Here</span>
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300">⚪ Not Yet Assessed</span>
              <span className="px-2 py-1 rounded-lg bg-slate-200/70 text-slate-600 border border-slate-300">🔒 Locked</span>
            </div>
          </div>

          {/* Multi-Level Graph Canvas */}
          <div
            className="space-y-6 transition-transform duration-200 origin-top"
            style={{ transform: `scale(${zoomScale})` }}
          >
            {[1, 2, 3, 4].map((lvl) => {
              const lvlNodes = levelsMap[lvl] || [];
              if (lvlNodes.length === 0) return null;
              const lvlMeta = LEVEL_TITLES[lvl];

              return (
                <React.Fragment key={lvl}>
                  <div className="space-y-3">
                    {/* Level Tier Header */}
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          {lvlMeta.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                        {lvlMeta.subtitle}
                      </span>
                    </div>

                    {/* Nodes Grid in this Level */}
                    <div
                      className={`grid gap-4 ${
                        lvlNodes.length === 1
                          ? 'grid-cols-1 max-w-md mx-auto'
                          : lvlNodes.length === 2
                          ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
                          : lvlNodes.length === 3
                          ? 'grid-cols-1 sm:grid-cols-3'
                          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      }`}
                    >
                      {lvlNodes.map((node) => {
                        const effectiveState = node.is_you_are_here && node.is_unlocked ? 'CURRENT' : node.node_state;
                        const st = NODE_STATE_STYLES[effectiveState] || NODE_STATE_STYLES.NOT_ASSESSED;
                        const isSelected = selectedSkillId === node.skill_id;

                        return (
                          <div
                            key={node.skill_id}
                            onClick={() => setSelectedSkillId(node.skill_id)}
                            className={`relative rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-sm hover:shadow-md ${
                              st.bg
                            } ${st.border} ${
                              isSelected ? 'ring-4 ring-indigo-500/30 -translate-y-0.5' : 'hover:-translate-y-0.5'
                            }`}
                          >
                            {/* Top Floating Callout Badges: YOU ARE HERE / NEXT / PRIMARY GAP */}
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${st.pill}`}>
                                {NODE_STATE_STYLES[node.node_state]?.badge || st.badge}
                              </span>

                              <div className="flex items-center gap-1">
                                {node.is_you_are_here && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-sm animate-pulse">
                                    📍 YOU ARE HERE
                                  </span>
                                )}
                                {!node.is_you_are_here && node.is_next_recommended && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm">
                                    ⭐ NEXT
                                  </span>
                                )}
                                {node.is_primary_gap && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                                    GAP
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Node Title & Evolution Stage */}
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-base font-black text-slate-900 leading-snug">
                                  {node.short_name}
                                </h4>
                                <span className="text-xs font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200/80 shrink-0">
                                  {node.evolution_label}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-1">
                                {node.description}
                              </p>
                            </div>

                            {/* Mastery Visualization (NEVER 0% for unassessed!) */}
                            <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                              {node.node_state === 'LOCKED' ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                    <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span>Locked — Prerequisite Gate</span>
                                  </div>
                                  <p className="text-[11px] text-rose-700 font-semibold leading-tight">
                                    {node.prerequisites
                                      .filter((p) => !p.is_met)
                                      .map((p) => `Requires ${p.skill_name} ≥ ${p.required_percentage}%`)
                                      .join(' • ') || node.why_locked}
                                  </p>
                                </div>
                              ) : node.mastery_percentage !== null && node.mastery_percentage !== undefined ? (
                                <>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-600">Demonstrated Mastery</span>
                                    <span className="font-black text-slate-900">{node.mastery_percentage}%</span>
                                  </div>
                                  <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${st.bar}`}
                                      style={{ width: `${node.mastery_percentage}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                    <span>Confidence: {node.confidence}</span>
                                    <span>{node.evidence_count} evidence pts</span>
                                  </div>
                                </>
                              ) : (
                                <div className="py-1 flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-slate-600">
                                    ⚪ Not Yet Assessed
                                  </span>
                                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                    Ready to calibrate/explore
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Outgoing Relationship Pills */}
                            {showRelationships && node.unlocks_skills && node.unlocks_skills.length > 0 && (
                              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 flex-wrap pt-1">
                                <span className="text-indigo-600">↓ Unlocks:</span>
                                <span>{node.unlocks_skills.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Directed Level Connector Arrows */}
                  {lvl < 4 && (
                    <div className="flex flex-col items-center justify-center py-1 text-slate-400">
                      <div className="h-4 w-0.5 bg-indigo-200" />
                      <div className="px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                        <ArrowDown className="w-3 h-3" />
                        <span>Prerequisite & Unlock Flow</span>
                      </div>
                      <div className="h-4 w-0.5 bg-indigo-200" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Explicit Graph Relationships Matrix (Prerequisite, Unlocks, Related, Part-of) */}
          {showRelationships && edges.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Active Knowledge Graph Connections ({edges.length} Skill Relationships)
              </span>
              <div className="flex flex-wrap gap-2">
                {edges.map((ed) => {
                  const src = nodeById[ed.source_skill_id]?.short_name || ed.source_skill_id;
                  const tgt = nodeById[ed.target_skill_id]?.short_name || ed.target_skill_id;
                  return (
                    <span
                      key={ed.id}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${
                        ed.is_satisfied
                          ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <span>{src}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-indigo-700">
                        {ed.relationship_type === 'related_to' ? '↔ related' : `→ ${ed.label}`}
                      </span>
                      <span>{tgt}</span>
                      {ed.required_mastery > 0 && (
                        <span>{ed.is_satisfied ? '✓' : '🔒'}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SKILL DETAIL PANEL / MODAL (SECTION 13 & 14)                         */}
      {/* ==================================================================== */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Detail Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    {selectedNode.category} • Level {selectedNode.level}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/15 text-white">
                    {selectedNode.evolution_label}
                  </span>
                  {selectedNode.is_you_are_here && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                      📍 YOU ARE HERE
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black tracking-tight">{selectedNode.name}</h3>
                <p className="text-xs text-slate-300 font-medium">{selectedNode.description}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSkillId(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detail Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* 1. Mastery & Confidence Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Mastery State
                    </span>
                    <div className="text-2xl font-black text-slate-900">
                      {selectedNode.mastery_percentage !== null && selectedNode.mastery_percentage !== undefined
                        ? `${selectedNode.mastery_percentage}% — ${selectedNode.mastery_status}`
                        : '⚪ Not Yet Assessed'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Confidence
                    </span>
                    <span
                      className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg inline-block mt-0.5 ${
                        selectedNode.confidence === 'HIGH'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedNode.confidence === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedNode.confidence} ({selectedNode.evidence_count} pts)
                    </span>
                  </div>
                </div>

                {selectedNode.mastery_percentage !== null && selectedNode.mastery_percentage !== undefined ? (
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${selectedNode.mastery_percentage}%` }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 font-medium bg-white p-3 rounded-xl border border-slate-200">
                    The system hasn't assessed this skill yet. Rather than assuming 0%, you can take a quick quest or calibration to demonstrate what you know!
                  </p>
                )}

                {selectedNode.refresh_recommended && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Refresh Recommended: It has been a while since you practiced this skill.</span>
                  </div>
                )}
              </div>

              {/* 2. LOCKED SKILL PREREQUISITE CHECKLIST (Section 6) */}
              {selectedNode.prerequisites && selectedNode.prerequisites.length > 0 && (
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    !selectedNode.is_unlocked
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      {!selectedNode.is_unlocked ? (
                        <>
                          <Lock className="w-4 h-4 text-rose-600" />
                          <span>🔒 This Skill Is Currently Locked — To Unlock:</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 text-emerald-600" />
                          <span>✓ Prerequisite Foundations Satisfied:</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedNode.prerequisites.map((p) => (
                      <div
                        key={p.skill_id}
                        className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80 text-xs"
                      >
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-black text-[11px] ${
                              p.is_met ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          >
                            {p.is_met ? '✓' : '✗'}
                          </span>
                          <span>
                            {p.skill_name} ≥ {p.required_percentage}%
                          </span>
                        </div>
                        <span
                          className={`font-black ${
                            p.is_met ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          Current:{' '}
                          {p.current_percentage !== null && p.current_percentage !== undefined
                            ? `${p.current_percentage}%`
                            : 'Not Assessed'}{' '}
                          {p.is_met ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. "WHY IS THIS HERE?" EXPLAINABILITY BOX (Section 14) */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {!selectedNode.is_unlocked
                        ? `Why is ${selectedNode.short_name} locked?`
                        : selectedNode.why_recommended
                        ? 'Why is this recommended?'
                        : 'Why is this skill in your map?'}
                    </span>
                  </span>
                  <AudioButton
                    text={selectedNode.why_locked || selectedNode.why_recommended || selectedNode.why_here}
                    label="Listen"
                  />
                </div>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {selectedNode.why_locked || selectedNode.why_recommended || selectedNode.why_here}
                </p>
              </div>

              {/* 4. VERIFIED EVIDENCE, STRENGTHS & NEEDS PRACTICE (Section 13 & 18) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Evidence */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                    Evidence
                  </span>
                  {selectedNode.evidence_items && selectedNode.evidence_items.length > 0 ? (
                    <ul className="space-y-1 text-xs font-semibold text-slate-700">
                      {selectedNode.evidence_items.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No assessment evidence recorded yet.</p>
                  )}
                </div>

                {/* Strengths */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                    Strengths
                  </span>
                  {selectedNode.strengths && selectedNode.strengths.length > 0 ? (
                    <ul className="space-y-1 text-xs font-semibold text-emerald-900">
                      {selectedNode.strengths.map((st, i) => (
                        <li key={i}>✓ {st}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Complete a quest to verify strengths.</p>
                  )}
                </div>

                {/* Needs Practice */}
                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 block">
                    Needs Practice
                  </span>
                  {selectedNode.needs_practice && selectedNode.needs_practice.length > 0 ? (
                    <ul className="space-y-1 text-xs font-semibold text-amber-950">
                      {selectedNode.needs_practice.map((gp, i) => (
                        <li key={i}>• {gp}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-700 font-semibold">✓ All core subskills strong!</p>
                  )}
                </div>
              </div>

              {/* 5. NEXT UNLOCKS & RELATED SKILLS */}
              {(selectedNode.unlocks_skills?.length > 0 || selectedNode.related_skills?.length > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  {selectedNode.unlocks_skills?.length > 0 && (
                    <div className="font-bold text-slate-700">
                      <span className="text-slate-400 uppercase text-[10px] mr-1.5">Next Unlocks:</span>
                      <span className="text-indigo-700">→ {selectedNode.unlocks_skills.join(', ')}</span>
                    </div>
                  )}
                  {selectedNode.related_skills?.length > 0 && (
                    <div className="font-bold text-slate-700">
                      <span className="text-slate-400 uppercase text-[10px] mr-1.5">Related:</span>
                      <span>↔ {selectedNode.related_skills.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detail Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedSkillId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>

              {selectedNode.is_unlocked && selectedNode.quest_id && onStartQuest ? (
                <button
                  type="button"
                  onClick={() => {
                    const qId = selectedNode.quest_id;
                    setSelectedSkillId(null);
                    onStartQuest(qId);
                  }}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START QUEST ({selectedNode.quest_title})</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  <span>Satisfy prerequisites above to unlock Quest</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicSkillMap;
