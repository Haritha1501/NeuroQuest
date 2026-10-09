import React, { useState } from 'react';
import { 
  Users, Sparkles, Brain, Globe, RotateCcw, 
  ChevronDown, CheckCircle2, Zap 
} from 'lucide-react';
import { activateIntelligencePersona } from '../../services/api';

const PERSONAS = [
  { id: 'beginner', name: 'Alex (Beginner)', badge: '0% State', color: 'bg-slate-100 text-slate-800' },
  { id: 'fast_learner', name: 'Maya (Fast)', badge: '85%+', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'struggling_learner', name: 'Sam (Gaps)', badge: 'Error Signal', color: 'bg-amber-100 text-amber-800' },
  { id: 'decayed_learner', name: 'Jordan (Decayed)', badge: '18d Inactive', color: 'bg-orange-100 text-orange-800' },
  { id: 'low_engagement', name: 'Chris (SDG 10)', badge: 'Micro-Path', color: 'bg-cyan-100 text-cyan-800' }
];

const PersonaSwitcherBar = ({ 
  activePersonaId, 
  onPersonaChanged, 
  onOpenAIMentor, 
  onOpenSDG10, 
  onOpenRevival 
}) => {
  const [switching, setSwitching] = useState(false);
  const [currentSelected, setCurrentSelected] = useState(activePersonaId || 'fast_learner');

  const handleSelectPersona = async (personaId) => {
    try {
      setSwitching(true);
      setCurrentSelected(personaId);
      const res = await activateIntelligencePersona(personaId);
      if (onPersonaChanged) {
        onPersonaChanged(res.data);
      }
    } catch (err) {
      console.error('Failed to switch persona:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200/90 shadow-sm py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Persona Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 shrink-0 mr-1">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Simulate Persona:</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {PERSONAS.map((p) => {
              const isSelected = currentSelected === p.id;
              return (
                <button
                  key={p.id}
                  disabled={switching}
                  onClick={() => handleSelectPersona(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-100'
                  }`}
                >
                  <span>{p.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                    isSelected ? 'bg-white/20 text-white' : p.color
                  }`}>
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Launch Utilities (AI Mentor, SDG 10, Skill Revival) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenAIMentor}
            className="px-3 py-1.5 rounded-xl text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Mentor</span>
          </button>

          <button
            onClick={onOpenSDG10}
            className="px-3 py-1.5 rounded-xl text-xs font-black text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-700" />
            <span>SDG 10 Focus</span>
          </button>

          <button
            onClick={onOpenRevival}
            className="px-3 py-1.5 rounded-xl text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span>Skill Revival</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default PersonaSwitcherBar;
