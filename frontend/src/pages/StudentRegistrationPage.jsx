import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, ShieldCheck, Heart, Sparkles, BookOpen, 
  CheckCircle, ArrowRight, Info, AlertCircle, Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createStudent, getNCERTStandards } from '../services/api';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AudioButton from '../components/common/AudioButton';

const INTEREST_OPTIONS = [
  'Space & Astronomy',
  'Robotics & Coding',
  'Dinosaurs & Prehistory',
  'Animals & Wildlife',
  'Puzzles & Logic',
  'Drawing & Creative Art',
  'Music & Rhythm',
  'Vehicles & Aviation',
  'Gaming & World Building',
  'Earth & Nature Science'
];

const GRADE_OPTIONS = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'
];

const StudentRegistrationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [standardsList, setStandardsList] = useState(GRADE_OPTIONS);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    grade: 'Class 6',
    school_level: 'Middle School',
    school_name: '',
    preferred_language: 'English',
    interests: [],
    learning_environment: 'Quiet Space with Visual Cues',
    guardian_consent: true,
    notes: ''
  });

  React.useEffect(() => {
    getNCERTStandards()
      .then(res => {
        if (res.data?.standards?.length) {
          const filtered = res.data.standards.filter(s => !s.grade || (s.grade >= 1 && s.grade <= 10));
          setStandardsList(filtered.map(s => s.standard_name || `Class ${s.grade}`));
        }
      })
      .catch(() => {});
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleInterest = (interest) => {
    setFormData(prev => {
      const exists = prev.interests.includes(interest);
      const updated = exists
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.first_name.trim()) {
      setError('Please enter the student\'s first name.');
      return;
    }

    if (!formData.guardian_consent) {
      setError('Parent / Caregiver consent is required to proceed.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        age: parseInt(formData.age, 10) || 12,
        grade: formData.grade,
        school_level: formData.school_level,
        school_name: formData.school_name.trim() || undefined,
        preferred_language: formData.preferred_language,
        interests: formData.interests.length > 0 ? formData.interests : ['Science', 'Puzzles'],
        learning_environment: formData.learning_environment,
        guardian_consent: formData.guardian_consent
      };

      const res = await createStudent(payload);
      const student = res.data;

      // Extract integer grade number (1 to 10)
      const gradeNum = parseInt(formData.grade.replace(/\D/g, ''), 10) || 6;

      // Persist active student context
      localStorage.setItem('neuroquest_active_student_id', student.id);
      localStorage.setItem('neuroquest_active_student_name', student.name);
      localStorage.setItem('neuroquest_active_student_grade', gradeNum.toString());

      // Navigate to the 20-Question Baseline Screening wizard
      navigate(`/student-screening/${student.id}`);
    } catch (err) {
      console.error('Failed to register student:', err);
      const msg = err.response?.data?.detail || err.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const caretakerName = user?.full_name || user?.username || 'Caretaker';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        {/* Caretaker Identity Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-indigo-100 mb-3 border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                Verified Caregiver / Guardian Account
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {caretakerName}
              </h1>
              <p className="text-indigo-200 text-sm mt-1 max-w-2xl">
                You are setting up a learner profile. After registration, you will complete the 
                <span className="font-semibold text-white"> 20-Question Baseline Assessment</span> to personalize quest pacing, density, and sensory tools.
              </p>
            </div>

            <AudioButton
              text={`Welcome, ${caretakerName}. Register your student here. You will then complete a 20-question baseline assessment to personalize their learning experience.`}
              label="Listen Guide"
              className="self-start sm:self-center"
            />
          </div>
        </div>

        {/* Step Flow Tracker */}
        <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center text-xs font-semibold">
          <div className="flex items-center justify-center gap-2 text-indigo-700 bg-indigo-50 py-2.5 rounded-xl border border-indigo-100">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
            <span>Student Profile</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-500 py-2.5 rounded-xl">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">2</span>
            <span>20-Q Screening</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-500 py-2.5 rounded-xl">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">3</span>
            <span>Support Baseline</span>
          </div>
        </div>

        {/* Non-Diagnostic Notice */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-emerald-950 text-sm">
          <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-emerald-900">Educational Personalization Notice (Non-Diagnostic)</p>
            <p className="text-emerald-800 text-xs sm:text-sm leading-relaxed">
              NeuroQuest uses this information solely to adapt UI contrast, card density, text-to-speech, and instructional scaffolding. It does not provide medical diagnoses or replace evaluations by qualified clinicians or specialists.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-8">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Student Learner Information
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Please provide details about the student who will be using NeuroQuest.
            </p>
          </div>

          {/* Names & Age */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Student first name"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Last Name (Optional)
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Student last name"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Age (Years) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="4"
                max="25"
                required
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 11"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium transition-colors"
              />
            </div>
          </div>

          {/* Grade & School Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Grade / Class Level
              </label>
              <select
                value={formData.grade}
                onChange={e => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-semibold transition-colors"
              >
                {standardsList.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <span className="text-xs text-slate-400 mt-1 block">Authentic NCERT curriculum tasks across Classes 1 to 10.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                School / Learning Stage
              </label>
              <select
                value={formData.school_level}
                onChange={e => setFormData({ ...formData, school_level: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium transition-colors"
              >
                <option value="Middle School">Middle School (Classes 6 to 8)</option>
                <option value="Primary School">Primary School (Classes 1 to 5)</option>
                <option value="Secondary School">Secondary School (Classes 9 to 10)</option>
                <option value="Inclusive / Specialized Program">Inclusive / Specialized Learning Center</option>
                <option value="Homeschool / Independent">Homeschool / Independent Study</option>
              </select>
            </div>
          </div>

          {/* Preferred Language & Environment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Preferred Interface Language
              </label>
              <select
                value={formData.preferred_language}
                onChange={e => setFormData({ ...formData, preferred_language: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium transition-colors"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Bilingual">Bilingual English + Simple English</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Preferred Learning Setting
              </label>
              <select
                value={formData.learning_environment}
                onChange={e => setFormData({ ...formData, learning_environment: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium transition-colors"
              >
                <option value="Quiet Space with Visual Cues">Quiet Space with Visual Cues</option>
                <option value="Visual and Audio Dual Narration">Visual and Audio Dual Narration</option>
                <option value="Hands-on Step-by-Step with Frequent Pauses">Hands-on Step-by-Step with Frequent Pauses</option>
                <option value="Classroom Companion Mode">Classroom Companion Mode</option>
              </select>
            </div>
          </div>

          {/* High-Interest Topics Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              High-Interest Topics & Themes
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Select topics the student loves. NeuroQuest uses these to frame math and science questions around their personal passions!
            </p>
            <div className="flex flex-wrap gap-2.5">
              {INTEREST_OPTIONS.map(interest => {
                const selected = formData.interests.includes(interest);
                return (
                  <button
                    type="button"
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      selected
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    {selected && <CheckCircle className="w-3.5 h-3.5" />}
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guardian Consent */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.guardian_consent}
                onChange={e => setFormData({ ...formData, guardian_consent: e.target.checked })}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                I confirm as parent, caregiver, or educational guardian that I am registering this student for personalized adaptive learning on NeuroQuest, and grant consent to calculate support preferences.
              </span>
            </label>
          </div>

          {/* Submit CTA */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/caregiver')}
              className="text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors"
            >
              Cancel & Return
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registering Student...</span>
                </>
              ) : (
                <>
                  <span>Continue to Learning Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default StudentRegistrationPage;
