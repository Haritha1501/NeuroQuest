import React, { useState } from 'react';
import { 
  Brain, Sparkles, Send, X, Lightbulb, HelpCircle, 
  RotateCcw, BookOpen, Compass, Shield, CheckCircle2, ChevronRight, MessageSquare
} from 'lucide-react';
import { askAIMentor } from '../../services/api';

const PEDAGOGICAL_MODES = [
  { id: 'explain', label: '📖 Deep Explanation', description: 'Comprehensive breakdown with core principles' },
  { id: 'simplify', label: '💡 Explain Simply', description: 'Plain English with real-world analogies' },
  { id: 'hint', label: '🪜 Progressive Hint', description: 'Step-by-step guidance without giving direct answers' },
  { id: 'example', label: '🔍 Concrete Example', description: 'Practical code snippet illustrating concept' },
  { id: 'reframe', label: '🔄 Reframe Mental Model', description: 'Different perspective if you are stuck' },
  { id: 'check', label: '🎯 Concept Check', description: 'Quick diagnostic check to verify understanding' },
  { id: 'challenge', label: '⚡ Challenge Me', description: 'Stretch problem to test deep mastery' }
];

const AIMentorDrawer = ({ 
  isOpen, 
  onClose, 
  currentSkill, 
  currentMastery, 
  recentMistake, 
  currentQuest 
}) => {
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState('simplify');
  const [hintStep, setHintStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I'm your SkillForge Context-Aware AI Mentor. I see you're currently working on ${
        currentSkill?.title || currentSkill?.name || 'Java Skills'
      }. How can I support your understanding right now?`,
      mode: 'welcome'
    }
  ]);

  const handleSend = async (overridePrompt = null, overrideMode = null) => {
    const promptToSend = overridePrompt || query;
    if (!promptToSend.trim()) return;

    const modeToSend = overrideMode || selectedMode;

    const userMsg = {
      role: 'user',
      text: promptToSend,
      mode: modeToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const payload = {
        learner_query: promptToSend,
        mode: modeToSend,
        skill_id: currentSkill?.skill_id || currentSkill?.id,
        current_question_prompt: currentQuest?.title,
        recent_mistake: recentMistake,
        hint_step: modeToSend === 'hint' ? hintStep : 1
      };

      const res = await askAIMentor(payload);
      const mentorResp = res.data;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: mentorResp.response_text,
          mode: mentorResp.mode_used,
          hintLevel: mentorResp.progressive_hint_level,
          followUps: mentorResp.suggested_follow_up_modes
        }
      ]);

      if (modeToSend === 'hint') {
        setHintStep(prev => Math.min(3, prev + 1));
      }
    } catch (err) {
      console.error('AI Mentor failed:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: "I encountered a brief connection issue. In the meantime, remember: focus on verifying the method signature and superclass relationship!",
          mode: 'error'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (promptText, mode) => {
    setSelectedMode(mode);
    handleSend(promptText, mode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200">
          
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-amber-300 shadow-inner">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black flex items-center gap-1.5">
                  <span>Context-Aware AI Mentor</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <p className="text-[11px] text-indigo-200 font-medium">
                  Pedagogical Companion • Feature 11
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Context Banner */}
          <div className="bg-indigo-50/80 border-b border-indigo-100 p-3.5 text-xs text-indigo-950 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-indigo-700">Active Skill:</span>
              <span className="font-black bg-indigo-200/70 px-2 py-0.5 rounded-lg text-[11px]">
                {currentSkill?.title || currentSkill?.name || 'Inheritance'}
              </span>
            </div>
            {currentMastery !== undefined && currentMastery !== null && (
              <span className="font-bold text-slate-600 text-[11px]">
                Mastery: <strong className="text-indigo-900">{Math.round(currentMastery * 100)}%</strong>
              </span>
            )}
          </div>

          {/* Mode Selector Pill Carousel */}
          <div className="p-3 border-b border-slate-100 bg-slate-50 overflow-x-auto flex gap-1.5 no-scrollbar">
            {PEDAGOGICAL_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                  selectedMode === m.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-4 text-xs font-medium space-y-2 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                  }`}
                >
                  {/* Mode tag */}
                  {msg.role === 'assistant' && msg.mode && msg.mode !== 'welcome' && (
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 text-[10px] font-black uppercase text-indigo-600">
                      <span>Mode: {msg.mode}</span>
                      {msg.hintLevel && (
                        <span className="text-amber-600 font-bold">Hint Step {msg.hintLevel}/3</span>
                      )}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Follow-up suggestions */}
                  {msg.followUps && msg.followUps.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold">Try next:</span>
                      {msg.followUps.map((fMode, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleQuickPrompt(`Help me understand using ${fMode}`, fMode)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        >
                          {fMode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 max-w-[200px]">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
                <span>AI Mentor thinking...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleQuickPrompt("Can you give me a real-world analogy?", "simplify")}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:border-indigo-300 hover:bg-indigo-50 shrink-0"
            >
              💡 Real-world analogy
            </button>
            <button
              onClick={() => handleQuickPrompt("Give me a small hint without spoiling the answer", "hint")}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:border-amber-300 hover:bg-amber-50 shrink-0"
            >
              🪜 Step-by-step hint
            </button>
            <button
              onClick={() => handleQuickPrompt("Show me a minimal code example", "example")}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:border-indigo-300 hover:bg-indigo-50 shrink-0"
            >
              🔍 Code example
            </button>
          </div>

          {/* Input Box */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Ask mentor (${selectedMode} mode)...`}
              className="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              disabled={!query.trim() || loading}
              onClick={() => handleSend()}
              className="p-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-md shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AIMentorDrawer;
