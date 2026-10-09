import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, Sparkles, CheckCircle2, AlertCircle, X, 
  HelpCircle, ShieldCheck, ArrowRight, BookOpen, Clock, Brain 
} from 'lucide-react';
import { getSkillRevivalAssessment, submitSkillRevival } from '../../services/api';

const SkillRevivalModal = ({ skillId, isOpen, onClose, onRevivalComplete }) => {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen && skillId) {
      loadAssessment();
    } else {
      setAssessment(null);
      setAnswers({});
      setCurrentIdx(0);
      setResult(null);
    }
  }, [isOpen, skillId]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      const res = await getSkillRevivalAssessment(skillId);
      setAssessment(res.data);
      setAnswers({});
      setCurrentIdx(0);
      setResult(null);
    } catch (err) {
      console.error('Failed to load skill revival assessment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await submitSkillRevival(skillId, answers);
      setResult(res.data);
      if (onRevivalComplete) {
        onRevivalComplete(res.data);
      }
    } catch (err) {
      console.error('Failed to submit revival:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const questions = assessment?.questions || [];
  const currentQ = questions[currentIdx];
  const allAnswered = questions.length > 0 && questions.every(q => answers[q.question_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Non-Punitive Skill Revival (Feature 10)
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black">
            {assessment?.skill_name || 'Skill Revival Check'}
          </h2>

          <p className="text-xs text-amber-100 font-medium mt-1">
            2-Minute Rapid Retention Check • Zero Penalties • Refreshes Memory Pathways
          </p>

          {/* Retention Stats Bar */}
          {assessment && (
            <div className="mt-4 grid grid-cols-3 gap-2 bg-black/15 rounded-2xl p-3 text-center border border-white/10">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-200 block">Previous Mastery</span>
                <span className="text-base font-black text-white">{Math.round(assessment.previous_mastery * 100)}%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-200 block">Est. Retention</span>
                <span className="text-base font-black text-amber-200">{Math.round(assessment.estimated_retention * 100)}%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-200 block">Inactive</span>
                <span className="text-base font-black text-white">{assessment.days_since_practice} days</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RotateCcw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <p className="text-sm font-bold text-slate-600">Generating targeted revival check...</p>
            </div>
          ) : result ? (
            /* Result Screen */
            <div className="space-y-6 text-center py-2 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 bg-amber-50 border border-amber-200">
                {result.recall_outcome === 'STRONG' ? '🌟' : result.recall_outcome === 'PARTIAL' ? '⚡' : '🌱'}
              </div>

              <div className="space-y-1">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  result.recall_outcome === 'STRONG' ? 'bg-emerald-100 text-emerald-800' :
                  result.recall_outcome === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {result.headline}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">{result.feedback_message}</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">{result.recommended_action}</p>
              </div>

              {/* Score Restoration Visualizer */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-sm mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Previous Mastery</span>
                  <span>Restored Mastery</span>
                </div>
                <div className="flex items-center justify-between text-xl font-black">
                  <span className="text-slate-400">{Math.round(result.previous_mastery * 100)}%</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-emerald-600">{Math.round(result.restored_mastery * 100)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.round(result.restored_mastery * 100)}%` }}
                  />
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all"
              >
                Continue Learning Journey
              </button>
            </div>
          ) : currentQ ? (
            /* Question Stepper */
            <div className="space-y-5">
              {/* Step indicator */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
                    {currentQ.title}
                  </span>
                  <span className="text-xs text-slate-400">({currentIdx + 1} of {questions.length})</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Type: {currentQ.type}
                </span>
              </div>

              {/* Prompt */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {currentQ.prompt}
                </h3>

                {currentQ.code_snippet && (
                  <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl text-xs font-mono overflow-x-auto border border-slate-800">
                    <code>{currentQ.code_snippet}</code>
                  </pre>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = answers[currentQ.question_id] === opt;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectOption(currentQ.question_id, opt)}
                      className={`w-full p-3.5 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-400/20' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                          isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {currentIdx < questions.length - 1 ? (
                    <button
                      disabled={!answers[currentQ.question_id]}
                      onClick={() => setCurrentIdx(prev => prev + 1)}
                      className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled={!allAnswered || submitting}
                      onClick={handleSubmit}
                      className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      {submitting ? (
                        <span>Evaluating...</span>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Submit & Restore Mastery</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-500 text-xs py-8">No questions found for this skill.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillRevivalModal;
