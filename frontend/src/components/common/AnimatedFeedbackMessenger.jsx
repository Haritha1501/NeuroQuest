import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, Volume2, VolumeX, CheckCircle, HelpCircle, X, ArrowRight, RotateCcw } from 'lucide-react';
import { speakText, stopSpeech } from '../../services/speech';
import { useSensory } from '../../context/SensoryContext';

const AnimatedFeedbackMessenger = ({
  isCorrect = null, // true | false | null
  feedbackMessage = '',
  explanation = '',
  selectedAnswer = '',
  correctAnswer = '',
  onClose = null,
  onRetry = null,
  autoSpeak = true,
  className = ''
}) => {
  const { activeSensoryMode } = useSensory();
  
  // Character type: 'bird' (Pip) | 'person' (Maya)
  const [characterType, setCharacterType] = useState(() => {
    return localStorage.getItem('neuroquest_messenger_char') || 'bird';
  });
  
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [audioMuted, setAudioMuted] = useState(() => {
    return localStorage.getItem('neuroquest_messenger_muted') === 'true';
  });
  const [beakOpen, setBeakOpen] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  const isCalmMode = activeSensoryMode === 'calm' || activeSensoryMode === 'minimal';

  // Determine spoken voice text: explicitly announce "Right" or "Wrong" / "Not quite right"
  const speechText = isCorrect
    ? `That is RIGHT! ${feedbackMessage || "Brilliant work! You solved this correctly!"}`
    : `That is WRONG, but don't worry! ${feedbackMessage || "Every mistake helps our brain learn and grow. Let's look at the concept together!"}`;

  useEffect(() => {
    if (isCorrect === null) {
      setHasEntered(false);
      stopSpeech();
      return;
    }

    // Trigger arrival sequence
    setHasEntered(true);

    if (autoSpeak && !audioMuted && !isCalmMode) {
      triggerVoiceNarration(speechText);
    }

    return () => {
      stopSpeech();
    };
  }, [isCorrect, feedbackMessage]);

  const triggerVoiceNarration = (text) => {
    setIsSpeakingState(true);
    // Beak/mouth animation loop while speaking
    const mouthInterval = setInterval(() => {
      setBeakOpen(prev => !prev);
    }, 180);

    speakText(text, {
      rate: 0.95,
      pitch: characterType === 'bird' ? 1.25 : 1.05,
      onEnd: () => {
        clearInterval(mouthInterval);
        setBeakOpen(false);
        setIsSpeakingState(false);
      },
      onError: () => {
        clearInterval(mouthInterval);
        setBeakOpen(false);
        setIsSpeakingState(false);
      }
    });
  };

  const toggleMute = () => {
    const nextMuted = !audioMuted;
    setAudioMuted(nextMuted);
    localStorage.setItem('neuroquest_messenger_muted', String(nextMuted));
    if (nextMuted) {
      stopSpeech();
      setIsSpeakingState(false);
      setBeakOpen(false);
    } else {
      triggerVoiceNarration(speechText);
    }
  };

  const toggleCharacter = () => {
    stopSpeech();
    setIsSpeakingState(false);
    setBeakOpen(false);
    const nextChar = characterType === 'bird' ? 'person' : 'bird';
    setCharacterType(nextChar);
    localStorage.setItem('neuroquest_messenger_char', nextChar);
  };

  if (isCorrect === null) return null;

  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 border-2 transition-all duration-500 shadow-xl ${
      isCorrect 
        ? 'bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white border-emerald-400/80 shadow-emerald-500/10'
        : 'bg-gradient-to-r from-amber-50 via-orange-50/60 to-white border-amber-400/80 shadow-amber-500/10'
    } ${className}`}>

      {/* Top Messenger Control Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          {/* Character Switcher Pill */}
          <button
            onClick={toggleCharacter}
            className="px-3 py-1 bg-white hover:bg-slate-100 rounded-full text-xs font-black border border-slate-200 shadow-sm flex items-center gap-1.5 transition-all text-slate-700"
            title="Click to switch between Pip the Bird and Maya the Guide"
          >
            <span>{characterType === 'bird' ? '🐦 Pip the Learning Bird' : '🧑 Maya the Guide'}</span>
            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md font-bold">Switch</span>
          </button>

          {/* Verdict Status Badge */}
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
            isCorrect 
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
              : 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
          }`}>
            {isCorrect ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>That's RIGHT!</span>
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Not quite, but great try!</span>
              </>
            )}
          </span>
        </div>

        {/* Audio Narration & Dismiss Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
              audioMuted 
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
            title={audioMuted ? "Unmute Voice" : "Mute Voice"}
          >
            {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline text-[11px]">{audioMuted ? "Muted" : "Voice On"}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close feedback"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Body: Animated Flying Character + Animated Dialogue */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

        {/* ------------------------------------------------------------- */}
        {/* CHARACTER STAGE: FLY-IN BIRD OR WALK-IN PERSON */}
        {/* ------------------------------------------------------------- */}
        <div className="shrink-0 relative">
          
          {characterType === 'bird' ? (
            /* PIP THE LEARNING BIRD */
            <div className={`relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center ${
              hasEntered ? 'animate-bird-entrance' : ''
            }`}>
              {/* Sparkle Trail / Wing Wind */}
              {isCorrect && (
                <div className="absolute inset-0 pointer-events-none animate-spin-slow opacity-60">
                  <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 left-2 animate-bounce" />
                  <Sparkles className="w-4 h-4 text-emerald-400 absolute bottom-2 right-1 animate-pulse" />
                </div>
              )}

              {/* Vector SVG Bird */}
              <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-lg">
                {/* Perch / Branch */}
                <path d="M 15 95 Q 60 100 105 95" stroke="#92400e" strokeWidth="5" strokeLinecap="round" />
                <path d="M 50 96 L 50 102" stroke="#78350f" strokeWidth="3" />
                <path d="M 70 96 L 70 102" stroke="#78350f" strokeWidth="3" />

                {/* Bird Tail Feathers */}
                <polygon points="30,75 10,85 24,70" fill={isCorrect ? "#059669" : "#d97706"} />
                <polygon points="26,72 6,78 22,66" fill={isCorrect ? "#10b981" : "#f59e0b"} />

                {/* Bird Body */}
                <ellipse cx="60" cy="65" rx="26" ry="22" fill={isCorrect ? "#10b981" : "#f59e0b"} />
                
                {/* Belly Color */}
                <ellipse cx="68" cy="68" rx="16" ry="14" fill="#fef3c7" />

                {/* Feet gripping branch */}
                <ellipse cx="54" cy="94" rx="4" ry="2.5" fill="#d97706" />
                <ellipse cx="66" cy="94" rx="4" ry="2.5" fill="#d97706" />

                {/* Animated Flapping Wing */}
                <g className={isCorrect ? "animate-wing-flap origin-top" : beakOpen ? "animate-wing-gentle origin-top" : ""}>
                  <path d="M 46 60 Q 32 45 42 75 Q 52 75 58 65 Z" fill={isCorrect ? "#047857" : "#b45309"} />
                </g>

                {/* Bird Head */}
                <circle cx="78" cy="46" r="16" fill={isCorrect ? "#10b981" : "#f59e0b"} />
                
                {/* Feather Crest */}
                <path d="M 78 30 Q 74 16 84 24 Q 84 32 80 32 Z" fill={isCorrect ? "#047857" : "#b45309"} />

                {/* Eye */}
                {isCorrect ? (
                  /* Happy Arc Eye ^_^ */
                  <path d="M 78 44 Q 83 38 88 44" stroke="#064e3b" strokeWidth="3" fill="none" strokeLinecap="round" />
                ) : (
                  /* Gentle Eye with Reflection */
                  <g>
                    <circle cx="82" cy="43" r="4.5" fill="#1e293b" />
                    <circle cx="84" cy="41" r="1.8" fill="#ffffff" />
                  </g>
                )}

                {/* Animated Opening Beak */}
                {beakOpen ? (
                  <g>
                    {/* Open Beak Top */}
                    <polygon points="90,44 112,41 90,48" fill="#ea580c" />
                    {/* Open Beak Bottom */}
                    <polygon points="90,48 108,55 90,52" fill="#c2410c" />
                  </g>
                ) : (
                  /* Closed Beak */
                  <polygon points="90,43 110,47 90,51" fill="#ea580c" />
                )}

                {/* Rosy Cheek */}
                <circle cx="75" cy="52" r="3.5" fill="#f43f5e" opacity="0.6" />
              </svg>
            </div>
          ) : (
            /* MAYA THE MENTOR GUIDE */
            <div className={`relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center ${
              hasEntered ? 'animate-person-entrance' : ''
            }`}>
              <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-lg">
                {/* Body / Explorer Vest */}
                <path d="M 40 85 Q 60 75 80 85 L 84 115 L 36 115 Z" fill="#4338ca" />
                <path d="M 50 82 L 70 82 L 68 115 L 52 115 Z" fill="#e0e7ff" />

                {/* Explorer Scarf */}
                <path d="M 45 80 Q 60 88 75 80 L 68 92 L 52 92 Z" fill="#f59e0b" />

                {/* Animated Waving Arm */}
                <g className={isCorrect ? "animate-arm-wave origin-bottom-left" : "animate-arm-nod origin-bottom-left"}>
                  <path d="M 80 86 Q 98 75 102 60" stroke="#fbcfe8" strokeWidth="8" strokeLinecap="round" fill="none" />
                  {/* Hand */}
                  <circle cx="102" cy="58" r="5" fill="#fbcfe8" />
                </g>

                {/* Head */}
                <circle cx="60" cy="50" r="20" fill="#fbcfe8" />
                
                {/* Explorer Hair */}
                <path d="M 38 48 Q 42 28 60 28 Q 78 28 82 48 Q 76 34 60 36 Q 44 34 38 48 Z" fill="#312e81" />

                {/* Explorer Cap */}
                <path d="M 36 38 Q 60 22 84 38 L 94 40 Q 60 34 26 40 Z" fill="#4f46e5" />
                <circle cx="60" cy="28" r="3" fill="#f59e0b" />

                {/* Eyes */}
                {isCorrect ? (
                  /* Cheerful Arc Eyes ^_^ */
                  <g stroke="#312e81" strokeWidth="2.8" fill="none" strokeLinecap="round">
                    <path d="M 48 48 Q 53 43 58 48" />
                    <path d="M 64 48 Q 69 43 74 48" />
                  </g>
                ) : (
                  /* Warm Empathetic Eyes */
                  <g fill="#312e81">
                    <circle cx="53" cy="48" r="3.2" />
                    <circle cx="69" cy="48" r="3.2" />
                    <circle cx="54.5" cy="46.5" r="1.2" fill="#ffffff" />
                    <circle cx="70.5" cy="46.5" r="1.2" fill="#ffffff" />
                  </g>
                )}

                {/* Cheeks */}
                <circle cx="45" cy="55" r="3" fill="#f43f5e" opacity="0.6" />
                <circle cx="75" cy="55" r="3" fill="#f43f5e" opacity="0.6" />

                {/* Animated Talking Mouth */}
                {beakOpen ? (
                  <ellipse cx="61" cy="58" rx="4" ry="3" fill="#991b1b" />
                ) : isCorrect ? (
                  <path d="M 54 57 Q 61 63 68 57" stroke="#312e81" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                ) : (
                  <path d="M 56 59 Q 61 62 66 59" stroke="#312e81" strokeWidth="2" fill="none" strokeLinecap="round" />
                )}
              </svg>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SPOKEN DIALOGUE & EXPLANATION CONTENT */}
        {/* ------------------------------------------------------------- */}
        <div className="flex-1 space-y-2.5 text-left w-full">
          
          {/* Main Spoken Sentence */}
          <div className="bg-white/95 rounded-2xl p-4 border border-slate-200 shadow-sm relative space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                {characterType === 'bird' ? '🐦 Pip says:' : '🧑 Maya says:'}
              </span>
              
              {/* Voice Replay button */}
              <button
                onClick={() => triggerVoiceNarration(speechText)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                title="Hear message again"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear Voice</span>
              </button>
            </div>

            <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
              {isCorrect ? (
                <span className="text-emerald-900">🎉 {speechText}</span>
              ) : (
                <span className="text-amber-950">💡 {speechText}</span>
              )}
            </p>

            {/* Answer Comparison Callout if incorrect */}
            {!isCorrect && (selectedAnswer || correctAnswer) && (
              <div className="text-xs font-semibold text-slate-800 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 mt-2">
                {selectedAnswer && (
                  <span>You picked: <span className="line-through font-bold text-rose-700">"{selectedAnswer}"</span></span>
                )}
                {selectedAnswer && correctAnswer && <span> • </span>}
                {correctAnswer && (
                  <span>Target answer: <span className="font-extrabold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-200">"{correctAnswer}"</span></span>
                )}
              </div>
            )}
          </div>

          {/* Educational Explanation Box */}
          {explanation && (
            <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 text-xs space-y-1">
              <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] block">
                Curriculum Concept Explanation:
              </span>
              <p className="text-slate-700 font-medium leading-relaxed">
                {explanation}
              </p>
            </div>
          )}

          {/* Action Row: Retry Answering */}
          {onRetry && !isCorrect && (
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all shadow-sm active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-800" />
                <span>Try Answering Again</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Scoped CSS Keyframes for Swooping Bird & Stepping Person */}
      <style>{`
        @keyframes bird-swoop-in {
          0% {
            transform: translate(120px, -60px) rotate(-15deg) scale(0.6);
            opacity: 0;
          }
          60% {
            transform: translate(-10px, 10px) rotate(8deg) scale(1.1);
            opacity: 1;
          }
          80% {
            transform: translate(5px, -5px) rotate(-3deg) scale(1.02);
          }
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
        }

        @keyframes person-entrance {
          0% {
            transform: translateX(-80px) scale(0.8);
            opacity: 0;
          }
          70% {
            transform: translateX(10px) scale(1.05);
            opacity: 1;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes wing-flap {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-35deg) translateY(-4px); }
        }

        @keyframes wing-gentle {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-15deg); }
        }

        @keyframes arm-wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-25deg) translateY(-3px); }
        }

        @keyframes arm-nod {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg); }
        }

        .animate-bird-entrance {
          animation: bird-swoop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-person-entrance {
          animation: person-entrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-wing-flap {
          animation: wing-flap 0.35s ease-in-out infinite;
        }

        .animate-wing-gentle {
          animation: wing-gentle 0.8s ease-in-out infinite;
        }

        .animate-arm-wave {
          animation: arm-wave 0.5s ease-in-out infinite;
        }

        .animate-arm-nod {
          animation: arm-nod 1.2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
      `}</style>

    </div>
  );
};

export default AnimatedFeedbackMessenger;
