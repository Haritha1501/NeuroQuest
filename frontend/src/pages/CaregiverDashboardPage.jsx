import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Heart, Clock, Award, CheckCircle, Sparkles, TrendingUp, BookOpen, 
  User, RefreshCw, UserPlus, ArrowRight, Play, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';
import { getCaregiverInsights, getStudents } from '../services/api';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AudioButton from '../components/common/AudioButton';

const CaregiverDashboardPage = () => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [insightsRes, studentsRes] = await Promise.all([
        getCaregiverInsights().catch(() => ({ data: null })),
        getStudents().catch(() => ({ data: [] }))
      ]);
      setInsights(insightsRes?.data);
      setStudents(studentsRes?.data || []);
    } catch (err) {
      console.error('Failed to fetch caregiver dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchStudent = (student) => {
    localStorage.setItem('neuroquest_active_student_id', student.id);
    localStorage.setItem('neuroquest_active_student_name', student.name);
    if (student.grade) {
      const gMatch = String(student.grade).match(/\d+/);
      if (gMatch) {
        localStorage.setItem('neuroquest_active_student_grade', gMatch[0]);
      }
    }
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  const learnerName = insights?.learner_name || (students[0]?.name) || 'Learner';
  const engagement = insights?.engagement_distribution || {};

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Non-Medical Privacy Safe
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Caregiver & Guardian Hub
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage registered students, baseline learning profiles, and engagement adaptations.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/student-registration')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Student</span>
            </button>

            <AudioButton
              text={`Caregiver Hub. Total registered students: ${students.length}. Total sessions completed: ${insights?.total_sessions || 0}.`}
              label="Listen Summary"
            />
          </div>
        </div>

        {/* Registered Students Section */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Registered Students & Baseline Assessments
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Each student has an individualized learning support and accommodation profile.
              </p>
            </div>
            
            <button
              onClick={() => navigate('/student-registration')}
              className="hidden sm:flex text-indigo-600 hover:text-indigo-800 text-xs font-bold items-center gap-1 transition-colors"
            >
              <span>+ Add Student</span>
            </button>
          </div>

          {students.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Students Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Register a student learner to start the personalized learning assessment and configure custom quests.
              </p>
              <button
                onClick={() => navigate('/student-registration')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Register First Student
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((stud) => (
                <div 
                  key={stud.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white space-y-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{stud.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {stud.grade || 'Class 7'} • Age {stud.age} • {stud.school_level || 'Middle School'}
                      </p>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 ${
                      stud.has_completed_screening
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {stud.has_completed_screening ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Screening Complete</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Screening Pending</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
                    {stud.has_completed_screening ? (
                      <>
                        <button
                          onClick={() => handleLaunchStudent(stud)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Launch Quest Experience</span>
                        </button>
                        <button
                          onClick={() => navigate(`/student-profile/${stud.id}`)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Profile</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => navigate(`/student-screening/${stud.id}`)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>Complete Assessment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Sessions</div>
            <div className="text-3xl font-black text-slate-900">{insights?.total_sessions || 0} Sessions</div>
            <div className="text-xs text-slate-500 font-medium">Completed learning quests</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tasks Completed</div>
            <div className="text-3xl font-black text-indigo-600">{insights?.total_tasks_completed || 0} Quests</div>
            <div className="text-xs text-slate-500 font-medium">Across all subjects</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Quest Stars</div>
            <div className="text-3xl font-black text-amber-500">{insights?.total_stars || 0} Stars</div>
            <div className="text-xs text-slate-500 font-medium">Earned reward points</div>
          </div>
        </div>

        {/* Broad Engagement Trend */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Session Interaction State Distribution
            </h2>
            <span className="text-xs text-slate-400 font-semibold">Broad non-medical signals</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center space-y-1">
              <div className="text-2xl font-black text-indigo-700">{engagement.focused_percentage || 70}%</div>
              <div className="text-xs font-bold text-slate-700">Focused & High Engagement</div>
              <div className="text-[10px] text-slate-500">Active problem solving</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 text-center space-y-1">
              <div className="text-2xl font-black text-amber-700">{engagement.attention_drift_percentage || 15}%</div>
              <div className="text-xs font-bold text-slate-700">Attention Drift</div>
              <div className="text-[10px] text-slate-500">Re-engaged with interest theme</div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-center space-y-1">
              <div className="text-2xl font-black text-rose-700">{engagement.fatigue_percentage || 15}%</div>
              <div className="text-xs font-bold text-slate-700">Possible Fatigue</div>
              <div className="text-[10px] text-slate-500">Supported by Calm Mode breaks</div>
            </div>
          </div>
        </div>

        {/* Effective Adaptations */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Commonly Effective UI & Learning Adaptations
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(insights?.effective_adaptations || []).map((adapt, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="text-sm font-bold text-slate-900">{adapt.adaptation}</div>
                <div className="text-xs text-slate-600">{adapt.impact}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Session History */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Recent Session History
          </h2>

          <div className="divide-y divide-slate-100">
            {(insights?.recent_sessions || []).map(sess => (
              <div key={sess.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-800">{sess.date}</div>
                  <div className="text-xs text-slate-500">{sess.tasks_completed} activities completed</div>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-full">
                  +{sess.points_earned} Stars
                </span>
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default CaregiverDashboardPage;
