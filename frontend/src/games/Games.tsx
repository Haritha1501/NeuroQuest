import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Volume2, VolumeX, BookOpen, CheckCircle, Award, Compass } from 'lucide-react';
import ConceptMatch from './ConceptMatch';
import BuildTheSequence from './BuildTheSequence';
import FindTheSignal from './FindTheSignal';
import BossQuestion from './BossQuestion';
import MissionMap from './MissionMap';
import GamifiedAvatar from '../components/common/GamifiedAvatar';

// NCERT Class 7 Science & Math Curriculum Datasets for Mini-Challenges
const CURRICULUM_DATA = {
  science_plants: {
    title: "Class 7 Science: Plant Nutrition",
    conceptPairs: [
      { id: "cm_1", term: "Autotroph", definition: "Organisms that make their own food from inorganic raw materials using sunlight." },
      { id: "cm_2", term: "Heterotroph", definition: "Organisms that depend on other living things for nourishment and energy." },
      { id: "cm_3", term: "Photosynthesis", definition: "Process of preparing glucose from CO₂ and water in the presence of sunlight and chlorophyll." },
      { id: "cm_4", term: "Stomata", definition: "Microscopic pores on leaf surfaces protected by guard cells for gas exchange." },
      { id: "cm_5", term: "Chlorophyll", definition: "Green pigment inside chloroplasts that captures light energy from the sun." },
      { id: "cm_6", term: "Saprotroph", definition: "Organisms that absorb nutrients from dead and decaying matter (e.g. fungi)." }
    ],
    sequenceSteps: [
      { id: 1, text: "1. Roots absorb water and dissolved minerals from the soil", order: 1 },
      { id: 2, text: "2. Stomata open to take in carbon dioxide from the air", order: 2 },
      { id: 3, text: "3. Chlorophyll in leaves captures sunlight energy", order: 3 },
      { id: 4, text: "4. Leaves cook glucose food and release fresh oxygen into the air", order: 4 }
    ],
    signalTarget: { id: "stomata_target", label: "Stomata (Gas Exchange Pores)" },
    signalNoise: [
      { id: "n1", label: "Mitochondria" },
      { id: "n2", label: "Ribosome" },
      { id: "n3", label: "Centriole" },
      { id: "n4", label: "Golgi Body" },
      { id: "n5", label: "Cell Wall" }
    ],
    bossQuestion: {
      question: "If a potted plant is placed in an airtight dark chamber for 10 days with regular watering, why does it stop synthesizing food?",
      options: [
        { id: "b1", text: "Roots cannot drink water in the dark.", isCorrect: false },
        { id: "b2", text: "Without sunlight, chlorophyll cannot energize the photosynthetic reaction.", isCorrect: true },
        { id: "b3", text: "The soil turns completely into nitrogen.", isCorrect: false },
        { id: "b4", text: "Plants only grow when humans are watching them.", isCorrect: false }
      ],
      hints: [
        "What is the key external energy source for the leaf kitchen?",
        "Chlorophyll requires light rays to trigger the glucose reaction."
      ]
    },
    missionNodes: [
      { id: "m1", title: "Autotrophs", description: "Learn how plants feed themselves", status: "completed" },
      { id: "m2", title: "Photosynthesis", description: "Sunlight to organic food", status: "current" },
      { id: "m3", title: "Stomata & Gas", description: "Leaf breathing pores", status: "locked" },
      { id: "m4", title: "Plant Mastery", description: "Final synthesis quest", status: "locked" }
    ]
  },
  math_integers: {
    title: "Class 7 Math: Integers on the Number Line",
    conceptPairs: [
      { id: "mi_1", term: "Positive Integer", definition: "Whole numbers greater than zero located to the right on a number line (+1, +2, +3...)" },
      { id: "mi_2", term: "Negative Integer", definition: "Whole numbers less than zero located to the left of zero (-1, -2, -3...)" },
      { id: "mi_3", term: "Zero", definition: "The central reference point on the number line; neither positive nor negative." },
      { id: "mi_4", term: "Additive Inverse", definition: "A number that yields zero when added to another (e.g. +7 and -7)." },
      { id: "mi_5", term: "Absolute Value", definition: "The non-negative distance of an integer from zero on the number line." }
    ],
    sequenceSteps: [
      { id: 1, text: "1. Locate the starting integer (-4) on the number line", order: 1 },
      { id: 2, text: "2. Look at the operation: Adding a positive number (+6)", order: 2 },
      { id: 3, text: "3. Move 6 steps to the right on the number line", order: 3 },
      { id: 4, text: "4. Arrive at the sum: +2", order: 4 }
    ],
    signalTarget: { id: "inverse_target", label: "Additive Inverse of -8 is (+8)" },
    signalNoise: [
      { id: "mn1", label: "-16" },
      { id: "mn2", label: "0" },
      { id: "mn3", label: "-1" },
      { id: "mn4", label: "+18" },
      { id: "mn5", label: "-64" }
    ],
    bossQuestion: {
      question: "At 6:00 AM, the temperature in Leh was -5°C. By afternoon, it rose by 8°C. What was the afternoon temperature?",
      options: [
        { id: "mb1", text: "-13°C", isCorrect: false },
        { id: "mb2", text: "+3°C", isCorrect: true },
        { id: "mb3", text: "+13°C", isCorrect: false },
        { id: "mb4", text: "-3°C", isCorrect: false }
      ],
      hints: [
        "Rising temperature means adding: -5 + 8.",
        "Start at -5 on the number line and jump 8 steps right!"
      ]
    },
    missionNodes: [
      { id: "mm1", title: "Number Line", description: "Positive & negative values", status: "completed" },
      { id: "mm2", title: "Integer Add/Sub", description: "Jumping across zero", status: "current" },
      { id: "mm3", title: "Integer Multiply", description: "Rules of signed products", status: "locked" },
      { id: "mm4", title: "Cosmic Calculator", description: "Final integer mastery", status: "locked" }
    ]
  }
};

