import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  MapPin, 
  Heart, 
  MessageSquare, 
  ShieldCheck, 
  Shield,
  User as UserIcon, 
  Menu, 
  X, 
  ChevronDown,
  Sparkles,
  Plus,
  CheckCircle2,
  Calendar,
  Bell,
  ArrowRight
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
  universities: University[];
  selectedUniversityId: string;
  onSelectUniversity: (uniId: string) => void;
  onOpenAddModal?: () => void;
  onNavigateStudentTab?: (tab: 'inspections' | 'saved' | 'chats' | 'profile') => void;
  onNavigateAgentTab?: (tab: 'schedule' | 'availability' | 'requests' | 'profile') => void;
  onOpenAdminLoginModal?: () => void;
  studentTab?: 'inspections' | 'saved' | 'chats' | 'profile';
  agentTab?: 'schedule' | 'availability' | 'requests' | 'profile';
  onReplayTour?: () => void;
  onReplayOnboarding?: () => void;
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
  universities,
  selectedUniversityId,
  onSelectUniversity,
  onOpenAddModal,
  onNavigateStudentTab,
  onNavigateAgentTab,
  onOpenAdminLoginModal,
  studentTab,
  agentTab,
  onReplayTour,
  onReplayOnboarding
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uniDropdownOpen, setUniDropdownOpen] = useState(false);

  const selectedUni = universities.find(u => u.id === selectedUniversityId);
  const isPublicView = activeView === 'landing' || activeView === 'onboarding';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ==========================================
            LEFT ZONE: BRAND LOGO + CAMPUS SELECTOR
           ========================================== */}
        <div className="flex items-center gap-3 md:gap-5 shrink-0">
          <button 
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-2 group text-left focus:outline-none cursor-pointer py-1"
          >
            <img src="/favicon.svg" alt="Dormiqa Map Pin" className="h-7 sm:h-8 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform" />
            <div className="flex items-center gap-2">
              <span className="font-black text-lg sm:text-xl tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
                DORMIQA
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600" title="100% Verified Platform"></span>
              </span>
              {currentRole === 'agent' && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-emerald-400 border border-slate-800 tracking-wider uppercase">
                  <Building2 className="w-3 h-3 text-emerald-400" />
                  Agent Portal
                </span>
              )}
            </div>
          </button>

          {/* Desktop Institution Selector (For Authenticated Students) */}
          {!isPublicView && currentRole !== 'agent' && (
            <div className="relative hidden md:block border-l border-neutral-200 dark:border-neutral-800 pl-4">
              <button
                onClick={() => setUniDropdownOpen(!uniDropdownOpen)}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate max-w-[110px]">{selectedUni ? selectedUni.code : 'University'}</span>
                <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
              </button>

              {uniDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-2 z-50 animate-in fade-in">
                  <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Select Campus
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {universities.map((uni) => (
                      <button
                        key={uni.id}
                        onClick={() => {
                          onSelectUniversity(uni.id);
                          setUniDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                          selectedUniversityId === uni.id ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <span className="truncate">{uni.name}</span>
                        {uni.id !== 'uniosun' ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0 ml-1">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold shrink-0 ml-1">
                            LIVE
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==========================================
            CENTER ZONE: DESKTOP PRIMARY NAVIGATION
           ========================================== */}
        {!isPublicView && (
          <nav className="hidden lg:flex items-center gap-1 bg-neutral-100/80 dark:bg-neutral-800/80 p-1.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-inner max-w-md mx-auto">
            {currentRole === 'agent' ? (
              /* AGENT NAVIGATION TABS */
              <>
                <button
                  onClick={() => {
                    setActiveView('agent-dash');
                    if (onNavigateAgentTab) onNavigateAgentTab('schedule');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'agent-dash' && (agentTab === 'schedule' || !agentTab)
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    setActiveView('agent-dash');
                    if (onNavigateAgentTab) onNavigateAgentTab('availability');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'agent-dash' && agentTab === 'availability'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Hostels</span>
                </button>

                <button
                  onClick={() => {
                    setActiveView('agent-dash');
                    if (onNavigateAgentTab) onNavigateAgentTab('requests');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'agent-dash' && agentTab === 'requests'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>Messages</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-black rounded-md bg-purple-600 text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveView('agent-dash');
                    if (onNavigateAgentTab) onNavigateAgentTab('schedule');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'agent-dash' && agentTab === 'schedule'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Calendar</span>
                </button>
              </>
            ) : (
              /* STUDENT NAVIGATION TABS */
              <>
                <button
                  onClick={() => setActiveView('search')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'search'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Discover</span>
                </button>

                <button
                  onClick={() => {
                    setActiveView('saved');
                    if (onNavigateStudentTab) onNavigateStudentTab('saved');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'saved'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Saved</span>
                  {savedCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-black rounded-md bg-rose-500 text-white">
                      {savedCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveView('student-dash');
                    if (onNavigateStudentTab) onNavigateStudentTab('chats');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'messages'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Messages</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-black rounded-md bg-blue-600 text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveView(currentRole === 'admin' ? 'admin-dash' : 'student-dash')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeView.includes('dash')
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300 shrink-0" />
                  <span>Dashboard</span>
                </button>
              </>
            )}
          </nav>
        )}

        {/* ==========================================
            RIGHT ZONE: ACTIONS & CONTROLS
           ========================================== */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Theme Dropdown Toggle */}
          <ThemeToggle variant="dropdown" />

          {isPublicView ? (
            /* PUBLIC HEADER ACTIONS */
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('onboarding')}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-neutral-900 text-white font-extrabold text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                Sign In
              </button>

              {onOpenAdminLoginModal && (
                <button
                  onClick={onOpenAdminLoginModal}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors cursor-pointer focus:outline-none"
                  title="Admin Access"
                  aria-label="Admin Access"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            /* AUTHENTICATED HEADER ACTIONS */
            <>
              {/* Desktop Guided Tour Button */}
              {onReplayTour && (
                <button
                  onClick={onReplayTour}
                  className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors text-xs font-bold cursor-pointer"
                  title="Launch Guided Feature Tour"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Tour</span>
                </button>
              )}

              {/* Real-Time Notification Bell Button */}
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-neutral-50 dark:bg-neutral-800 hover:bg-emerald-50/40 text-neutral-800 dark:text-neutral-200 transition-all active:scale-95 shadow-2xs flex items-center justify-center cursor-pointer"
                title="View Notifications"
                aria-label="View Notifications"
              >
                <Bell className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                {notificationUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-black text-[9px] px-1 py-0.2 rounded-full min-w-[16px] text-center shadow-xs">
                    {notificationUnreadCount}
                  </span>
                )}
              </button>

              {/* Account Role Badge (Desktop) */}
              <span className="hidden xl:inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="capitalize">{currentRole}</span>
              </span>

              {/* Three-line Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-slate-900 dark:hover:border-white bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-bold text-xs transition-all active:scale-95 shadow-2xs cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-rose-600" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-900 dark:text-white" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ==========================================
          MOBILE & RESPONSIVE SLIDE-DOWN DRAWER MENU
         ========================================== */}
      {mobileMenuOpen && !isPublicView && (
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white/98 dark:bg-neutral-900/98 backdrop-blur-lg px-4 sm:px-6 py-5 shadow-2xl animate-in slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-5">
            
            {/* Account Role Banner & Campus Selector (Mobile) */}
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-neutral-700 text-emerald-400 flex items-center justify-center font-black text-xs shrink-0">
                  {currentRole.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-black text-neutral-900 dark:text-white block capitalize">
                    {currentRole} Account
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    DORMIQA Verified User
                  </span>
                </div>
              </div>

              {/* Mobile Campus Selector */}
              {currentRole !== 'agent' && (
                <div className="relative">
                  <select
                    value={selectedUniversityId}
                    onChange={(e) => onSelectUniversity(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 cursor-pointer focus:outline-none"
                  >
                    {universities.map((uni) => (
                      <option key={uni.id} value={uni.id}>
                        {uni.name} ({uni.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Navigation Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              
              {/* STUDENT ROLE OPTIONS */}
              {currentRole === 'student' && (
                <>
                  <button
                    onClick={() => { setActiveView('search'); setMobileMenuOpen(false); }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      activeView === 'search'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
                        : 'bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Search className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">Discover Hostels</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Search verified student lodges</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('saved'); 
                      if (onNavigateStudentTab) onNavigateStudentTab('saved');
                      setMobileMenuOpen(false); 
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      activeView === 'saved'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                        : 'bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border-neutral-200 dark:border-neutral-700'
                    }`}
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
                      <span className="bg-rose-600 text-white text-xs font-black px-2 py-0.5 rounded-md">
                        {savedCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('student-dash'); 
                      if (onNavigateStudentTab) onNavigateStudentTab('chats');
                      setMobileMenuOpen(false); 
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      activeView === 'messages'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800'
                        : 'bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block">Messages & Enquiries</span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Direct student chat threads</span>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs font-black px-2 py-0.5 rounded-md">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('student-dash'); 
                      if (onNavigateStudentTab) onNavigateStudentTab('inspections');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center gap-3 transition-all cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">Inspection Schedule</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Booked tours & appointments</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('student-dash'); 
                      if (onNavigateStudentTab) onNavigateStudentTab('profile');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center gap-3 transition-all cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">Student Dashboard</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Profile & account settings</span>
                    </div>
                  </button>
                </>
              )}

              {/* AGENT ROLE OPTIONS */}
              {currentRole === 'agent' && (
                <>
                  <button
                    onClick={() => { 
                      if (onOpenAddModal) onOpenAddModal();
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-800 text-left flex items-center gap-3 transition-all cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Plus className="w-5 h-5 font-black" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 block">+ Add New Hostel</span>
                      <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">Post listing with video tour</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('agent-dash'); 
                      if (onNavigateAgentTab) onNavigateAgentTab('availability');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center gap-3 transition-all cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">Manage Hostels</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Update unit room vacancies</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('agent-dash'); 
                      if (onNavigateAgentTab) onNavigateAgentTab('requests');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center justify-between transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block">Student Messages</span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Student chat enquiries & tours</span>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-rose-600 text-white text-xs font-black px-2 py-0.5 rounded-md">
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
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center gap-3 transition-all cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">Inspection Calendar</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Tour appointments & schedules</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { 
                      setActiveView('agent-dash'); 
                      if (onNavigateAgentTab) onNavigateAgentTab('profile');
                      setMobileMenuOpen(false); 
                    }}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-left flex items-center gap-3 transition-all cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">Agent Profile</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Agency registration & settings</span>
                    </div>
                  </button>
                </>
              )}

              {/* ADMIN ROLE OPTION */}
              {currentRole === 'admin' && (
                <button
                  onClick={() => { setActiveView('admin-dash'); setMobileMenuOpen(false); }}
                  className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-left flex items-center gap-3 transition-all cursor-pointer sm:col-span-2 md:col-span-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-900 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-purple-300" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-purple-950 dark:text-purple-200 block">Admin Oversight Portal</span>
                    <span className="text-[11px] text-purple-800 dark:text-purple-400">Verification & platform safety</span>
                  </div>
                </button>
              )}
            </div>

            {/* Portal Switcher & Guided Tour Trigger */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  const targetRole = currentRole === 'agent' ? 'student' : 'agent';
                  setCurrentRole(targetRole);
                  setActiveView(targetRole === 'agent' ? 'agent-dash' : 'search');
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Switch to {currentRole === 'agent' ? 'Student View' : 'Agent Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {onReplayTour && (
                <button
                  onClick={() => {
                    if (onReplayTour) onReplayTour();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Replay Guided Tour</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

