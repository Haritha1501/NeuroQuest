import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Brain, Clock, Target, Compass, CheckCircle2, 
  HelpCircle, ArrowRight, RotateCcw, AlertTriangle, ShieldCheck,
  ChevronRight, Play, BookOpen, Layers, Lightbulb, Code2, Zap
} from 'lucide-react';
import { 
  getCalibrationStatus, 
  startCalibration, 
  submitCalibrationAnswer, 
  recalibrateSkills 
} from '../services/api';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AudioButton from '../components/common/AudioButton';

const CONFIDENCE_OPTIONS = [
  { value: 0.3, label: 'Not sure', emoji: '😕' },
  { value: 0.6, label: 'Somewhat confident', emoji: '🙂' },
  { value: 0.9, label: 'Very confident', emoji: '😎' }
];

const SkillForgeCalibrationPage = () => {
  const navigate = useNavigate();

  // Step state: 'intro' | 'diagnostic' | 'result'
  const [step, setStep] = useState('intro');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Diagnostic session state
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(4);
  const [selectedOption, setSelectedOption] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Time tracking
  const questionStartTimeRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Final Profile result
  const [skillProfile, setSkillProfile] = useState(null);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  // Timer loop for question hesitation/response time
  useEffect(() => {
    if (step !== 'diagnostic') return;
    questionStartTimeRef.current = Date.now();
    setElapsedSeconds(0);

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - questionStartTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion?.id, step]);

  const checkInitialStatus = async () => {
    try {
      setLoading(true);
      const res = await getCalibrationStatus();
      const statusData = res.data;

      if (statusData.calibration_completed && statusData.last_profile) {
        setSkillProfile(statusData.last_profile);
        setStep('result');
      } else if (statusData.session_id) {
        // Resume in-progress session
        await handleResumeSession();
      } else {
        setStep('intro');
      }
    } catch (err) {
      console.warn('Calibration status lookup notice:', err);
      setStep('intro');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCalibration = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await startCalibration();
      const data = res.data;

      if (data.completed && data.profile) {
        setSkillProfile(data.profile);
        setStep('result');
        return;
      }

      setSessionId(data.session_id);
      setCurrentQuestion(data.question);
      setQuestionNumber(data.question_number || 1);
      setTotalQuestions(data.total_target_questions || 4);
      setSelectedOption('');
      setShowHint(false);
      setHintUsed(false);
      setConfidence(null);
      setFeedback(null);
      setStep('diagnostic');
    } catch (err) {
      console.error('Failed to start calibration:', err);
      setError('Could not start calibration. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSession = async () => {
    try {
      const res = await startCalibration();
      const data = res.data;
      if (data.completed && data.profile) {
        setSkillProfile(data.profile);
        setStep('result');
      } else {
        setSessionId(data.session_id);
        setCurrentQuestion(data.question);
        setQuestionNumber(data.question_number || 1);
        setTotalQuestions(data.total_target_questions || 4);
        setStep('diagnostic');
      }
    } catch (err) {
      console.warn('Resume error:', err);
      setStep('intro');
    }
  };

  const handleSelectAnswer = (option) => {
    setSelectedOption(option);
  };

  const handleToggleHint = () => {
    setShowHint(prev => !prev);
    setHintUsed(true);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption) return;

    try {
      setSubmitting(true);
      setError('');

      const responseTime = Math.max(1, (Date.now() - questionStartTimeRef.current) / 1000);

      const payload = {
        session_id: sessionId,
        question_id: currentQuestion.id,
        selected_answer: selectedOption,
        response_time_seconds: parseFloat(responseTime.toFixed(1)),
        attempt_count: 1,
        hint_used: hintUsed,
        confidence_level: confidence,
        hesitation_seconds: Math.min(responseTime, 3.0)
      };

      const res = await submitCalibrationAnswer(payload);
      const data = res.data;

      if (data.completed) {
        setSkillProfile(data.profile);
        setStep('result');
      } else {
        // Advance to next question
        setCurrentQuestion(data.next_question);
        setQuestionNumber(data.question_number);
        setTotalQuestions(data.total_target_questions);
        setSelectedOption('');
        setShowHint(false);
        setHintUsed(false);
        setConfidence(null);
        window.scrollTo({ top: 100, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Could not record your answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalibrate = async () => {
    try {
      setLoading(true);
      await recalibrateSkills();
      setSkillProfile(null);
      setSessionId(null);
      setStep('intro');
    } catch (err) {
      console.error('Recalibrate error:', err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-semibold text-sm">Preparing SkillForge Calibration...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SCREEN 1 — INTRODUCTION
  // --------------------------------------------------------------------------
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full flex flex-col justify-center">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8 text-center relative overflow-hidden">
            
            {/* Top decorative badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-extrabold text-indigo-700 mx-auto tracking-wide uppercase">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              SkillForge Calibration • Adaptive Diagnostic
            </div>

            {/* Header Title & Subtitle */}
            <div className="space-y-3 max-w-xl mx-auto">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight flex items-center justify-center gap-2.5">
                <span>🧠</span>
                <span>Let's discover your current skills</span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                You don't need to take a long test. We'll ask you a few smart questions and use your answers to understand where you are right now.
              </p>
            </div>

            {/* Value Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left max-w-lg mx-auto">
              <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-start gap-3">
                <span className="text-xl">⏱</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">About 3 minutes</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Quick and light, respects your time</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-start gap-3">
                <span className="text-xl">🧩</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">3–5 adaptive questions</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Adapts live to what you know</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-start gap-3">
                <span className="text-xl">🎯</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">No pass or fail</h4>
                  <p className="text-[11px] text-slate-500 font-medium">There are no wrong starting points</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-start gap-3">
                <span className="text-xl">✨</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Personalized learning path</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Unlocks your custom quest map</p>
                </div>
              </div>
            </div>

            {/* Encouraging Quote */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl max-w-md mx-auto text-xs text-amber-900 font-semibold flex items-center justify-center gap-2">
              <Compass className="w-4 h-4 text-amber-600 shrink-0" />
              <span>"There are no wrong starting points. Every explorer begins somewhere."</span>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartCalibration}
                className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 mx-auto"
              >
                <span>START CALIBRATION</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SCREEN 2 — ADAPTIVE QUESTION PLAYER
  // --------------------------------------------------------------------------
  if (step === 'diagnostic') {
    const progressPercent = Math.round((questionNumber / totalQuestions) * 100);

    return (
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
          
          {/* Quest Progress Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  QUEST 01 • Discover Your Skills
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Question {questionNumber} of {totalQuestions}
                </span>
              </div>

              <div className="text-xs font-bold text-slate-500">
                ⏱ {elapsedSeconds}s
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Active Question Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* Metadata Badges & Audio read-aloud */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold">
                  {currentQuestion?.skill || 'Programming'}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold">
                  {currentQuestion?.subskill || 'Concept'}
                </span>
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-lg text-[11px] font-bold">
                  Level {currentQuestion?.difficulty || 1}
                </span>
              </div>

              <AudioButton 
                text={`Question ${questionNumber}: ${currentQuestion?.prompt || ''}.`}
                label="Listen"
              />
            </div>

            {/* Question Prompt */}
            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {currentQuestion?.prompt}
              </h2>

              {/* Code Snippet if present */}
              {currentQuestion?.code_snippet && (
                <div className="rounded-2xl bg-slate-900 text-slate-100 p-4 font-mono text-xs sm:text-sm overflow-x-auto shadow-inner border border-slate-800">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                      Code Snippet
                    </span>
                    <span>Java</span>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed">{currentQuestion.code_snippet}</pre>
                </div>
              )}
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              {currentQuestion?.options?.map((option, idx) => {
                const isSelected = selectedOption === option;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAnswer(option)}
                    className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-sm ring-2 ring-indigo-600/20'
                        : 'border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50/80 text-slate-800'
                    }`}
                  >
                    <span className="leading-relaxed">{option}</span>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional Hint Button */}
            {currentQuestion?.hint && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleToggleHint}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 transition-colors"
                >
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>{showHint ? 'Hide Clue' : 'Need a small clue?'}</span>
                </button>

                {showHint && (
                  <div className="mt-2.5 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 leading-relaxed animate-fadeIn">
                    <span className="font-extrabold">Clue: </span>
                    {currentQuestion.hint}
                  </div>
                )}
              </div>
            )}

            {/* Optional Confidence Input */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-500">How confident are you? (Optional):</span>
              <div className="flex items-center gap-2">
                {CONFIDENCE_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setConfidence(c.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      confidence === c.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error notification if submit fails */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Next / Submit Button */}
            <div className="pt-3 flex justify-end">
              <button
                type="button"
                disabled={!selectedOption || submitting}
                onClick={handleSubmitAnswer}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Evaluating your insight...</span>
                ) : (
                  <>
                    <span>Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SCREEN 3 — RESULT SCREEN ("Your Skill Map is Ready!")
  // --------------------------------------------------------------------------
  if (step === 'result' && skillProfile) {
    const skillsList = Object.values(skillProfile.skills || {});
    const rec = skillProfile.recommended_starting_point;

    const getStatusBadge = (item) => {
      if (item.status === 'NOT_ASSESSED') {
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Not Yet Assessed
          </span>
        );
      }
      switch (item.mastery_level) {
        case 'Strong':
          return (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Strong
            </span>
          );
        case 'Proficient':
          return (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Proficient
            </span>
          );
        case 'Developing':
          return (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Developing
            </span>
          );
        default:
          return (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Needs Practice
            </span>
          );
      }
    };

    return (
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
        <Navbar />

        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
          
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-3 text-center">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-extrabold uppercase tracking-wide mx-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              SkillForge Calibration Complete
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Your Skill Map is Ready!
            </h1>
            <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
              Based on your answers, we've mapped your current strengths and growth opportunities.
            </p>
          </div>

          {/* Skill Map Profile */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>🌱</span>
                <span>Your Current Learning Profile</span>
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {skillProfile.total_questions_answered} questions calibrated
              </span>
            </div>

            <div className="space-y-4">
              {skillsList.map((item) => {
                const isAssessed = item.status === 'ASSESSED';
                const percent = isAssessed ? Math.round(item.mastery_score * 100) : null;

                return (
                  <div 
                    key={item.skill_name}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/70 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-1 sm:max-w-xs">
                      <div className="font-extrabold text-sm text-slate-900">
                        {item.skill_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {isAssessed ? `Confidence: ${item.evidence_level}` : 'Not assessed during this quick diagnostic'}
                      </div>
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="flex items-center gap-4 flex-1 sm:justify-end">
                      {isAssessed ? (
                        <div className="w-36 h-2.5 bg-slate-200/70 rounded-full overflow-hidden border border-slate-200 shrink-0">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      ) : (
                        <div className="w-36 text-center text-xs font-semibold text-slate-400 shrink-0">
                          —
                        </div>
                      )}

                      <div className="w-32 text-right">
                        {getStatusBadge(item)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What We Discovered Insights */}
          {skillProfile.discovered_insights?.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                What we discovered
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {skillProfile.discovered_insights.map((insight, idx) => (
                  <div key={idx} className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs sm:text-sm text-indigo-950 font-medium flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Starting Point Card */}
          {rec && (
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-7 sm:p-9 text-white shadow-xl space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                  Recommended Starting Point
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <Target className="w-6 h-6 text-amber-400" />
                  {rec.quest_title}
                </h2>
              </div>

              {/* Reasons list */}
              {rec.why?.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-indigo-800/60">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">Why this quest?</div>
                  <ul className="space-y-1.5">
                    {rec.why.map((reason, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-slate-200 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate('/skill-map')}
                    className="w-full sm:w-auto px-7 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Compass className="w-4 h-4" />
                    <span>OPEN MY DYNAMIC SKILL MAP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/home')}
                    className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-extrabold text-sm rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Dashboard</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRecalibrate}
                  className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Recalibrate my skills</span>
                </button>
              </div>
            </div>
          )}

        </main>

        <Footer />
      </div>
    );
  }

  return null;
};

export default SkillForgeCalibrationPage;
