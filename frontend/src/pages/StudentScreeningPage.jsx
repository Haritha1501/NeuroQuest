import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, CheckCircle2, ChevronRight, ChevronLeft, Save, 
  Sparkles, Info, HelpCircle, BookOpen, Clock, AlertTriangle, ArrowRight, Database
} from 'lucide-react';
import { 
  getStudentQuestionnaire, 
  saveStudentQuestionnaireDraft, 
  completeStudentQuestionnaire,
  getStudents
} from '../services/api';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AudioButton from '../components/common/AudioButton';

const StudentScreeningPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schema, setSchema] = useState(null);
  const [student, setStudent] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [draftStatus, setDraftStatus] = useState('');
  const [error, setError] = useState('');

  // Auto-save debounce ref
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    fetchQuestionnaire();
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [studentId]);

  const fetchQuestionnaire = async () => {
    try {
      setLoading(true);
      const res = await getStudentQuestionnaire(studentId);
      const { schema: qSchema, student: qStudent, draft } = res.data;

      setSchema(qSchema);
      setStudent(qStudent);

      // Initialize answers from draft or defaults
      let initialAnswers = {};
      if (draft && draft.responses && Object.keys(draft.responses).length > 0) {
        initialAnswers = { ...draft.responses };
        const draftStep = Math.min(
          Math.max(draft.current_question - 1, 0),
          (qSchema.questions?.length || 20) - 1
        );
        setCurrentIndex(draftStep);
        setDraftStatus('Loaded saved draft');
      } else {
        // Pre-fill with reasonable non-diagnostic defaults from schema
        qSchema.questions.forEach(q => {
          if (q.default) {
            initialAnswers[q.id] = q.default;
          }
        });
      }

      setAnswers(initialAnswers);
    } catch (err) {
      console.error('Failed to load student questionnaire:', err);
      // Attempt auto-recovery: fetch registered students for this caregiver
      try {
        const studListRes = await getStudents();
        const list = studListRes.data || [];
        if (list.length > 0) {
          const target = list.find(s => s.id === studentId) || list[0];
          if (target && target.id !== studentId) {
            navigate(`/student-screening/${target.id}`, { replace: true });
            return;
          }
        }
      } catch (recoveryErr) {
        console.warn('Auto-recovery student lookup notice:', recoveryErr);
      }
      setError('Could not load questionnaire. Please verify your caretaker session or select a student from the dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, option) => {
    const updated = { ...answers, [questionId]: option };
    setAnswers(updated);

    // Trigger draft auto-save
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setDraftStatus('Saving draft...');
    
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await saveStudentQuestionnaireDraft(studentId, {
          responses: updated,
          current_question: currentIndex + 1
        });
        setDraftStatus('Draft auto-saved');
      } catch (e) {
        console.warn('Background draft auto-save notice:', e);
        setDraftStatus('');
      }
    }, 600);
  };

  const handleManualSave = async () => {
    try {
      setDraftStatus('Saving...');
      await saveStudentQuestionnaireDraft(studentId, {
        responses: answers,
        current_question: currentIndex + 1
      });
      setDraftStatus('Draft saved successfully');
    } catch (e) {
      console.error('Manual draft save error:', e);
      setDraftStatus('Failed to save draft');
    }
  };

  const handleNext = () => {
    if (currentIndex < (schema?.questions?.length || 20) - 1) {
      setCurrentIndex(prev => prev + 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleComplete = async () => {
    setError('');
    const questions = schema?.questions || [];
    
    // Check if all answered
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(`Please provide responses for all questions (${unanswered.length} remaining).`);
      // Jump to first unanswered
      const firstUnansweredIdx = questions.findIndex(q => !answers[q.id]);
      if (firstUnansweredIdx !== -1) {
        setCurrentIndex(firstUnansweredIdx);
      }
      return;
    }

    setSubmitting(true);

    try {
      await completeStudentQuestionnaire(studentId, { responses: answers });
      // Navigate to the Baseline Support Profile Result page
      navigate(`/student-profile/${studentId}`);
    } catch (err) {
      console.error('Failed to complete questionnaire:', err);
      const msg = err.response?.data?.detail || err.message || 'Submission failed. Please try again.';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-semibold text-sm">Preparing Baseline Assessment Questionnaire...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!schema || !schema.questions || schema.questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 w-full text-center space-y-6">
          <div className="p-8 bg-white rounded-3xl border border-slate-200/90 shadow-md space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Student Assessment Unavailable</h2>
            <p className="text-sm text-slate-600 font-medium">
              {error || "Could not load questionnaire for this student ID. Please check your caregiver dashboard."}
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => fetchQuestionnaire()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Retry Loading
              </button>
              <button
                onClick={() => navigate('/caregiver')}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
              >
                Return to Caregiver Dashboard
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  const questions = schema?.questions || [];
  const currentQuestion = questions[currentIndex] || {};
  const totalQuestions = questions.length || 20;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const studentFirstName = student?.first_name || student?.name || 'Student';
  const currentSelectedValue = answers[currentQuestion.id];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Personalized Learning Profile • Non-Diagnostic
                </span>
                {draftStatus && (
                  <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {draftStatus}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {studentFirstName}'s Learning Support & Personalization
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                {student?.grade} • Age {student?.age} • Quick Caretaker Setup
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleManualSave}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-slate-200"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => navigate('/caregiver')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl transition-all"
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* Progress Bar & Question Counter */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Question {currentIndex + 1} of {totalQuestions}</span>
              <span className="text-indigo-600">{progressPercent}% Completed</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question Fast-Jump Grid */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                      : isAnswered
                      ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                  title={`Question ${idx + 1}: ${q.category || ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Question Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-9 space-y-7 transition-all">
          {/* Category Badge & Audio Read-Aloud */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100/90 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                {currentQuestion.category || 'Learning Preference'}
              </span>
            </div>

            <AudioButton
              text={`Question ${currentIndex + 1}. ${currentQuestion.prompt}. ${currentQuestion.personalization_impact ? `How this helps: ${currentQuestion.personalization_impact}` : ''}`}
              label="Listen Question"
            />
          </div>

          {/* Question Prompt & Personalization Impact */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {currentQuestion.prompt}
            </h2>
            {currentQuestion.personalization_impact && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-indigo-900">How this personalizes the app: </span>
                  <span className="text-indigo-800 font-medium">{currentQuestion.personalization_impact}</span>
                </div>
              </div>
            )}
            <p className="text-slate-500 text-xs sm:text-sm">
              Choose the option that best matches what works best for your student.
            </p>
          </div>

          {/* Options Grid */}
          <div className="space-y-3">
            {currentQuestion.options?.map((opt, optIdx) => {
              const isSelected = currentSelectedValue === opt;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(currentQuestion.id, opt)}
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 group ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <span className={`text-sm sm:text-base font-semibold ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                    {opt}
                  </span>
                  
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-600 text-white' 
                      : 'border-slate-300 group-hover:border-indigo-400'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation Bar */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className="px-7 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Computing Baseline...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Baseline Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Non-Diagnostic Disclaimer Card */}
        <div className="bg-slate-100/90 rounded-2xl p-4 sm:p-5 border border-slate-200 text-xs text-slate-500 leading-relaxed space-y-1">
          <p className="font-bold text-slate-700">Non-Diagnostic Research & Personalization Guarantee:</p>
          <p>
            {schema?.disclaimer || 
              "This questionnaire is designed solely for educational personalization and baseline support planning. It is strictly non-diagnostic and does NOT evaluate, diagnose, or infer any medical condition."}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StudentScreeningPage;
