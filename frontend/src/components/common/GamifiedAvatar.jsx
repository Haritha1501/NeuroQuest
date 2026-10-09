import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, Lightbulb, Crown, Star, Volume2, Smile, MessageCircle, X } from 'lucide-react';
import { useSensory } from '../../context/SensoryContext';
import { useTheme } from '../../context/ThemeContext';
import AudioButton from './AudioButton';

// Default encouraging dialogues tailored for neurodivergent learners
const DEFAULT_SPEECH = {
  idle: [
    "I'm right here with you! Take your time.",
    "Ready when you are, explorer!",
    "No rush at all — learning happens step by step."
  ],
  thinking: [
    "Hmm, let's explore the clues together...",
    "Connecting the neural dots!",
    "Pondering the possibilities..."
  ],
  answering: [
    "Ooh, great choice to consider!",
    "Focusing in on your intuition...",
    "Locking it in!"
  ],
  correct: [
    "Brilliant! You mastered that concept!",
    "Spot on! Your brain just leveled up!",
    "Awesome insight! Keep this momentum going!"
  ],
  wrong: [
    "Almost there! Mistakes help our neurons grow.",
    "Great effort! Let's check the hint and try again.",
    "No worries at all! Exploring why is how we master it."
  ],
  level_up: [
    "🌟 LEVEL UP! Look at your amazing mastery!",
    "Incredible breakthrough! You unlocked new skills!",
    "Mastery achievement unlocked! You're shining!"
  ],
  celebration: [
    "WOOHOO! Spectacular performance!",
    "Look at how far your skills have evolved!",
    "Pure genius! You conquered this challenge!"
  ]
};

export const AVATAR_CHARACTERS = [
  { id: 'nova', name: 'Nova Bot', role: 'Cosmic AI Explorer', theme: 'space' },
  { id: 'byte', name: 'Byte Pup', role: 'Cyber Guardian', theme: 'coding' },
  { id: 'sparky', name: 'Sparky Fox', role: 'Curious Scout', theme: 'animals' },
  { id: 'luna', name: 'Luna Owl', role: 'Cosmic Sage', theme: 'nature' }
];

