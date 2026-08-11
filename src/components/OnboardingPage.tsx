import React, { useState } from 'react';
import { 
  GraduationCap, 
  Briefcase, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  FileCheck, 
  User as UserIcon, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Lock, 
  Sparkles, 
  Upload, 
  Info,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { UserRole, University } from '../types';
import { EmailVerificationCard } from './EmailVerificationCard';
import { 
  auth,
  signInWithGoogle, 
  registerWithEmail, 
  loginWithEmail, 
  resendVerificationEmail, 
  checkEmailVerified,
  saveUserToFirestore
} from '../services/firebase';

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface OnboardingPageProps {
  universities: University[];
  onCompleteOnboarding: (userData: {
    role: UserRole;
    name: string;
    email: string;
    phone?: string;
    universityName?: string;
    agencyName?: string;
    licenseNumber?: string;
    avatarUrl?: string;
    isSignup?: boolean;
    isEmailVerified?: boolean;
  }) => void;
  onBackToLanding: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  universities,
  onCompleteOnboarding,
  onBackToLanding
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentUni, setStudentUni] = useState(universities[0]?.name || 'University of Lagos (UNILAG)');
  const [studentPassword, setStudentPassword] = useState('');

  // Agent Form State
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [verificationType, setVerificationType] = useState<'cac' | 'id_card'>('cac');
  const [verificationDocNum, setVerificationDocNum] = useState('');
  const [agentUni, setAgentUni] = useState(universities[0]?.name || 'University of Lagos (UNILAG)');
  const [agentPhoneWA, setAgentPhoneWA] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [agentPassword, setAgentPassword] = useState('');

  // Google OAuth Auth State for Profile Completion Step
  const [googleAuthData, setGoogleAuthData] = useState<{
    displayName: string;
    email: string;
    photoURL?: string;
  } | null>(null);

  // Post-Signup Business Verification Step State
  const [step, setStep] = useState<'auth' | 'agent_verification'>('auth');
  const [pendingAgentData, setPendingAgentData] = useState<any>(null);

  // Email Verification Step State
  const [showEmailVerificationScreen, setShowEmailVerificationScreen] = useState(false);
  const [pendingUserOnboardingData, setPendingUserOnboardingData] = useState<any>(null);
  const [resendStatusMessage, setResendStatusMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const fbUser = await signInWithGoogle();
      const displayName = fbUser.displayName || '';
      const email = fbUser.email || '';
      const photoURL = fbUser.photoURL || undefined;

      if (displayName) {
        setStudentName(prev => prev || displayName);
        setAgentName(prev => prev || displayName);
        setAgencyName(prev => prev || `${displayName} Housing`);
      }
      if (email) {
        setStudentEmail(email);
        setAgentEmail(email);
      }

      setGoogleAuthData({
        displayName,
        email,
        photoURL
      });
    } catch (err: any) {
      console.error("Google Auth Failure:", err);
      let errorMsg = err?.message || "Google Authentication failed. Please try again or use Email.";
      if (err?.code === 'auth/unauthorized-domain') {
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'dormiqa-ng.vercel.app';
        errorMsg = `Firebase Auth Error (auth/unauthorized-domain): The domain '${currentHostname}' is not authorized for Firebase Authentication. Please add '${currentHostname}' to Authorized Domains under Firebase Console -> Authentication -> Settings.`;
      } else if (err?.code === 'auth/popup-closed-by-user') {
        errorMsg = "Google Sign-In popup was closed before completing authentication. Please try again.";
      }
      setAuthError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleAuthData) return;

    const name = selectedRole === 'student'
      ? (studentName || googleAuthData.displayName || 'Student User')
      : (agentName || googleAuthData.displayName || 'Property Agent');
    const phone = selectedRole === 'student' ? studentPhone : agentPhoneWA;
    const uni = selectedRole === 'student' ? studentUni : agentUni;

    const fullData = {
      role: selectedRole,
      name: name,
      email: googleAuthData.email,
      phone: phone,
      universityName: uni,
      agencyName: selectedRole === 'agent' ? (agencyName || `${name} Housing`) : undefined,
      avatarUrl: googleAuthData.photoURL,
      isSignup: authMode === 'signup',
      isEmailVerified: true
    };

    await saveUserToFirestore(fullData);

    onCompleteOnboarding(fullData);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    const studentData = {
      role: 'student' as UserRole,
      name: studentName || studentEmail.split('@')[0],
      email: studentEmail,
      phone: studentPhone,
      universityName: studentUni,
      isSignup: authMode === 'signup',
      isEmailVerified: false
    };

    try {
      if (authMode === 'signup') {
        // 1. Create a new Firebase Authentication account
        await registerWithEmail(studentEmail, studentPassword);

        // 2. Immediately check the newly created Firebase Auth user
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        const isVerified = auth.currentUser?.emailVerified === true;

        // 3. Save initial profile to Firestore
        await saveUserToFirestore({
          ...studentData,
          isEmailVerified: isVerified
        });

        // 4. If emailVerified === false: send to verification screen & block dashboard access
        if (!isVerified) {
          setPendingUserOnboardingData({
            ...studentData,
            isEmailVerified: false
          });
          setShowEmailVerificationScreen(true);
        } else {
          onCompleteOnboarding({
            ...studentData,
            isEmailVerified: true
          });
        }
      } else {
        // RETURNING USER LOGIN
        // 1. Get the authenticated Firebase user
        await loginWithEmail(studentEmail, studentPassword);

        // 2. Call auth.currentUser.reload()
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        // 3. Read the refreshed Firebase Authentication state
        const isVerified = auth.currentUser?.emailVerified === true;

        // 4. Update Firestore user profile
        await saveUserToFirestore({
          ...studentData,
          isEmailVerified: isVerified
        });

        // 5. If false: redirect to verification screen. If true: allow access.
        if (isVerified) {
          onCompleteOnboarding({
            ...studentData,
            isEmailVerified: true
          });
        } else {
          setPendingUserOnboardingData({
            ...studentData,
            isEmailVerified: false
          });
          setShowEmailVerificationScreen(true);
        }
      }
    } catch (err: any) {
      console.error("Firebase Student Auth Error:", err);
      let errorMsg = err?.message || "Authentication failed. Please check your credentials and try again.";
      if (err?.code === 'auth/unauthorized-domain') {
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'dormiqa-ng.vercel.app';
        errorMsg = `Firebase Auth Error (auth/unauthorized-domain): The domain '${currentHostname}' is not authorized for Firebase Authentication. Please add '${currentHostname}' to Authorized Domains under Firebase Console -> Authentication -> Settings.`;
      } else if (err?.code === 'auth/email-already-in-use') {
        errorMsg = "An account with this email address already exists. Please click 'Sign In' or use a different email.";
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        errorMsg = "Incorrect email address or password. Please try again.";
      } else if (err?.code === 'auth/user-not-found') {
        errorMsg = "No account found with this email. Please click 'Create Account (Sign Up)' to register.";
      }
      setAuthError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    const agentData = {
      role: 'agent' as UserRole,
      name: agentName || agentEmail.split('@')[0],
      email: agentEmail,
      agencyName: agencyName || `${agentName || 'Agent'} Housing`,
      phone: agentPhoneWA,
      universityName: agentUni,
      isSignup: authMode === 'signup',
      isEmailVerified: false
    };

    try {
      if (authMode === 'signup') {
        // 1. Create a new Firebase Authentication account
        await registerWithEmail(agentEmail, agentPassword);

        // 2. Immediately check the newly created Firebase Auth user
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        const isVerified = auth.currentUser?.emailVerified === true;

        // 3. Save profile to Firestore
        await saveUserToFirestore({
          ...agentData,
          isEmailVerified: isVerified
        });

        // 4. If emailVerified === false: send to verification screen & block access
        if (!isVerified) {
          setPendingUserOnboardingData({
            ...agentData,
            isEmailVerified: false
          });
          setShowEmailVerificationScreen(true);
        } else {
          onCompleteOnboarding({
            ...agentData,
            isEmailVerified: true
          });
        }
      } else {
        // RETURNING AGENT LOGIN
        await loginWithEmail(agentEmail, agentPassword);

        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        const isVerified = auth.currentUser?.emailVerified === true;

        await saveUserToFirestore({
          ...agentData,
          isEmailVerified: isVerified
        });

        if (isVerified) {
          onCompleteOnboarding({
            ...agentData,
            isEmailVerified: true
          });
        } else {
          setPendingUserOnboardingData({
            ...agentData,
            isEmailVerified: false
          });
          setShowEmailVerificationScreen(true);
        }
      }
    } catch (err: any) {
      console.error("Firebase Agent Auth Error:", err);
      let errorMsg = err?.message || "Authentication failed. Please check your credentials and try again.";
      if (err?.code === 'auth/unauthorized-domain') {
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'dormiqa-ng.vercel.app';
        errorMsg = `Firebase Auth Error (auth/unauthorized-domain): The domain '${currentHostname}' is not authorized for Firebase Authentication. Please add '${currentHostname}' to Authorized Domains under Firebase Console -> Authentication -> Settings.`;
      } else if (err?.code === 'auth/email-already-in-use') {
        errorMsg = "An account with this email address already exists. Please click 'Sign In' or use a different email.";
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        errorMsg = "Incorrect email address or password. Please try again.";
      } else if (err?.code === 'auth/user-not-found') {
        errorMsg = "No account found with this email. Please click 'Create Account (Sign Up)' to register.";
      }
      setAuthError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };


  if (showEmailVerificationScreen) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-neutral-50 dark:bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <EmailVerificationCard
          email={pendingUserOnboardingData?.email || studentEmail || agentEmail || auth.currentUser?.email || ''}
          onBack={() => setShowEmailVerificationScreen(false)}
          onVerified={async () => {
            if (auth.currentUser) {
              await auth.currentUser.reload();
            }
            if (auth.currentUser?.emailVerified) {
              const verifiedData = {
                ...pendingUserOnboardingData,
                isEmailVerified: true
              };
              await saveUserToFirestore(verifiedData);
              onCompleteOnboarding(verifiedData);
            }
          }}
        />
      </div>
    );
  }

  if (googleAuthData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
          
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold">
              <GoogleIcon />
              <span>Google OAuth Verified</span>
            </div>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
              Complete Your Profile
            </h2>
            <p className="text-xs text-neutral-600 max-w-sm mx-auto leading-relaxed">
              Your Google authentication was successful! Please review and fill out your name, school, and contact details below to finish setting up your account.
            </p>
          </div>

          {/* User Role Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">Select Account Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedRole === 'student'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('agent')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedRole === 'agent'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <Briefcase className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Property Agent</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleGoogleProfileSubmit} className="space-y-4">
            {/* Email Address (Readonly Verified Badge) */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  disabled
                  value={googleAuthData.email}
                  className="w-full pl-9 pr-24 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 cursor-not-allowed"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified
                </span>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={selectedRole === 'student' ? studentName : agentName}
                  onChange={(e) => {
                    if (selectedRole === 'student') setStudentName(e.target.value);
                    else setAgentName(e.target.value);
                  }}
                  placeholder="e.g. Chinedu Okonkwo"
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* Name of School / Institution */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                {selectedRole === 'student' ? 'Name of University / School' : 'Primary Campus Serviced'}
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-neutral-400 absolute left-3 top-3 z-10" />
                <select
                  required
                  value={selectedRole === 'student' ? studentUni : agentUni}
                  onChange={(e) => {
                    if (selectedRole === 'student') setStudentUni(e.target.value);
                    else setAgentUni(e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="">-- Select School / University --</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.state})
                    </option>
                  ))}
                  <option value="Other Nigerian Institution">Other Federal/State Uni or Polytechnic</option>
                </select>
              </div>
            </div>

            {/* Phone Number (WhatsApp) */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">Phone Number (WhatsApp)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={selectedRole === 'student' ? studentPhone : agentPhoneWA}
                  onChange={(e) => {
                    if (selectedRole === 'student') setStudentPhone(e.target.value);
                    else setAgentPhoneWA(e.target.value);
                  }}
                  placeholder="+234 812 345 6789"
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* Agent-Specific Field: Agency / Business Name */}
            {selectedRole === 'agent' && (
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">Name of Agency / Business</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="e.g. Yaba Student Housing Ltd"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGoogleAuthData(null)}
                className="px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Save Profile & Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation back & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-white px-3 py-1.5 rounded-md border border-neutral-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </button>
          
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              DORMIQA ONBOARDING GATEWAY
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Select Your Role & Join Dormiqa
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto">
            Connecting Nigerian university & polytechnic students directly with 100% verified caretakers, property managers, and official housing hosts.
          </p>
        </div>

        {/* 1. ROLE CARDS SELECTOR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          
          {/* Student Card */}
          <button
            type="button"
            onClick={() => setSelectedRole('student')}
            className={`p-5 rounded-2xl text-left border transition-all relative flex flex-col justify-between ${
              selectedRole === 'student'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg ring-2 ring-neutral-900 ring-offset-2'
                : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {selectedRole === 'student' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute top-4 right-4" />
            )}
            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                selectedRole === 'student' ? 'bg-neutral-800 text-emerald-400' : 'bg-neutral-100 text-neutral-900'
              }`}>
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  selectedRole === 'student' ? 'text-neutral-400' : 'text-neutral-500'
                }`}>
                  For Students
                </span>
                <h3 className="text-lg font-bold">Student Account</h3>
              </div>
              <p className={`text-xs leading-relaxed ${
                selectedRole === 'student' ? 'text-neutral-300' : 'text-neutral-600'
              }`}>
                Search verified lodges near UNILAG, UI, OAU, FUTA, YABATECH, LASU & 20+ institutions with 0% scam guarantee.
              </p>
            </div>
            <div className="pt-4 border-t border-neutral-200/20 text-[11px] font-semibold flex items-center gap-1">
              <span>Continue as Student</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Agent Card */}
          <button
            type="button"
            onClick={() => setSelectedRole('agent')}
            className={`p-5 rounded-2xl text-left border transition-all relative flex flex-col justify-between ${
              selectedRole === 'agent'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg ring-2 ring-neutral-900 ring-offset-2'
                : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {selectedRole === 'agent' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute top-4 right-4" />
            )}
            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                selectedRole === 'agent' ? 'bg-neutral-800 text-emerald-400' : 'bg-neutral-100 text-neutral-900'
              }`}>
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  selectedRole === 'agent' ? 'text-neutral-400' : 'text-neutral-500'
                }`}>
                  For Property Hosts
                </span>
                <h3 className="text-lg font-bold">Verified Agent</h3>
              </div>
              <p className={`text-xs leading-relaxed ${
                selectedRole === 'agent' ? 'text-neutral-300' : 'text-neutral-600'
              }`}>
                List self-contains & lodges, submit proof of business (banner, logo, office, or CAC photo), and receive WhatsApp inspection requests directly.
              </p>
            </div>
            <div className="pt-4 border-t border-neutral-200/20 text-[11px] font-semibold flex items-center gap-1">
              <span>Continue as Agent</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

        </div>

        {/* 2. ONBOARDING FORM CONTAINER */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-xs">
          
          {/* Header & Auth Mode Toggle (Sign Up vs Sign In) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-100 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-800 uppercase tracking-wider">
                  {selectedRole === 'student' ? 'Student Portal' : 'Agent Portal'}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Firebase Authenticated
                </span>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mt-1">
                {authMode === 'signup' 
                  ? `Create ${selectedRole === 'student' ? 'Student' : 'Agent / Caretaker'} Account`
                  : `Sign In to ${selectedRole === 'student' ? 'Student' : 'Agent'} Desk`
                }
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  authMode === 'signup'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Create Account (Sign Up)
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  authMode === 'signin'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Auth Method Switcher: Google vs Email */}
          <div className="space-y-3 mb-6">
            <label className="text-xs font-bold text-neutral-700 block">Choose Sign-In / Sign-Up Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setAuthMethod('google'); setAuthError(null); }}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  authMethod === 'google'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <GoogleIcon />
                Google Account
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod('email'); setAuthError(null); }}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  authMethod === 'email'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <Mail className="w-4 h-4 text-emerald-600" />
                Email & Password
              </button>
            </div>
          </div>

          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* OPTION A: GOOGLE SIGN-IN / SIGN-UP */}
          {authMethod === 'google' ? (
            <div className="space-y-4 py-4">
              <div className="p-6 border border-neutral-200 rounded-2xl bg-neutral-50 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center mx-auto shadow-xs">
                  <GoogleIcon />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">
                    {authMode === 'signup' 
                      ? `Sign Up as ${selectedRole === 'student' ? 'Student' : 'Verified Agent'} with Google`
                      : `Sign In with Google Account`
                    }
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    Instant authentication via Firebase Auth using your institutional or personal Google workspace account.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleGoogleAuth}
                    className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 font-extrabold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-2.5"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-600" /> : <GoogleIcon />}
                    <span>{authMode === 'signup' ? `Sign Up as ${selectedRole === 'student' ? 'Student' : 'Agent'} with Google` : 'Sign In with Google'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* OPTION B: EMAIL & PASSWORD FORM */
            <>
              {/* FORM TYPE 1: STUDENT FORM */}
              {selectedRole === 'student' && (
                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  
                  {authMode === 'signup' ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Student Name */}
                        <div>
                          <label className="text-xs font-bold text-neutral-800 block mb-1">Full Name</label>
                          <div className="relative">
                            <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              required
                              value={studentName}
                              onChange={(e) => setStudentName(e.target.value)}
                              placeholder="e.g. Chinedu Okonkwo"
                              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                          </div>
                        </div>

                        {/* Student Email */}
                        <div>
                          <label className="text-xs font-bold text-neutral-800 block mb-1">Email Address</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                            <input
                              type="email"
                              required
                              value={studentEmail}
                              onChange={(e) => setStudentEmail(e.target.value)}
                              placeholder="chinedu@student.unilag.edu.ng"
                              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Student Phone */}
                        <div>
                          <label className="text-xs font-bold text-neutral-800 block mb-1">Phone Number (WhatsApp)</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                            <input
                              type="tel"
                              required
                              value={studentPhone}
                              onChange={(e) => setStudentPhone(e.target.value)}
                              placeholder="+234 812 345 6789"
                              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                          </div>
                        </div>

                        {/* University Name */}
                        <div>
                          <label className="text-xs font-bold text-neutral-800 block mb-1">Name of University / Institution</label>
                          <div className="relative">
                            <GraduationCap className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                            <select
                              value={studentUni}
                              onChange={(e) => setStudentUni(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            >
                              {universities.map(u => (
                                <option key={u.id} value={u.name}>
                                  {u.name} ({u.state})
                                </option>
                              ))}
                              <option value="Other Nigerian Institution">Other Federal/State Uni or Polytechnic</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-neutral-800 block mb-1">Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                          <input
                            type="password"
                            required
                            value={studentPassword}
                            onChange={(e) => setStudentPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Student Sign In */
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-neutral-800 block mb-1">Student Email Address</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                          <input
                            type="email"
                            required
                            value={studentEmail}
                            onChange={(e) => setStudentEmail(e.target.value)}
                            placeholder="student@unilag.edu.ng"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-neutral-800 block mb-1">Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                          <input
                            type="password"
                            required
                            value={studentPassword}
                            onChange={(e) => setStudentPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                      {authMode === 'signup' ? 'Complete Student Onboarding with Email' : 'Sign In as Student'}
                    </button>
                  </div>
                </form>
              )}

              {/* FORM TYPE 2: AGENT FORM */}
              {selectedRole === 'agent' && (
                <form onSubmit={handleAgentSubmit} className="space-y-4">
                  
                  {authMode === 'signup' ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Agent Name */}
                        <div>
                          <label className="text-xs font-bold text-neutral-800 block mb-1">Lead Agent / Caretaker Name</label>
                          <div className="relative">
                            <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              required
                              value={agentName}
                              onChange={(e) => setAgentName(e.target.value)}
                              placeholder="e.g. Chief Tunde Adebayo"
                              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                          </div>
                        </div>

                        {/* Agent Email */}
                        <div>
                          <label className="text-xs font-bold text-neutral-800 block mb-1">Business Email Address</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                            <input
                              type="email"
                              required
                              value={agentEmail}
                              onChange={(e) => setAgentEmail(e.target.value)}
                              placeholder="tunde@yabahomes.ng"
                              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Name of Business */}
                        <div>
                          <label className="text-xs font-bold text-neutral-800 block mb-1">Name of Agency / Business</label>
                          <div className="relative">
                            <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              required
                              value={agencyName}
                              onChange={(e) => setAgencyName(e.target.value)}
                              placeholder="e.g. Yaba Student Housing Ltd"
                              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                          </div>
                        </div>

                        {/* WhatsApp Phone Number */}
                        <div>
                          <label className="text-xs font-bold text-neutral-800 block mb-1">WhatsApp Phone Number (WA)</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                            <input
                              type="tel"
                              required
                              value={agentPhoneWA}
                              onChange={(e) => setAgentPhoneWA(e.target.value)}
                              placeholder="+234 803 456 7890"
                              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Serviced University - Single Select Dropdown */}
                      <div>
                        <label className="text-xs font-bold text-neutral-800 block mb-1">Primary University / Polytechnic Serviced (Select One)</label>
                        <div className="relative">
                          <GraduationCap className="w-4 h-4 text-neutral-400 absolute left-3 top-3 z-10" />
                          <select
                            required
                            value={agentUni}
                            onChange={(e) => setAgentUni(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          >
                            <option value="">-- Select One Primary University --</option>
                            {universities.map(u => (
                              <option key={u.id} value={u.name}>
                                {u.name} ({u.state})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-neutral-800 block mb-1">Account Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                          <input
                            type="password"
                            required
                            value={agentPassword}
                            onChange={(e) => setAgentPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Agent Sign In */
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-neutral-800 block mb-1">Business Email Address</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                          <input
                            type="email"
                            required
                            value={agentEmail}
                            onChange={(e) => setAgentEmail(e.target.value)}
                            placeholder="agent@yabahomes.ng"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-neutral-800 block mb-1">Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                          <input
                            type="password"
                            required
                            value={agentPassword}
                            onChange={(e) => setAgentPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : authMode === 'signup' ? <ArrowRight className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                      {authMode === 'signup' ? 'Continue to Business Verification →' : 'Sign In as Agent'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
};
