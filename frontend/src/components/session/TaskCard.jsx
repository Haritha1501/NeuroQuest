import React, { useState } from 'react';
import { Sparkles, HelpCircle, CheckCircle2, XCircle, RefreshCw, ArrowRight, Lightbulb, Volume2 } from 'lucide-react';
import AudioButton from '../common/AudioButton';
import GamifiedAvatar from '../common/GamifiedAvatar';
import AnimatedFeedbackMessenger from '../common/AnimatedFeedbackMessenger';
import { useTheme } from '../../context/ThemeContext';
import { getAIExplanation } from '../../services/api';

const TaskCard = ({ task, onAnswerSubmit, loading }) => {
  const { primaryColor, profile } = useTheme();
  
  const [selectedOption, setSelectedOption] = useState('');
  const [activeHintIndex, setActiveHintIndex] = useState(null);
  const [aiHint, setAiHint] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [avatarState, setAvatarState] = useState('idle');
  const [avatarMessage, setAvatarMessage] = useState(null);

  React.useEffect(() => {
    setSelectedOption('');
    setActiveHintIndex(null);
    setAiHint('');
    setFeedback(null);
    setAvatarState('idle');
    setAvatarMessage(null);
  }, [task?.id]);

  if (!task) return null;

  const handleOptionSelect = (opt) => {
    if (feedback) return; // locked after submission until next
    setSelectedOption(opt);
    setAvatarState('answering');
    setAvatarMessage(`Selected: "${opt}". Ready to submit?`);
  };

  const handleSubmit = async () => {
    if (!selectedOption) return;
    const res = await onAnswerSubmit(selectedOption);
    setFeedback(res);
    if (res?.is_correct) {
      setAvatarState('correct');
      setAvatarMessage("Spot on! Your brain just mastered this concept!");
    } else {
      setAvatarState('wrong');
      setAvatarMessage("Great attempt! Mistakes help our neurons grow — check the guide below!");
    }
  };

  const handleFetchAiHint = async () => {
    setLoadingAi(true);
    setAvatarState('thinking');
    setAvatarMessage("Pondering the clues... analyzing the concept!");
    try {
      const interests = profile?.interests || ['Space', 'Animals'];
      const res = await getAIExplanation({
        question: task.question,
        correct_answer: task.correct_answer,
        learner_interests: interests,
        guidance_level: profile?.interaction_preferences?.guidance_level || 'high'
      });
      setAiHint(res.data.explanation);
    } catch (err) {
      console.error('Failed to get AI explanation:', err);
      setAiHint('Focus on the main clue in the question! You can do this!');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-6 transition-all">
      
      {/* Task Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {task.subject}
          </span>
          {task.standard && (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80">
              NCERT {task.standard} {task.chapter ? `• ${task.chapter}` : ''}
            </span>
          )}
          <span className="text-xs font-semibold text-slate-500">
            Difficulty {task.difficulty}/5 • ~{task.estimated_duration} mins
          </span>
        </div>

        <AudioButton text={`${task.title}. Question: ${task.question}`} label="Read Question" />
      </div>

      {/* Gamified Learning Companion Avatar */}
      <div className="bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-slate-50 p-3 sm:p-3.5 rounded-2xl border border-indigo-100/70">
        <GamifiedAvatar 
          state={avatarState} 
          message={avatarMessage} 
          size="md"
        />
      </div>

      {/* Question Title & Prompt */}
      <div className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          {task.title}
        </h2>
        <p className="text-slate-800 text-base sm:text-lg font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
          {task.question}
        </p>
      </div>

      {/* Step-by-Step Guide if present */}
      {((task.steps && task.steps.length > 0) || (task.scaffold_steps && task.scaffold_steps.length > 0)) && (
        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2">
          <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Step-by-Step Guided Helper
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {((task.steps && task.steps.length > 0) ? task.steps : task.scaffold_steps).map((step, idx) => {
              const isObj = typeof step === 'object' && step !== null;
              const stepNum = isObj ? (step.step_number || idx + 1) : (idx + 1);
              const title = isObj ? step.title : (step.includes(':') ? step.split(':')[0].trim() : `Step ${stepNum}`);
              const desc = isObj ? step.description : (step.includes(':') ? step.split(':').slice(1).join(':').trim() : step);
              return (
                <div key={idx} className="bg-white p-3 rounded-xl border border-indigo-100/80 text-xs">
                  <span className="font-bold text-indigo-600">{title}:</span>{' '}
                  <span className="text-slate-600">{desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Options Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {task.options.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          const isTargetCorrect = feedback && (
            opt.trim().toLowerCase() === (feedback.correct_answer || task.correct_answer || '').trim().toLowerCase()
          );

          let buttonClasses = 'p-4 rounded-2xl text-left font-bold text-sm sm:text-base border-2 transition-all flex items-center justify-between ';
          let icon = null;
          let badge = null;

          if (!feedback) {
            // Before submission
            if (isSelected) {
              buttonClasses += 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-md ring-2 ring-indigo-400';
              icon = <CheckCircle2 className="w-5 h-5 text-indigo-600 fill-indigo-100 shrink-0" />;
            } else {
              buttonClasses += 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800';
            }
          } else {
            // After submission
            if (feedback.is_correct) {
              if (isSelected) {
                buttonClasses += 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-md ring-2 ring-emerald-400';
                icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100 shrink-0" />;
                badge = <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md ml-2">Correct</span>;
              } else {
                buttonClasses += 'border-slate-200 bg-slate-50/40 text-slate-400 opacity-60';
              }
            } else {
              // Answer was INCORRECT
              if (isSelected) {
                // The student picked this WRONG option
                buttonClasses += 'border-rose-500 bg-rose-50 text-rose-950 shadow-md ring-2 ring-rose-400';
                icon = <XCircle className="w-5 h-5 text-rose-600 fill-rose-100 shrink-0" />;
                badge = <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md ml-2">Your Choice (Incorrect)</span>;
              } else if (isTargetCorrect) {
                // Highlight the authentic correct answer
                buttonClasses += 'border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-400 shadow-sm';
                icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100 shrink-0" />;
                badge = <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md ml-2">Correct Answer</span>;
              } else {
                buttonClasses += 'border-slate-200 bg-slate-50/40 text-slate-400 opacity-50';
              }
            }
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleOptionSelect(opt)}
              disabled={!!feedback}
              className={buttonClasses}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>{opt}</span>
                {badge}
              </div>
              {icon}
            </button>
          );
        })}
      </div>

      {/* Hints & AI Guide Section */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {task.hints && task.hints.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveHintIndex(activeHintIndex === null ? 0 : (activeHintIndex + 1) % task.hints.length)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Hint {activeHintIndex !== null ? `#${activeHintIndex + 1}` : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleFetchAiHint}
            disabled={loadingAi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>{loadingAi ? 'AI Thinking...' : 'AI Micro-Explanation'}</span>
          </button>
        </div>

        {/* Submit Button */}
        {!feedback && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedOption || loading}
            className="px-6 py-3 rounded-2xl text-sm font-extrabold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            Check Answer
          </button>
        )}
      </div>

      {/* Active Static Hint Display */}
      {activeHintIndex !== null && task.hints[activeHintIndex] && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-start gap-2.5">
          <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Hint #{activeHintIndex + 1}: </span>
            {task.hints[activeHintIndex]}
          </div>
        </div>
      )}

      {/* AI Explanation Display */}
      {aiHint && (
        <div className="bg-purple-50 border border-purple-200 text-purple-950 p-4 rounded-2xl text-xs sm:text-sm font-medium space-y-1">
          <div className="font-bold flex items-center justify-between text-purple-800">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" /> AI Adaptive Guide
            </span>
            <AudioButton text={aiHint} label="Listen Hint" />
          </div>
          <p className="text-slate-800">{aiHint}</p>
        </div>
      )}

      {/* Animated Feedback Messenger: Bird or Mentor swoops in and announces Right or Wrong */}
      {feedback && (
        <AnimatedFeedbackMessenger
          isCorrect={feedback.is_correct}
          feedbackMessage={
            feedback.is_correct
              ? (feedback.feedback_message || `Great job! "${selectedOption}" is the correct answer.`)
              : (feedback.feedback_message || `Let's inspect the concept and try again!`)
          }
          selectedAnswer={selectedOption}
          correctAnswer={feedback.correct_answer || task.correct_answer}
          explanation={feedback.explanation || task.explanation}
          onClose={() => {
            setFeedback(null);
            setSelectedOption('');
            setAvatarState('idle');
            setAvatarMessage(null);
          }}
          onRetry={() => {
            setFeedback(null);
            setSelectedOption('');
            setAvatarState('idle');
            setAvatarMessage('Ready for another go! You can do this!');
          }}
        />
      )}

    </div>
  );
};

export default TaskCard;