const GamifiedAvatar = ({
  state = 'idle', // 'idle' | 'thinking' | 'answering' | 'correct' | 'wrong' | 'level_up' | 'celebration'
  message = null,
  character = null,
  size = 'md', // 'sm' | 'md' | 'lg'
  showSpeechBubble = true,
  interactive = true,
  compact = false,
  className = ''
}) => {
  const { activeSensoryMode } = useSensory();
  const { profile } = useTheme();

  // Pick character based on learner's interests if not passed explicitly
  const defaultChar = (() => {
    if (character) return character;
    const interest = (profile?.interests?.[0] || 'space').toLowerCase();
    if (interest.includes('animal')) return 'sparky';
    if (interest.includes('code') || interest.includes('robot')) return 'byte';
    if (interest.includes('nature') || interest.includes('art')) return 'luna';
    return 'nova';
  })();

  const [activeChar, setActiveChar] = useState(defaultChar);
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(showSpeechBubble);
  const [isBlinking, setIsBlinking] = useState(false);
  const [clickReaction, setClickReaction] = useState(false);

  const isCalmMode = activeSensoryMode === 'calm' || activeSensoryMode === 'minimal';

  // Update speech bubble whenever state or custom message changes
  useEffect(() => {
    if (message) {
      setBubbleText(message);
    } else {
      const pool = DEFAULT_SPEECH[state] || DEFAULT_SPEECH.idle;
      const randomMsg = pool[Math.floor(Math.random() * pool.length)];
      setBubbleText(randomMsg);
    }
  }, [state, message]);

  // Periodic natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 3800);
    return () => clearInterval(blinkInterval);
  }, []);

  const handleAvatarClick = () => {
    if (!interactive) return;
    setClickReaction(true);
    const friendlyGiggles = [
      "Beep boop! Ready for adventure!",
      "I'm cheering for you every step!",
      "High five! Let's solve this together!",
      "You've got a fantastic inquisitive mind!"
    ];
    setBubbleText(friendlyGiggles[Math.floor(Math.random() * friendlyGiggles.length)]);
    setBubbleVisible(true);
    setTimeout(() => setClickReaction(false), 800);
  };

  // Dimensions based on size prop
  const sizeConfig = {
    sm: { box: 'w-12 h-12', svg: 'w-10 h-10', text: 'text-[11px]', badge: 'text-[9px]' },
    md: { box: 'w-20 h-20', svg: 'w-16 h-16', text: 'text-xs', badge: 'text-[10px]' },
    lg: { box: 'w-28 h-28', svg: 'w-24 h-24', text: 'text-sm', badge: 'text-xs' }
  }[size] || { box: 'w-20 h-20', svg: 'w-16 h-16', text: 'text-xs', badge: 'text-[10px]' };

  // Determine state motion animation class
  const getMotionClass = () => {
    if (isCalmMode) {
      // Gentle calm mode: soft breathing without quick bounces
      return 'animate-pulse duration-1000';
    }
    if (clickReaction) return 'scale-110 -rotate-3 transition-transform';
    switch (state) {
      case 'thinking':
        return 'animate-avatar-think';
      case 'answering':
        return 'animate-avatar-answer';
      case 'correct':
        return 'animate-avatar-correct';
      case 'wrong':
        return 'animate-avatar-wrong';
      case 'level_up':
        return 'animate-avatar-levelup';
      case 'celebration':
        return 'animate-avatar-celebrate';
      case 'idle':
      default:
        return 'animate-avatar-float';
    }
  };

  // State aura glow color
  const getAuraColor = () => {
    switch (state) {
      case 'correct':
        return 'shadow-emerald-400/40 ring-4 ring-emerald-300/40';
      case 'wrong':
        return 'shadow-amber-400/30 ring-3 ring-amber-200/50';
      case 'level_up':
        return 'shadow-purple-500/50 ring-4 ring-purple-400/50';
      case 'celebration':
        return 'shadow-amber-400/50 ring-4 ring-amber-300/50';
      case 'thinking':
        return 'shadow-indigo-400/30 ring-2 ring-indigo-300/30';
      case 'answering':
        return 'shadow-blue-400/30 ring-2 ring-blue-300/30';
      default:
        return 'shadow-slate-300/30';
    }
  };

  // State indicator icon badge
  const renderStateBadge = () => {
    switch (state) {
      case 'correct':
        return (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-bounce">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
          </div>
        );
      case 'thinking':
        return (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md animate-pulse">
            <Lightbulb className="w-3.5 h-3.5" />
          </div>
        );
      case 'level_up':
      case 'celebration':
        return (
          <div className="absolute -top-2 -right-1 w-7 h-7 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 flex items-center justify-center shadow-md animate-bounce">
            <Crown className="w-4 h-4 fill-current" />
          </div>
        );
      case 'wrong':
        return (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-md">
            <Heart className="w-3.5 h-3.5 fill-current text-rose-500" />
          </div>
        );
      default:
        return null;
    }
  };

  // --------------------------------------------------------------------------
  // VECTOR SVG RENDERS FOR CHARACTERS
  // --------------------------------------------------------------------------

  const renderCharacterSvg = () => {
    // Shared eye shapes based on state
    const isHappy = state === 'correct' || state === 'celebration' || state === 'level_up';
    const isCurious = state === 'thinking';
    const isGentle = state === 'wrong';

    if (activeChar === 'nova') {
      // NOVA THE COSMIC ROBOT
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          {/* Antenna */}
          <line x1="50" y1="20" x2="50" y2="8" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="7" r="5" fill={isHappy ? '#a855f7' : isCurious ? '#f59e0b' : '#38bdf8'} className="animate-pulse" />
          
          {/* Ears / Side Thrusters */}
          <rect x="18" y="36" width="6" height="16" rx="3" fill="#818cf8" />
          <rect x="76" y="36" width="6" height="16" rx="3" fill="#818cf8" />

          {/* Robot Head Outer Shell */}
          <rect x="22" y="20" width="56" height="48" rx="18" fill="url(#novaGrad)" stroke="#4338ca" strokeWidth="2.5" />
          
          {/* Visor Screen */}
          <rect x="28" y="28" width="44" height="32" rx="10" fill="#0f172a" />
          
          {/* Eyes on Visor */}
          {isBlinking ? (
            <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="round">
              <line x1="36" y1="44" x2="44" y2="44" />
              <line x1="56" y1="44" x2="64" y2="44" />
            </g>
          ) : isHappy ? (
            /* Happy Arc Eyes ^_^ */
            <g stroke="#38bdf8" strokeWidth="3.5" fill="none" strokeLinecap="round">
              <path d="M 35 46 Q 40 40 45 46" />
              <path d="M 55 46 Q 60 40 65 46" />
            </g>
          ) : isCurious ? (
            /* Inquisitive looking up-right */
            <g fill="#38bdf8">
              <circle cx="42" cy="40" r="5" />
              <circle cx="62" cy="40" r="5" />
              <circle cx="44" cy="38" r="2" fill="#ffffff" />
              <circle cx="64" cy="38" r="2" fill="#ffffff" />
            </g>
          ) : isGentle ? (
            /* Soft encouraging look with gentle smile */
            <g>
              <circle cx="40" cy="43" r="4.5" fill="#38bdf8" />
              <circle cx="60" cy="43" r="4.5" fill="#38bdf8" />
              <path d="M 46 51 Q 50 54 54 51" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
          ) : (
            /* Default Friendly Glowing Cyan Eyes */
            <g fill="#38bdf8">
              <circle cx="40" cy="44" r="5" />
              <circle cx="60" cy="44" r="5" />
              <circle cx="42" cy="42" r="1.8" fill="#ffffff" />
              <circle cx="62" cy="42" r="1.8" fill="#ffffff" />
            </g>
          )}

          {/* Cheeks */}
          <circle cx="33" cy="51" r="3" fill="#f43f5e" opacity="0.6" />
          <circle cx="67" cy="51" r="3" fill="#f43f5e" opacity="0.6" />

          {/* Floating Thruster Base */}
          <path d="M 40 70 L 60 70 L 55 78 L 45 78 Z" fill="#6366f1" />
          <ellipse cx="50" cy="82" rx="7" ry="3" fill={isHappy ? '#a855f7' : '#38bdf8'} opacity="0.8" className="animate-pulse" />

          {/* Gradients */}
          <defs>
            <linearGradient id="novaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0e7ff" />
              <stop offset="100%" stopColor="#c7d2fe" />
            </linearGradient>
          </defs>
        </svg>
      );
    } else if (activeChar === 'sparky') {
      // SPARKY THE ADVENTUROUS FOX
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          {/* Big Fox Ears */}
          <polygon points="20,40 32,10 46,34" fill="#ea580c" />
          <polygon points="26,36 34,16 42,32" fill="#fed7aa" />
          <polygon points="80,40 68,10 54,34" fill="#ea580c" />
          <polygon points="74,36 66,16 58,32" fill="#fed7aa" />

          {/* Head */}
          <ellipse cx="50" cy="52" rx="30" ry="24" fill="#f97316" />
          
          {/* White Snout Mask */}
          <path d="M 32 54 Q 50 68 68 54 Q 60 76 50 78 Q 40 76 32 54 Z" fill="#fff7ed" />
          
          {/* Nose */}
          <polygon points="46,67 54,67 50,72" fill="#1e293b" />

          {/* Eyes */}
          {isBlinking ? (
            <g stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round">
              <line x1="36" y1="46" x2="44" y2="46" />
              <line x1="56" y1="46" x2="64" y2="46" />
            </g>
          ) : isHappy ? (
            <g stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M 36 48 Q 40 43 44 48" />
              <path d="M 56 48 Q 60 43 64 48" />
            </g>
          ) : (
            <g fill="#1e293b">
              <circle cx="40" cy="46" r="4" />
              <circle cx="60" cy="46" r="4" />
              <circle cx="42" cy="44" r="1.5" fill="#ffffff" />
              <circle cx="62" cy="44" r="1.5" fill="#ffffff" />
            </g>
          )}

          {/* Cheeks */}
          <circle cx="32" cy="54" r="3.5" fill="#fb7185" opacity="0.6" />
          <circle cx="68" cy="54" r="3.5" fill="#fb7185" opacity="0.6" />
        </svg>
      );
    } else if (activeChar === 'byte') {
      // BYTE THE CYBER PUP
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          {/* Floppy Ears */}
          <path d="M 22 36 C 12 45, 14 65, 24 64 C 28 62, 28 45, 28 38 Z" fill="#0284c7" />
          <path d="M 78 36 C 88 45, 86 65, 76 64 C 72 62, 72 45, 72 38 Z" fill="#0284c7" />

          {/* Head */}
          <rect x="25" y="24" width="50" height="46" rx="20" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2.5" />
          
          {/* Eyepatch / Cyber mark */}
          <circle cx="39" cy="44" r="12" fill="#bae6fd" opacity="0.6" />

          {/* Eyes */}
          {isBlinking ? (
            <line x1="34" y1="44" x2="44" y2="44" stroke="#0369a1" strokeWidth="3" strokeLinecap="round" />
          ) : (
            <g fill="#0369a1">
              <circle cx="39" cy="44" r="4.5" />
              <circle cx="61" cy="44" r="4.5" />
              <circle cx="41" cy="42" r="1.5" fill="#ffffff" />
              <circle cx="63" cy="42" r="1.5" fill="#ffffff" />
            </g>
          )}

          {/* Cute Nose & Mouth */}
          <ellipse cx="50" cy="54" rx="4" ry="3" fill="#0f172a" />
          <path d="M 47 57 Q 50 60 53 57" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
          
          {/* Cyber Collar */}
          <rect x="35" y="68" width="30" height="6" rx="3" fill="#38bdf8" />
          <circle cx="50" cy="74" r="3.5" fill="#f59e0b" />
        </svg>
      );
    } else {
      // LUNA THE SAGE OWL
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          {/* Ear Tufts */}
          <polygon points="28,26 36,12 44,28" fill="#7e22ce" />
          <polygon points="72,26 64,12 56,28" fill="#7e22ce" />

          {/* Round Body */}
          <circle cx="50" cy="50" r="32" fill="#f3e8ff" stroke="#7e22ce" strokeWidth="2.5" />
          <circle cx="50" cy="56" r="22" fill="#faf5ff" />

          {/* Wise Spectacles / Eye Rings */}
          <circle cx="38" cy="44" r="11" fill="#ede9fe" stroke="#6b21a8" strokeWidth="2" />
          <circle cx="62" cy="44" r="11" fill="#ede9fe" stroke="#6b21a8" strokeWidth="2" />
          <line x1="49" y1="44" x2="51" y2="44" stroke="#6b21a8" strokeWidth="2" />

          {/* Eyes */}
          {isBlinking ? (
            <g stroke="#581c87" strokeWidth="3" strokeLinecap="round">
              <line x1="33" y1="44" x2="43" y2="44" />
              <line x1="57" y1="44" x2="67" y2="44" />
            </g>
          ) : isHappy ? (
            <g stroke="#581c87" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M 33 46 Q 38 41 43 46" />
              <path d="M 57 46 Q 62 41 67 46" />
            </g>
          ) : (
            <g fill="#581c87">
              <circle cx="38" cy="44" r="4.5" />
              <circle cx="62" cy="44" r="4.5" />
              <circle cx="40" cy="42" r="1.5" fill="#ffffff" />
              <circle cx="64" cy="42" r="1.5" fill="#ffffff" />
            </g>
          )}

          {/* Beak */}
          <polygon points="47,51 53,51 50,58" fill="#f59e0b" />
        </svg>
      );
    }
  };

  return (
    <div className={`inline-flex items-center gap-3.5 select-none ${className}`}>
      
      {/* Avatar Vector Figure Box */}
      <div 
        onClick={handleAvatarClick}
        className={`relative ${sizeConfig.box} rounded-3xl bg-white border border-slate-200/80 shadow-md flex items-center justify-center cursor-pointer transition-all duration-300 ${getAuraColor()} ${getMotionClass()}`}
        title={`${AVATAR_CHARACTERS.find(c => c.id === activeChar)?.name || 'Companion'} (${state}) - Click to interact!`}
      >
        <div className={sizeConfig.svg}>
          {renderCharacterSvg()}
        </div>

        {/* State Badge Icon */}
        {renderStateBadge()}
      </div>

      {/* Speech Bubble / Encouragement Dialogue */}
      {bubbleVisible && bubbleText && !compact && (
        <div className="relative max-w-xs sm:max-w-sm bg-white rounded-2xl px-4 py-2.5 shadow-md border border-slate-200/90 text-slate-800 animate-in fade-in slide-in-from-left-2 duration-200">
          {/* Little speech tail pointing to avatar */}
          <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-white filter drop-shadow-[-1px_0px_1px_rgba(0,0,0,0.05)]" />
          
          <div className="flex items-start justify-between gap-2">
            <p className={`${sizeConfig.text} font-bold leading-snug text-slate-800`}>
              {bubbleText}
            </p>
            <AudioButton 
              text={bubbleText} 
              label="Listen" 
              className="p-1 scale-75 opacity-70 hover:opacity-100 shrink-0" 
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 mt-1">
            <span className={`${sizeConfig.badge} font-extrabold uppercase tracking-wider text-indigo-600`}>
              {AVATAR_CHARACTERS.find(c => c.id === activeChar)?.name}
            </span>

            {/* Quick Companion Selector Chips */}
            <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
              {AVATAR_CHARACTERS.map(c => (
                <button
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveChar(c.id);
                  }}
                  className={`w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center font-bold ${
                    activeChar === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                  }`}
                  title={`Switch companion to ${c.name}`}
                >
                  {c.name[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS Keyframes for smooth animations */}
      <style>{`
        @keyframes avatar-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(1deg); }
        }
        @keyframes avatar-think {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-2px) rotate(3deg); }
        }
        @keyframes avatar-answer {
          0% { transform: scale(1); }
          50% { transform: scale(1.05) translateY(-3px); }
          100% { transform: scale(1.02); }
        }
        @keyframes avatar-correct {
          0%, 100% { transform: translateY(0px) scale(1); }
          30% { transform: translateY(-8px) scale(1.1) rotate(4deg); }
          60% { transform: translateY(-3px) scale(1.05) rotate(-3deg); }
        }
        @keyframes avatar-wrong {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          40% { transform: translateY(2px) rotate(-3deg); }
          70% { transform: translateY(-1px) rotate(2deg); }
        }
        @keyframes avatar-levelup {
          0% { transform: scale(1); }
          50% { transform: scale(1.15) translateY(-10px) rotate(5deg); }
          100% { transform: scale(1.05) translateY(-4px); }
        }
        @keyframes avatar-celebrate {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(-5deg) scale(1.08); }
          75% { transform: translateY(-6px) rotate(5deg) scale(1.08); }
        }
        .animate-avatar-float { animation: avatar-float 3.5s ease-in-out infinite; }
        .animate-avatar-think { animation: avatar-think 2.4s ease-in-out infinite; }
        .animate-avatar-answer { animation: avatar-answer 0.5s ease-out forwards; }
        .animate-avatar-correct { animation: avatar-correct 1.2s ease-in-out infinite; }
        .animate-avatar-wrong { animation: avatar-wrong 2s ease-in-out infinite; }
        .animate-avatar-levelup { animation: avatar-levelup 1.6s ease-in-out infinite; }
        .animate-avatar-celebrate { animation: avatar-celebrate 1.4s ease-in-out infinite; }
      `}</style>

    </div>
  );
};

export default GamifiedAvatar;
