import React, { useState, useEffect } from 'react';
import { 
  Globe, CheckCircle2, Shield, Eye, Sliders, X, 
  Sparkles, Layers, Zap, HeartHandshake, Compass, Check
} from 'lucide-react';
import { getInclusiveAdaptiveProfile, updateInclusiveAdaptiveProfile } from '../../services/api';

const InclusiveAdaptiveModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await getInclusiveAdaptiveProfile();
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to load inclusive adaptive profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, value) => {
    if (!profile) return;
    const updated = { ...profile, [key]: value };
    setProfile(updated);

    try {
      setSaving(true);
      const res = await updateInclusiveAdaptiveProfile({ [key]: value });
      setProfile(res.data);
      if (onProfileUpdated) {
        onProfileUpdated(res.data);
      }
    } catch (err) {
      console.error('Failed to update adaptive profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-cyan-800 to-indigo-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              SDG 10: Reduced Inequalities • Inclusive Adaptive Learning
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black">
            Personalized Paths. Identical Competency Standards.
          </h2>

          <p className="text-xs text-cyan-100 font-medium mt-1">
            NeuroQuest provides customized scaffolding and cognitive pacing without watering down rigor. Every learner reaches <strong>Java Inheritance Mastery &ge; 70%</strong>.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* SDG 10 Twin Learner Comparison Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Architectural Path Comparison
              </span>
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Competency Target: &ge; 70% for both
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Learner A Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black text-slate-800">Learner A (Standard Path)</span>
                  <span className="text-[10px] font-bold text-slate-500">Comprehensive</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Multi-stage lessons & diagrams</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Standard challenge quests (5 stages)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>On-demand hint reveal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-emerald-800">Outcome: Inheritance Mastered (&ge;70%)</span>
                  </li>
                </ul>
              </div>

              {/* Learner B Card */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-cyan-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                  <span className="text-xs font-black text-indigo-950">Learner B (Micro-Adaptive Path)</span>
                  <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100 px-1.5 py-0.5 rounded">Adaptive Focus</span>
                </div>
                <ul className="text-xs text-indigo-900 space-y-1.5 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Micro-chunked single-concept segments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Bite-sized check-ins (2 stages)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Low distraction / sensory-reduced mode</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-emerald-800">Outcome: Inheritance Mastered (&ge;70%)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Accessibility & Pacing Controls */}
          {profile && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                Adjust Learning Environment
              </span>

              <div className="space-y-3">
                {/* 1. Low-Distraction Focus Mode Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-black text-slate-900">Low-Distraction Focus Mode</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Eliminates complex animations, increases contrast, and highlights one interaction at a time.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('focus_mode_active', !profile.focus_mode_active)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      profile.focus_mode_active ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                {/* 2. Content Chunking */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-600" />
                      <span className="text-xs font-black text-slate-900">Content Chunking</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Micro-chunked splits instructions into single bite-sized steps.
                    </p>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => handleToggle('content_chunking', 'standard')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                        profile.content_chunking === 'standard' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => handleToggle('content_chunking', 'micro_chunked')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                        profile.content_chunking === 'micro_chunked' ? 'bg-teal-600 text-white shadow' : 'text-slate-500'
                      }`}
                    >
                      Micro-Chunked
                    </button>
                  </div>
                </div>

                {/* 3. Challenge Chunk Size */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-black text-slate-900">Assessment Checkpoint Size</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Bite-sized tests mastery in 2-stage sprints instead of 5-stage quests.
                    </p>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => handleToggle('challenge_chunk_size', 'standard')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                        profile.challenge_chunk_size === 'standard' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      5 Stages
                    </button>
                    <button
                      onClick={() => handleToggle('challenge_chunk_size', 'bite_sized')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                        profile.challenge_chunk_size === 'bite_sized' ? 'bg-amber-600 text-white shadow' : 'text-slate-500'
                      }`}
                    >
                      2 Stages (Bite-Sized)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-black text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md"
            >
              Apply Settings & Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InclusiveAdaptiveModal;
