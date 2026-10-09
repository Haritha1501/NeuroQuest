import React from 'react';
import { 
  Target, Sparkles, CheckCircle2, AlertTriangle, Unlock, 
  Clock, ArrowRight, Play, RotateCcw, Brain, ShieldCheck, 
  ChevronRight, Compass 
} from 'lucide-react';

const NextBestSkillHero = ({ 
  recommendation, 
  onStartQuest, 
  onOpenRevival, 
  onSelectAlternative, 
  loading 
}) => {
  if (loading && !recommendation) {
    return (
      <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-slate-800 rounded w-1/2 mb-3"></div>
        <div className="h-4 bg-slate-800 rounded w-3/4"></div>
      </div>
    );
  }

  if (!recommendation) return null;

  const isRevival = recommendation.reason_codes?.includes('KNOWLEDGE_DECAY') || 
                    recommendation.reason_codes?.includes('RETENTION_REFRESH') ||
                    recommendation.quest_id?.startsWith('revival_');

  const confidenceColor = 
    recommendation.recommendation_confidence === 'HIGH' 
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
      : recommendation.recommendation_confidence === 'MEDIUM'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

  return (
    <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-900/40 relative overflow-hidden space-y-6">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Top Meta Bar: Badge, Confidence, Difficulty */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-indigo-900/50 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            What Should I Learn Next?
          </span>

          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${confidenceColor} flex items-center gap-1`}>
            <ShieldCheck className="w-3 h-3" />
            {recommendation.recommendation_confidence} CONFIDENCE
          </span>

          {recommendation.current_mastery !== null && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-800 text-slate-300 border border-slate-700">
              Current: {Math.round(recommendation.current_mastery * 100)}% Mastery
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            ~{recommendation.estimated_minutes} mins
          </span>
          <span>•</span>
          <span className="uppercase text-slate-300 font-bold tracking-wider">
            {recommendation.difficulty}
          </span>
        </div>
      </div>

      {/* Main Content Area: Title + Explanation Checklist + Action CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-center">
        {/* Left Column: Title & Explanation Checklist (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Recommended Skill: {recommendation.skill_name}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {recommendation.quest_title}
            </h2>
          </div>

          {/* Explainability Checklist (Why are we recommending this?) */}
          <div className="bg-slate-900/90 border border-indigo-950 rounded-2xl p-4 space-y-2 backdrop-blur-sm">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              Why are we recommending this?
            </span>
            <div className="space-y-1.5">
              {recommendation.why_reasons && recommendation.why_reasons.length > 0 ? (
                recommendation.why_reasons.map((reason, idx) => {
                  const isWarning = reason.includes('⚠') || reason.toLowerCase().includes('gap') || reason.toLowerCase().includes('decay');
                  const isUnlock = reason.includes('🔓') || reason.toLowerCase().includes('unlock');
                  return (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                      {isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : isUnlock ? (
                        <Unlock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{reason}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Optimized for your current progression curve and prerequisite readiness.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Big Primary CTA Button (4 cols) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-3 bg-indigo-950/40 p-5 rounded-2xl border border-indigo-800/40 text-center">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isRevival ? 'Retention Check' : 'Next Learning Quest'}
            </span>
            <div className="text-lg font-black text-amber-400">
              {isRevival ? 'Restore Retention (0% Penalty)' : '+150 Learning XP'}
            </div>
          </div>

          {isRevival ? (
            <button
              onClick={() => onOpenRevival(recommendation.skill_id)}
              className="w-full py-4 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start 2-Min Revival Check</span>
            </button>
          ) : (
            <button
              onClick={() => onStartQuest(recommendation.quest_id)}
              className="w-full py-4 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Next Quest</span>
            </button>
          )}

          <span className="text-[10px] text-slate-400 font-medium">
            {isRevival ? 'Quick 3-question recall • Maintains streak' : 'Target competency: demonstrated mastery ≥ 70%'}
          </span>
        </div>
      </div>

      {/* Alternative Learning Paths Section */}
      {recommendation.alternative_paths && recommendation.alternative_paths.length > 0 && (
        <div className="pt-4 border-t border-indigo-950/70 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              Alternative Learning Paths (Choose your focus):
            </span>
            <span className="text-[10px] text-slate-500 italic">
              You are never forced into a single locked path
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommendation.alternative_paths.map((alt) => (
              <div
                key={alt.skill_id}
                onClick={() => onSelectAlternative && onSelectAlternative(alt)}
                className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3.5 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">
                      {alt.skill_name}
                    </span>
                    {alt.current_mastery !== null && (
                      <span className="text-[10px] font-bold text-slate-400">
                        ({Math.round(alt.current_mastery * 100)}%)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{alt.reason}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NextBestSkillHero;