export default function GamesContainer() {
  const [selectedCurriculum, setSelectedCurriculum] = useState('science_plants');
  const [activeGameTab, setActiveGameTab] = useState('match');
  const [quietMode, setQuietMode] = useState(false);
  const [points, setPoints] = useState(120);

  const curr = CURRICULUM_DATA[selectedCurriculum];

  const handleGameSuccess = (bonus = 20) => {
    setPoints(prev => prev + bonus);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              title="Return to Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <span>NCERT Focus Quest Arena</span>
                <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full">
                  Non-Punitive
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Low-stress bite-sized learning challenges with zero countdown timers</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Points Tracker */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-2xl text-amber-900 font-extrabold text-sm shadow-sm">
              <Award className="w-4 h-4 text-amber-600" />
              <span>{points} Mastery Stars</span>
            </div>

            {/* Quiet Mode Toggle */}
            <button
              onClick={() => setQuietMode(!quietMode)}
              className={`p-2 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                quietMode
                  ? 'bg-purple-100 border-purple-300 text-purple-900'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              title="Toggle Calm / Quiet Mode"
            >
              {quietMode ? <VolumeX className="w-4 h-4 text-purple-700" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{quietMode ? 'Quiet Mode On' : 'Calm Audio'}</span>
            </button>
          </div>
        </div>

        {/* Curriculum Subject Selector */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider pl-2">Subject:</span>
          <button
            onClick={() => setSelectedCurriculum('science_plants')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              selectedCurriculum === 'science_plants'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Class 7 Science: Plant Nutrition</span>
          </button>
          <button
            onClick={() => setSelectedCurriculum('math_integers')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              selectedCurriculum === 'math_integers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Class 7 Math: Integers</span>
          </button>
        </div>

        {/* Game Mode Tab Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => setActiveGameTab('match')}
            className={`p-3 rounded-2xl text-xs font-extrabold transition-all text-center border ${
              activeGameTab === 'match'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🧩 Concept Match
          </button>
          <button
            onClick={() => setActiveGameTab('sequence')}
            className={`p-3 rounded-2xl text-xs font-extrabold transition-all text-center border ${
              activeGameTab === 'sequence'
                ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🔄 Build Sequence
          </button>
          <button
            onClick={() => setActiveGameTab('signal')}
            className={`p-3 rounded-2xl text-xs font-extrabold transition-all text-center border ${
              activeGameTab === 'signal'
                ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🎯 Find the Signal
          </button>
          <button
            onClick={() => setActiveGameTab('boss')}
            className={`p-3 rounded-2xl text-xs font-extrabold transition-all text-center border ${
              activeGameTab === 'boss'
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🏆 Boss Challenge
          </button>
          <button
            onClick={() => setActiveGameTab('map')}
            className={`p-3 rounded-2xl text-xs font-extrabold transition-all text-center border col-span-2 sm:col-span-1 ${
              activeGameTab === 'map'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🗺️ Mission Map
          </button>
        </div>

        {/* Companion Avatar Guide */}
        <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <GamifiedAvatar 
            state={activeGameTab === 'boss' ? 'thinking' : activeGameTab === 'map' ? 'idle' : 'answering'}
            size="md"
            message={
              activeGameTab === 'boss'
                ? "Conquer the boss question to prove your mastery!"
                : activeGameTab === 'match'
                ? "Match corresponding concepts — take your time!"
                : activeGameTab === 'sequence'
                ? "Arrange the scientific order step by step!"
                : activeGameTab === 'signal'
                ? "Find the target term hidden in the noise!"
                : "Explore your learning path milestone by milestone."
            }
          />
        </div>

        {/* Active Mini-Challenge Container */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-fadeIn">
          {activeGameTab === 'match' && (
            <ConceptMatch
              difficulty="easy"
              conceptPairs={curr.conceptPairs}
            />
          )}

          {activeGameTab === 'sequence' && (
            <BuildTheSequence
              difficulty="easy"
              sequenceSteps={curr.sequenceSteps}
            />
          )}

          {activeGameTab === 'signal' && (
            <FindTheSignal
              difficulty="easy"
              target={curr.signalTarget}
              noise={curr.signalNoise}
            />
          )}

          {activeGameTab === 'boss' && (
            <BossQuestion
              difficulty="easy"
              question={curr.bossQuestion.question}
              options={curr.bossQuestion.options}
              hints={curr.bossQuestion.hints}
            />
          )}

          {activeGameTab === 'map' && (
            <MissionMap
              difficulty="easy"
              nodes={curr.missionNodes}
            />
          )}
        </div>

        {/* Gentle Encouragement Footer */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-center">
          <p className="text-xs text-indigo-900 font-medium flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Learning is an adventure. Take breaks whenever you need, undo your moves anytime, and explore freely!</span>
          </p>
        </div>

      </div>
    </div>
  );
}
