import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Shield, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  GraduationCap, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Menu,
  X,
  Bell,
  Calendar,
  MessageSquare,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { University, User } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { UniversitySelector } from './UniversitySelector';
import { mapAuthError } from '../utils/authErrors';
import { supabase } from '../services/supabase';
import { 
  auth,
  registerWithEmail, 
  loginWithEmail, 
  resendVerificationEmail, 
  saveUserToFirestore,
  savePendingSignupProfile,
  fetchUserProfileFromFirestore
} from '../services/firebase';

interface AgentPortalLandingProps {
  universities: University[];
  onAgentAuthenticated: (agentUser: User) => void;
  onOpenAdminAccess: () => void;
  onGoToStudentView: () => void;
}

export const AgentPortalLanding: React.FC<AgentPortalLandingProps> = ({
  universities,
  onAgentAuthenticated,
  onOpenAdminAccess,
  onGoToStudentView
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Unverified Email Card state
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Form Fields
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentUniId, setAgentUniId] = useState('uniosun');
  const [agentUni, setAgentUni] = useState(universities[0]?.name || 'Osun State University (UNIOSUN)');
  const [agentPassword, setAgentPassword] = useState('');

  // Auto-advance when email is verified across tabs in the same browser
  useEffect(() => {
    if (!unverifiedEmail) return;
    let isMounted = true;

    const checkConfirmedSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (isMounted && user?.email_confirmed_at) {
          const profile = await fetchUserProfileFromFirestore(user.id) || await fetchUserProfileFromFirestore(user.email || '');
          const isApproved = profile?.businessVerificationStatus === 'approved' || profile?.isVerifiedAgent === true;
          const agentData: User = {
            id: user.id,
            name: profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Agent',
            email: user.email || unverifiedEmail,
            role: 'agent',
            phone: profile?.phone || user.user_metadata?.phone || agentPhone,
            agencyName: profile?.agencyName || user.user_metadata?.agency_name || agencyName,
            universityName: profile?.universityName || agentUni,
            isVerifiedAgent: isApproved,
            isEmailVerified: true,
            businessVerificationStatus: profile?.businessVerificationStatus || (isApproved ? 'approved' : 'none'),
            businessVerificationDetails: profile?.businessVerificationDetails,
            avatarUrl: profile?.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
            createdAt: profile?.createdAt || new Date().toISOString().split('T')[0]
          };
          setUnverifiedEmail(null);
          onAgentAuthenticated(agentData);
        }
      } catch (_) {}
    };

    checkConfirmedSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted && session?.user?.email_confirmed_at) {
        checkConfirmedSession();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [unverifiedEmail, onAgentAuthenticated, agentPhone, agencyName, agentUni]);

  // Top Drawer Navigation State
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light');

  const handleApplyTheme = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (mode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    setUnverifiedEmail(null);

    try {
      const regUser = await registerWithEmail(agentEmail.trim().toLowerCase(), agentPassword, {
        role: 'agent',
        full_name: agentName || agentEmail.split('@')[0],
        agency_name: agencyName || `${agentName || 'Agent'} Housing`,
        phone: agentPhone,
        university_id: agentUniId || 'uniosun',
        university_name: agentUni
      });

      const newAgentId = regUser?.id || (regUser as any)?.uid || auth.currentUser?.uid;
      if (newAgentId) {
        const newAgentProfile: User = {
          id: newAgentId,
          uid: newAgentId,
          name: agentName || agentEmail.split('@')[0],
          email: agentEmail.trim().toLowerCase(),
          role: 'agent',
          phone: agentPhone,
          agencyName: agencyName || `${agentName || 'Agent'} Housing`,
          universityId: agentUniId || 'uniosun',
          universityName: agentUni,
          isVerifiedAgent: false,
          isEmailVerified: false,
          businessVerificationStatus: 'none',
          avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
          createdAt: new Date().toISOString().split('T')[0]
        };

        await saveUserToFirestore(newAgentProfile).catch(() => {});
        onAgentAuthenticated(newAgentProfile);
        return;
      }

      setAuthError(null);
    } catch (err: any) {
      console.error("[AGENT SIGNUP] Error:", err);
      setAuthError(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    setUnverifiedEmail(null);

    try {
      const loggedInUser = await loginWithEmail(agentEmail.trim().toLowerCase(), agentPassword);

      const fbUser = loggedInUser || auth.currentUser;
      if (!fbUser) {
        const { data: { user: supaUser } } = await supabase.auth.getUser();
        if (!supaUser) throw new Error("Authentication failed.");
      }

      const activeUser = loggedInUser || auth.currentUser;
      const uid = activeUser?.uid || activeUser?.id;
      const isVerified = Boolean(activeUser?.emailVerified || activeUser?.email_confirmed_at);

      // Fetch profile from database
      const existingProfile = await fetchUserProfileFromFirestore(uid) || 
                              await fetchUserProfileFromFirestore(agentEmail.trim().toLowerCase());

      const meta = activeUser?.user_metadata || {};
      const agentData: User = {
        id: uid,
        name: existingProfile?.name || meta.full_name || meta.name || activeUser?.displayName || agentEmail.split('@')[0],
        email: activeUser?.email || agentEmail.trim().toLowerCase(),
        role: 'agent',
        phone: existingProfile?.phone || meta.phone || agentPhone,
        agencyName: existingProfile?.agencyName || meta.agency_name || agencyName || `${existingProfile?.name || 'Agent'} Housing`,
        universityId: existingProfile?.universityId || meta.university_id || agentUniId || 'uniosun',
        universityName: existingProfile?.universityName || meta.university_name || agentUni,
        isVerifiedAgent: existingProfile?.businessVerificationStatus === 'approved' || existingProfile?.isVerifiedAgent || false,
        isEmailVerified: isVerified,
        businessVerificationStatus: existingProfile?.businessVerificationStatus || 'none',
        businessVerificationDetails: existingProfile?.businessVerificationDetails,
        avatarUrl: existingProfile?.avatarUrl || activeUser?.photoURL || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
        createdAt: existingProfile?.createdAt || new Date().toISOString().split('T')[0]
      };

      onAgentAuthenticated(agentData);
    } catch (err: any) {
      console.error("[AGENT SIGNIN] Error:", err);
      const code = String(err?.code || err?.error_code || '').toLowerCase();
      const msg = String(err?.message || '').toLowerCase();
      if (code === 'email_not_confirmed' || msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        const pendingAgent: User = {
          id: auth.currentUser?.uid || '',
          name: agentName || agentEmail.split('@')[0] || 'Agent',
          email: agentEmail.trim().toLowerCase(),
          role: 'agent',
          phone: agentPhone,
          agencyName: agencyName || `${agentName || 'Agent'} Housing`,
          universityId: agentUniId || 'uniosun',
          universityName: agentUni,
          isVerifiedAgent: false,
          isEmailVerified: false,
          businessVerificationStatus: 'none',
          avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
          createdAt: new Date().toISOString().split('T')[0]
        };
        onAgentAuthenticated(pendingAgent);
        return;
      }
      if (
        code === 'invalid_credentials' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        msg.includes('invalid login credentials') ||
        msg.includes('invalid credentials') ||
        msg.includes('user not found')
      ) {
        // Direct straight to sign up tab if credentials not found in database
        setAuthMode('signup');
        setAuthError('No account found with these credentials. Please sign up below to create your caretaker account.');
        return;
      }
      setAuthError(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendNotice(null);
    try {
      await resendVerificationEmail();
      setResendNotice('Verification link has been sent to your email inbox! Please check your email and spam folder.');
    } catch (err: any) {
      setResendNotice('Could not send email: ' + (err?.message || 'Please sign in again to trigger verification email.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col">
      
      {/* ==========================================
          HEADER (CLEAN TOP NAVIGATION)
         ========================================== */}
      <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Top-Left: Simple & Prominent Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onGoToStudentView}
              className="flex items-center gap-2.5 focus:outline-none cursor-pointer py-1"
            >
              <img src="/favicon.svg" alt="Dormiqa" className="h-7 sm:h-8 w-auto object-contain shrink-0" />
              <span className="font-extrabold text-xl tracking-tight text-neutral-900 dark:text-white">
                DORMIQA
              </span>
            </button>
            <span className="text-[11px] font-bold text-neutral-500 border-l border-neutral-200 dark:border-neutral-800 pl-3">
              Agent Portal
            </span>
          </div>

          {/* Top-Right Controls */}
          <div className="flex items-center gap-2">
            
            <ThemeToggle variant="dropdown" />

            {/* Admin Access (Discreet Security Icon) */}
            <button
              onClick={onOpenAdminAccess}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Admin Access"
              aria-label="Admin Access"
            >
              <Shield className="w-4 h-4" />
            </button>

            {/* Top-Right Navigation Drawer Menu Trigger */}
            <button
              onClick={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 transition-all cursor-pointer"
              aria-label="Toggle Navigation Drawer"
            >
              {isNavDrawerOpen ? <X className="w-5 h-5 text-rose-600" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation Drawer Menu */}
        {isNavDrawerOpen && (
          <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-xl animate-in slide-in-from-top duration-200">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Agent Portal Menu
                </span>
                <span className="text-xs text-neutral-500">Dormiqa Housing Network</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <button
                  onClick={() => { setIsNavDrawerOpen(false); alert('Please sign in to view Message Inbox.'); }}
                  className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-left hover:border-neutral-400 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-purple-600 mb-1" />
                  <span className="text-xs font-bold block">Message Inbox</span>
                  <span className="text-[10px] text-neutral-400">Student chats</span>
                </button>

                <button
                  onClick={() => { setIsNavDrawerOpen(false); alert('Please sign in to access Calendar.'); }}
                  className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-left hover:border-neutral-400 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-amber-600 mb-1" />
                  <span className="text-xs font-bold block">Calendar</span>
                  <span className="text-[10px] text-neutral-400">Tour schedules</span>
                </button>

                <button
                  onClick={() => { setIsNavDrawerOpen(false); alert('Please sign in to view My Hostel.'); }}
                  className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-left hover:border-neutral-400 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-blue-600 mb-1" />
                  <span className="text-xs font-bold block">My Hostel</span>
                  <span className="text-[10px] text-neutral-400">Manage listings</span>
                </button>

                <button
                  onClick={() => { setIsNavDrawerOpen(false); alert('Please sign in to view Notifications.'); }}
                  className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-left hover:border-neutral-400 transition-all cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold block">Notifications</span>
                  <span className="text-[10px] text-neutral-400">System alerts</span>
                </button>

                <button
                  onClick={() => { setIsNavDrawerOpen(false); alert('Please sign in to view Profile.'); }}
                  className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-left hover:border-neutral-400 transition-all cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-600 mb-1" />
                  <span className="text-xs font-bold block">Profile</span>
                  <span className="text-[10px] text-neutral-400">Account settings</span>
                </button>

                {/* Theme Preference Switcher */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-1.5">
                  <span className="text-xs font-bold block text-neutral-700 dark:text-neutral-300">Theme Preference</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleApplyTheme('light')}
                      className={`p-1.5 rounded-lg text-xs ${themeMode === 'light' ? 'bg-neutral-900 text-white' : 'text-neutral-500'}`}
                      title="Light Theme"
                    >
                      <Sun className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleApplyTheme('dark')}
                      className={`p-1.5 rounded-lg text-xs ${themeMode === 'dark' ? 'bg-neutral-900 text-white' : 'text-neutral-500'}`}
                      title="Dark Theme"
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleApplyTheme('system')}
                      className={`p-1.5 rounded-lg text-xs ${themeMode === 'system' ? 'bg-neutral-900 text-white' : 'text-neutral-500'}`}
                      title="System Preference"
                    >
                      <Laptop className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ==========================================
          MAIN BODY CONTENT
         ========================================== */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-8">
        
        {/* Intro Hero Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="w-12 h-12 bg-neutral-900 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
            Dormiqa Agent & Caretaker Portal
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
            The professional property management desk for student hostel landlords, verified caretakers, and accommodation agents in Nigeria.
          </p>
        </div>

        {/* UNVERIFIED EMAIL NOTIFICATION CARD */}
        {unverifiedEmail ? (
          <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-3xl border border-amber-300 dark:border-amber-800/60 p-6 sm:p-8 shadow-md space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                Your account hasn't been verified yet.
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                Check your email (<strong>{unverifiedEmail}</strong>) and follow the verification link to activate your account.
              </p>
            </div>

            {resendNotice && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-300 text-center">
                {resendNotice}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const { data: { user } } = await supabase.auth.getUser();
                    const isNowVerified = Boolean(user?.email_confirmed_at || session?.user?.email_confirmed_at);
                    if (isNowVerified && user) {
                      const profile = await fetchUserProfileFromFirestore(user.id) || await fetchUserProfileFromFirestore(user.email || '');
                      const agentData: User = {
                        id: user.id,
                        name: profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Agent',
                        email: user.email || '',
                        role: 'agent',
                        phone: profile?.phone || user.user_metadata?.phone || agentPhone,
                        agencyName: profile?.agencyName || user.user_metadata?.agency_name || agencyName,
                        universityName: profile?.universityName || agentUni,
                        isVerifiedAgent: profile?.businessVerificationStatus === 'approved' || profile?.isVerifiedAgent || false,
                        isEmailVerified: true,
                        businessVerificationStatus: profile?.businessVerificationStatus || 'none',
                        businessVerificationDetails: profile?.businessVerificationDetails,
                        avatarUrl: profile?.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
                        createdAt: profile?.createdAt || new Date().toISOString().split('T')[0]
                      };
                      setUnverifiedEmail(null);
                      onAgentAuthenticated(agentData);
                    } else {
                      setResendNotice('Your email is not verified yet. Please check your inbox and click the verification link.');
                    }
                  } catch (e: any) {
                    setResendNotice('Could not verify status: ' + (e?.message || 'Please try again.'));
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>I've verified my email — Continue</span>
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full py-2.5 bg-neutral-900 hover:bg-black dark:bg-white dark:text-neutral-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>Resend verification email</span>
              </button>

              <button
                type="button"
                onClick={() => setUnverifiedEmail(null)}
                className="w-full py-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                Sign In with another account
              </button>
            </div>
          </div>
        ) : (
          /* AUTHENTICATION FORM (SIGN IN & SIGN UP) */
          <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xs space-y-6">
            
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {authMode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Business Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      placeholder="agent@yabahomes.ng"
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      name="current-password"
                      autoComplete="current-password"
                      value={agentPassword}
                      onChange={(e) => setAgentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-neutral-900 hover:bg-black dark:bg-white dark:text-neutral-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Building2 className="w-4 h-4" />}
                  <span>Sign In to Agent Portal</span>
                </button>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Lead Agent / Caretaker Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. Chief Tunde Adebayo"
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Business Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      placeholder="tunde@yabahomes.ng"
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Name of Agency / Business
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g. Yaba Student Housing Ltd"
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    WhatsApp Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={agentPhone}
                      onChange={(e) => setAgentPhone(e.target.value)}
                      placeholder="+234 803 456 7890"
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <UniversitySelector
                  universities={universities}
                  selectedUniversityId={agentUniId}
                  onSelectUniversity={(uni) => {
                    setAgentUniId(uni.id);
                    setAgentUni(uni.name);
                  }}
                  label="Primary University Serviced"
                  required
                />

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      name="new-password"
                      autoComplete="new-password"
                      value={agentPassword}
                      onChange={(e) => setAgentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Register Agent Account</span>
                </button>
              </form>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-500">
        Dormiqa Housing Platform &copy; {new Date().getFullYear()} — Secure Student Accommodation & Caretaker Network.
      </footer>
    </div>
  );
};
