import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  MapPin, 
  Heart, 
  MessageSquare, 
  ShieldCheck, 
  User as UserIcon, 
  Menu, 
  X, 
  ChevronDown,
  Sparkles,
  Plus,
  CheckCircle2,
  Calendar,
  Bell
} from 'lucide-react';
import { UserRole, University } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  activeView: 'landing' | 'onboarding' | 'business-verification' | 'search' | 'saved' | 'messages' | 'student-dash' | 'agent-dash' | 'admin-dash';
  setActiveView: (view: 'landing' | 'onboarding' | 'business-verification' | 'search' | 'saved' | 'messages' | 'student-dash' | 'agent-dash' | 'admin-dash') => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  savedCount: number;
  unreadCount: number;
  notificationUnreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenAISearch?: () => void;
  universities: University[];
  selectedUniversityId: string;
  onSelectUniversity: (uniId: string) => void;
  onOpenAddModal?: () => void;
  onNavigateStudentTab?: (tab: 'inspections' | 'saved' | 'chats' | 'profile') => void;
  onNavigateAgentTab?: (tab: 'schedule' | 'availability' | 'requests' | 'profile') => void;
  studentTab?: 'inspections' | 'saved' | 'chats' | 'profile';
  agentTab?: 'schedule' | 'availability' | 'requests' | 'profile';
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  currentRole,
  setCurrentRole,
  savedCount,
  unreadCount,
  notificationUnreadCount = 0,
  onOpenNotifications,
  onOpenAISearch,
  universities,
  selectedUniversityId,
  onSelectUniversity,
  onOpenAddModal,
  onNavigateStudentTab,
  onNavigateAgentTab,
  studentTab,
  agentTab
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uniDropdownOpen, setUniDropdownOpen] = useState(false);

  const selectedUni = universities.find(u => u.id === selectedUniversityId);

  const isPublicView = activeView === 'landing' || activeView === 'onboarding';

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left Brand Logo & University Quick Picker */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-2 group text-left focus:outline-none"
          >
            <img src="/favicon.svg" alt="Campora Map Pin" className="h-8 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform" />
            <div>
              <span className="font-black text-xl tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
                CAMPORA
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600" title="100% Verified Platform"></span>
              </span>
            </div>
          </button>

          {/* University Selector Button (only when authenticated) */}
          {!isPublicView && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setUniDropdownOpen(!uniDropdownOpen)}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>{selectedUni ? selectedUni.code : 'Select University'}</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {uniDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-neutral-900 rounded-md shadow-md border border-neutral-200 dark:border-neutral-700 py-1.5 z-50 animate-in fade-in">
                  <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Popular Universities
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {universities.map((uni) => (
                      <button
                        key={uni.id}
                        onClick={() => {
                          onSelectUniversity(uni.id);
                          setUniDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50 transition-colors ${
                          selectedUniversityId === uni.id ? 'font-bold text-neutral-900 bg-neutral-100' : 'text-neutral-700'
                        }`}
                      >
                        <span className="truncate">{uni.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 font-medium">
                          {uni.city}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center / Right Nav Items */}
        {isPublicView ? (
          <div className="flex items-center gap-3">
            {/* Device / Dark / Light Theme Toggle in Public View */}
            <ThemeToggle variant="dropdown" />
            
            <button
              onClick={() => setActiveView('onboarding')}
              className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-all shadow-2xs"
            >
              Sign In / Get Started
            </button>
          </div>
        ) : (
          /* Post-Onboarding Navigation: Clean Header with Theme Toggle + Bell + Role Badge + Hamburger Menu */
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Device / Dark / Light Theme Toggle */}
            <ThemeToggle variant="dropdown" />

            {/* Gemini AI Assistant Button */}
            {onOpenAISearch && (
              <button
                onClick={onOpenAISearch}
                className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 transition-all active:scale-95 shadow-2xs flex items-center gap-1.5 font-bold text-xs"
                title="AI Housing Search & Chatbot Advisor"
              >
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">AI Search & Chat</span>
              </button>
            )}

            {/* Real-Time Notification Bell Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 sm:px-3 sm:py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-emerald-600 dark:hover:border-emerald-500 bg-neutral-50 dark:bg-neutral-800 hover:bg-emerald-50/50 text-neutral-900 dark:text-neutral-100 transition-all active:scale-95 shadow-xs flex items-center gap-1.5"
              title="View Real-Time Notifications"
            >
              <Bell className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
              {notificationUnreadCount > 0 && (
                <span className="bg-rose-600 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-2xs">
                  {notificationUnreadCount}
                </span>
              )}
            </button>

            {/* Account Role Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="capitalize">{currentRole} Account</span>
            </span>

            {/* Three-line Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-slate-900 dark:hover:border-white bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-extrabold text-xs transition-all active:scale-95 shadow-xs"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-rose-600" />
              ) : (
                <Menu className="w-5 h-5 text-slate-900" />
              )}
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        )}
      </div>

      {/* Slide-down Dropdown Menu Drawer (Triggered by 3-Line Menu Button) */}
      {mobileMenuOpen && !isPublicView && (
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 sm:px-8 py-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Theme Selector Section in Drawer */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-extrabold text-neutral-900 dark:text-white block">Appearance & Theme Sync</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Match your device's light or dark mode settings automatically</span>
              </div>
              <ThemeToggle variant="full" className="w-full sm:w-auto min-w-[260px]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              
              {/* STUDENT ROLE NAVIGATION OPTIONS */}
              {currentRole === 'student' && (
                <>
                  <button
                    onClick={() => { setActiveView('search'); setMobileMenuOpen(false); }}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center shrink-0">
                      <Search className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">Explore page</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Search student lodges & hotels</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('saved'); 
                      if (onNavigateStudentTab) onNavigateStudentTab('saved');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block">Saved Properties</span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Bookmarked accommodations</span>
                      </div>
                    </div>
                    {savedCount > 0 && (
                      <span className="bg-rose-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                        {savedCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('student-dash'); 
                      if (onNavigateStudentTab) onNavigateStudentTab('inspections');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">Requests & Tours</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Track inspection appointments</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('student-dash'); 
                      if (onNavigateStudentTab) onNavigateStudentTab('profile');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">Student Profile</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Account settings & verification</span>
                    </div>
                  </button>
                </>
              )}

              {/* AGENT ROLE NAVIGATION OPTIONS */}
              {currentRole === 'agent' && (
                <>
                  <button
                    onClick={() => { setActiveView('search'); setMobileMenuOpen(false); }}
                    className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Search className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">Explore page</span>
                      <span className="text-[11px] text-neutral-500">View walking map listings</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      if (onOpenAddModal) onOpenAddModal();
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-300 text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Plus className="w-5 h-5 font-bold" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-emerald-950 block">+ Add new listing</span>
                      <span className="text-[11px] text-emerald-800 font-medium">Publish hotel with 360° video</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('agent-dash'); 
                      if (onNavigateAgentTab) onNavigateAgentTab('availability');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">Check / update availability</span>
                      <span className="text-[11px] text-neutral-500">Toggle live vacancies & room status</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('agent-dash'); 
                      if (onNavigateAgentTab) onNavigateAgentTab('requests');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block">Requests</span>
                        <span className="text-[11px] text-neutral-500">Student chat enquiries & tours</span>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-rose-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('agent-dash'); 
                      if (onNavigateAgentTab) onNavigateAgentTab('schedule');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">Schedule</span>
                      <span className="text-[11px] text-neutral-500">Tour appointments & inspections</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('agent-dash'); 
                      if (onNavigateAgentTab) onNavigateAgentTab('profile');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">Agent Profile</span>
                      <span className="text-[11px] text-neutral-500">Agency registration & settings</span>
                    </div>
                  </button>
                </>
              )}

              {currentRole === 'admin' && (
                <button
                  onClick={() => { setActiveView('admin-dash'); setMobileMenuOpen(false); }}
                  className="p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-left flex items-center gap-3 transition-all sm:col-span-2 md:col-span-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-900 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-purple-300" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-purple-950 block">Admin Oversight Portal</span>
                    <span className="text-[11px] text-purple-800">Verification & platform safety</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

