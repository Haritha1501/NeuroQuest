import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, Home, BookOpen, Award, Settings, LogOut, Heart, 
  ShieldCheck, Gamepad2, Menu, X, ZoomIn, ZoomOut, RotateCcw, Type, Compass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Navbar = () => {
  const { user, logout, hasCompletedOnboarding } = useAuth();
  const { primaryColor, secondaryColor, fontScale, updatePreferences, paletteType } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showZoomHelp, setShowZoomHelp] = useState(false);
  const [zoomToast, setZoomToast] = useState('');

  const isActive = (path) => location.pathname === path;

  const handleResetZoom = () => {
    // Reset font scale
    updatePreferences({ font_scale: 'medium' }).catch(() => {});
    setZoomToast('View scale reset! If your browser is zoomed, press Ctrl + 0 (or Cmd + 0 on Mac) to restore 100% browser view.');
    setTimeout(() => setZoomToast(''), 5000);
  };

  const handleFontScaleChange = (scale) => {
    updatePreferences({ font_scale: scale }).catch(() => {});
    setZoomToast(`Font scale set to ${scale}!`);
    setTimeout(() => setZoomToast(''), 2500);
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/95 border-b border-slate-200/80 shadow-sm transition-colors w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
              NeuroQuest
            </span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-indigo-600 -mt-1">
              Adaptive Learning
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        {user && (
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70">
            {hasCompletedOnboarding ? (
              <>
                <Link
                  to="/home"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/home')
                      ? 'bg-white text-indigo-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>

                <Link
                  to="/session"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/session')
                      ? 'bg-white text-indigo-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Quest Room</span>
                </Link>

                <Link
                  to="/mastery"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/mastery')
                      ? 'bg-white text-purple-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Compass className="w-4 h-4 text-purple-600" />
                  <span>Skill Universe</span>
                </Link>

                <Link
                  to="/games"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/games')
                      ? 'bg-white text-indigo-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4 text-emerald-600" />
                  <span>Games Arena</span>
                </Link>

                <Link
                  to="/progress"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/progress')
                      ? 'bg-white text-indigo-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Stars</span>
                </Link>

                <Link
                  to="/caregiver"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/caregiver') || isActive('/dashboard/caregiver')
                      ? 'bg-white text-indigo-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Caregiver View</span>
                </Link>

                {user?.role === 'educator' && (
                  <Link
                    to="/dashboard/educator"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive('/dashboard/educator')
                        ? 'bg-white text-indigo-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-purple-600" />
                    <span>Educator Map</span>
                  </Link>
                )}

                <Link
                  to="/settings"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/settings')
                      ? 'bg-white text-indigo-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Settings className="w-4 h-4 text-indigo-500" />
                  <span>Sensory Theme</span>
                </Link>
              </>
            ) : (
              <Link
                to="/onboarding"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <Heart className="w-4 h-4" />
                <span>Caregiver Onboarding</span>
              </Link>
            )}
          </nav>
        )}

        {/* User Account & Quick Display Controls */}
        <div className="flex items-center gap-2">
          
          {/* Quick Display / Zoom Helper Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowZoomHelp(!showZoomHelp)}
              title="Display & Zoom Settings"
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200/80 flex items-center gap-1 text-xs font-bold"
            >
              <Type className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Display</span>
            </button>

            {showZoomHelp && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-indigo-600" />
                    Display & Zoom Controls
                  </span>
                  <button onClick={() => setShowZoomHelp(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Reset View Button */}
                <div>
                  <button
                    onClick={handleResetZoom}
                    className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all border border-indigo-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset View (100% Scale)</span>
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1 text-center font-medium">
                    Shortcut: Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[9px] font-mono font-bold">Ctrl + 0</kbd> to reset browser zoom.
                  </p>
                </div>

                {/* Font Scaling Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600">Font Legibility Size:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'small', label: 'A-', title: 'Small' },
                      { id: 'medium', label: 'A', title: 'Default' },
                      { id: 'large', label: 'A+', title: 'Large' },
                      { id: 'xlarge', label: 'A++', title: 'X-Large' }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => handleFontScaleChange(btn.id)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          fontScale === btn.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={btn.title}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <Link
                    to="/settings"
                    onClick={() => setShowZoomHelp(false)}
                    className="text-[11px] text-indigo-600 hover:underline font-bold block text-center"
                  >
                    More Sensory & Theme Options →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-bold text-slate-800">{user.full_name}</span>
                <span className="text-xs text-slate-500 capitalize">{user.role}</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Logout"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-bold text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>

      </div>

      {/* Floating Toast Notification */}
      {zoomToast && (
        <div className="bg-indigo-900 text-white text-xs font-semibold px-4 py-2.5 text-center transition-all animate-fade-in shadow-md flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{zoomToast}</span>
          <button onClick={() => setZoomToast('')} className="ml-2 text-indigo-300 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && user && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top duration-200">
          <Link
            to="/home"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
              isActive('/home') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <Link
            to="/session"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
              isActive('/session') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Quest Room</span>
          </Link>
          <Link
            to="/mastery"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
              isActive('/mastery') ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-4 h-4 text-purple-600" />
            <span>Skill Universe</span>
          </Link>
          <Link
            to="/games"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
              isActive('/games') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-emerald-600" />
            <span>Games Arena</span>
          </Link>
          <Link
            to="/progress"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
              isActive('/progress') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Stars & Badges</span>
          </Link>
          <Link
            to="/caregiver"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
              isActive('/caregiver') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Caregiver View</span>
          </Link>
          {user?.role === 'educator' && (
            <Link
              to="/dashboard/educator"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                isActive('/dashboard/educator') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Compass className="w-4 h-4 text-purple-600" />
              <span>Educator Map</span>
            </Link>
          )}
          <Link
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
              isActive('/settings') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4 text-indigo-500" />
            <span>Sensory Theme & Settings</span>
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navbar;
