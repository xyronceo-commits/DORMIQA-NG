import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Lock,
  Building
} from 'lucide-react';
import { UserRole, University } from '../types';
import { UniversitySelector } from './UniversitySelector';
import { PasswordResetModal } from './PasswordResetModal';
import { OnboardingSlides } from './onboarding/OnboardingSlides';
import { RoleSelectionScreen } from './onboarding/RoleSelectionScreen';
import { OtpVerificationScreen } from './onboarding/OtpVerificationScreen';
import { DormiqaLogo } from './DormiqaLogo';
import { mapAuthError } from '../utils/authErrors';
import { 
  auth,
  registerWithEmail, 
  loginWithEmail, 
  verifyOtpWithEmail,
  resendVerificationEmail, 
  saveUserToFirestore,
  fetchUserProfileFromFirestore,
  saveStudentProfileToFirestore,
  validateAndNormalizePhoneNumber
} from '../services/firebase';

interface OnboardingPageProps {
  universities: University[];
  initialEmail?: string;
  onCompleteOnboarding: (userData: {
    role: UserRole;
    name: string;
    email: string;
    phone?: string;
    universityId?: string;
    universityName?: string;
    agencyName?: string;
    licenseNumber?: string;
    avatarUrl?: string;
    isSignup?: boolean;
    isEmailVerified?: boolean;
    businessVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    isVerifiedAgent?: boolean;
  }) => void;
  onBackToLanding: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  universities,
  initialEmail,
  onCompleteOnboarding,
}) => {
  const [step, setStep] = useState<'slides' | 'role_selection' | 'auth' | 'otp_verification'>(() => {
    if (initialEmail && initialEmail.trim()) {
      return 'auth';
    }
    return 'slides';
  });

  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>(initialEmail ? 'signin' : 'signup');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Show/Hide password toggle
  const [showPassword, setShowPassword] = useState(false);

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState(initialEmail || '');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentUniId, setStudentUniId] = useState('uniosun');
  const [studentUni, setStudentUni] = useState(
    universities.find(u => u.id === 'uniosun')?.name || 'Osun State University (UNIOSUN)'
  );
  const [studentPassword, setStudentPassword] = useState('');

  // Agent Form State
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState(initialEmail || '');
  const [agencyName, setAgencyName] = useState('');
  const [agentPhoneWA, setAgentPhoneWA] = useState('');
  const [agentPassword, setAgentPassword] = useState('');

  // OTP Verification State
  const [pendingOtpEmail, setPendingOtpEmail] = useState('');
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  // Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetModalEmail, setResetModalEmail] = useState('');
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(() => {
    try {
      if (sessionStorage.getItem('dormiqa_password_reset_success') === 'true') {
        sessionStorage.removeItem('dormiqa_password_reset_success');
        return 'Password reset successfully! Please sign in with your new password.';
      }
    } catch (_) {}
    return null;
  });

  useEffect(() => {
    if (initialEmail && initialEmail.trim()) {
      const clean = initialEmail.trim();
      setStudentEmail(clean);
      setAgentEmail(clean);
      setAuthMode('signin');
      setStep('auth');
      try {
        if (sessionStorage.getItem('dormiqa_password_reset_success') === 'true') {
          sessionStorage.removeItem('dormiqa_password_reset_success');
          setResetSuccessNotice('Password reset successfully! Please sign in with your new password.');
        }
      } catch (_) {}
    }
  }, [initialEmail]);

  // Handle Student Email Sign Up / Sign In
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    const cleanEmail = studentEmail.trim().toLowerCase();
    const cleanPassword = studentPassword;

    try {
      if (authMode === 'signup') {
        if (!studentName.trim()) {
          setAuthError('Please enter your full name.');
          setIsLoading(false);
          return;
        }

        const phoneResult = studentPhone ? validateAndNormalizePhoneNumber(studentPhone) : null;
        const normalizedPhone = phoneResult?.normalized || studentPhone.trim();

        // 1. Call Supabase Sign-Up (sends 6-digit verification code)
        const regUser = await registerWithEmail(cleanEmail, cleanPassword, {
          role: 'student',
          full_name: studentName.trim(),
          phone: normalizedPhone,
          university_id: studentUniId,
          university_name: studentUni
        });

        const studentUid = regUser?.id || (regUser as any)?.uid || auth.currentUser?.uid || '';
        const studentData = {
          id: studentUid,
          uid: studentUid,
          role: 'student' as UserRole,
          name: studentName.trim(),
          email: cleanEmail,
          phone: normalizedPhone,
          universityId: studentUniId,
          universityName: studentUni,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          isSignup: true,
          isEmailVerified: false
        };

        if (studentUid) {
          saveUserToFirestore(studentData).catch(() => {});
          saveStudentProfileToFirestore({
            uid: studentUid,
            name: studentName.trim(),
            email: cleanEmail,
            phoneNumber: normalizedPhone,
            universityId: studentUniId,
            universityName: studentUni,
            profileCompleted: false
          }).catch(() => {});
        }

        // 2. Transition immediately to in-app OTP Verification screen
        setPendingOtpEmail(cleanEmail);
        setPendingUserData(studentData);
        setStep('otp_verification');
      } else {
        // SIGN IN
        const loggedInUser = await loginWithEmail(cleanEmail, cleanPassword);
        const activeUser = loggedInUser || auth.currentUser;
        const uid = activeUser?.uid || activeUser?.id;
        const isVerified = Boolean(activeUser?.emailVerified || activeUser?.email_confirmed_at);

        const existingProfile = await fetchUserProfileFromFirestore(uid) || 
                                await fetchUserProfileFromFirestore(cleanEmail);

        if (existingProfile?.role === 'agent') {
          setAuthError('This account is registered as an agent. Switch to Agent mode above.');
          setIsLoading(false);
          return;
        }

        const meta = activeUser?.user_metadata || {};
        const resolvedName = (existingProfile?.name || meta.full_name || meta.name || activeUser?.displayName || cleanEmail.split('@')[0] || '').trim();
        const resolvedPhone = (existingProfile?.phone || existingProfile?.phoneNumber || meta.phone || '').trim();
        const resolvedUniId = existingProfile?.universityId || meta.university_id || meta.universityId || 'uniosun';
        const resolvedUniName = existingProfile?.universityName || meta.university_name || studentUni;

        const studentData = {
          id: uid,
          role: 'student' as UserRole,
          name: resolvedName || 'Student',
          email: activeUser?.email || cleanEmail,
          phone: resolvedPhone,
          universityId: resolvedUniId,
          universityName: resolvedUniName,
          avatarUrl: existingProfile?.avatarUrl || activeUser?.photoURL,
          isSignup: false,
          isEmailVerified: isVerified
        };

        if (!isVerified) {
          setPendingOtpEmail(cleanEmail);
          setPendingUserData(studentData);
          setStep('otp_verification');
        } else {
          saveUserToFirestore(studentData).catch(() => {});
          onCompleteOnboarding(studentData);
        }
      }
    } catch (err: any) {
      console.error('[STUDENT AUTH] Error:', err);
      const code = String(err?.code || err?.error_code || '').toLowerCase();
      const msg = String(err?.message || '').toLowerCase();

      if (code === 'email_not_confirmed' || msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setPendingOtpEmail(cleanEmail);
        setPendingUserData({
          id: '',
          role: 'student' as UserRole,
          name: studentName || cleanEmail.split('@')[0] || 'Student',
          email: cleanEmail,
          phone: studentPhone,
          universityId: studentUniId,
          universityName: studentUni,
          isSignup: false,
          isEmailVerified: false
        });
        setStep('otp_verification');
        return;
      }

      if (
        code === 'invalid_credentials' ||
        code === 'auth/invalid-credential' ||
        msg.includes('invalid login credentials') ||
        msg.includes('invalid credentials')
      ) {
        setAuthError('Invalid email or password. Please verify your credentials or create a new account.');
        return;
      }

      setAuthError(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Agent Email Sign Up / Sign In
  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    const cleanEmail = agentEmail.trim().toLowerCase();
    const cleanPassword = agentPassword;

    try {
      if (authMode === 'signup') {
        if (!agentName.trim()) {
          setAuthError('Please enter your full name.');
          setIsLoading(false);
          return;
        }

        const phoneResult = agentPhoneWA ? validateAndNormalizePhoneNumber(agentPhoneWA) : null;
        const normalizedPhone = phoneResult?.normalized || agentPhoneWA.trim();

        // 1. Call Supabase Sign-Up passing agent metadata
        const regUser = await registerWithEmail(cleanEmail, cleanPassword, {
          role: 'agent',
          full_name: agentName.trim(),
          agency_name: agencyName.trim() || `${agentName.trim()} Properties`,
          phone: normalizedPhone,
          university_id: 'uniosun',
          university_name: 'Osun State University (UNIOSUN)'
        });

        const agentUid = regUser?.id || (regUser as any)?.uid || auth.currentUser?.uid || '';
        const agentData = {
          id: agentUid,
          uid: agentUid,
          role: 'agent' as UserRole,
          name: agentName.trim(),
          email: cleanEmail,
          agencyName: agencyName.trim() || `${agentName.trim()} Properties`,
          phone: normalizedPhone,
          universityId: 'uniosun',
          universityName: 'Osun State University (UNIOSUN)',
          businessVerificationStatus: 'none' as const,
          isVerifiedAgent: false,
          isSignup: true,
          isEmailVerified: false
        };

        if (agentUid) {
          await saveUserToFirestore(agentData).catch(() => {});
        }

        // Transition Agent to OTP Verification (8-digit code)
        setPendingOtpEmail(cleanEmail);
        setPendingUserData(agentData);
        setStep('otp_verification');
      } else {
        // SIGN IN
        const loggedInUser = await loginWithEmail(cleanEmail, cleanPassword);
        const activeUser = loggedInUser || auth.currentUser;
        const uid = activeUser?.uid || activeUser?.id;
        const isVerified = Boolean(activeUser?.emailVerified || activeUser?.email_confirmed_at);

        const existingProfile = await fetchUserProfileFromFirestore(uid) || 
                                await fetchUserProfileFromFirestore(cleanEmail);

        const meta = activeUser?.user_metadata || {};
        const isApproved = existingProfile?.businessVerificationStatus === 'approved' || existingProfile?.isVerifiedAgent === true;

        const agentData = {
          id: uid,
          role: 'agent' as UserRole,
          name: existingProfile?.name || meta.full_name || agentName || cleanEmail.split('@')[0],
          email: activeUser?.email || cleanEmail,
          agencyName: existingProfile?.agencyName || meta.agency_name || agencyName,
          phone: existingProfile?.phone || meta.phone || agentPhoneWA,
          universityId: existingProfile?.universityId || 'uniosun',
          universityName: existingProfile?.universityName || 'Osun State University (UNIOSUN)',
          avatarUrl: existingProfile?.avatarUrl || activeUser?.photoURL,
          businessVerificationStatus: existingProfile?.businessVerificationStatus || (isApproved ? 'approved' : 'none'),
          businessVerificationDetails: existingProfile?.businessVerificationDetails,
          isVerifiedAgent: isApproved,
          isSignup: false,
          isEmailVerified: isVerified
        };

        if (!isVerified) {
          setPendingOtpEmail(cleanEmail);
          setPendingUserData(agentData);
          setStep('otp_verification');
        } else {
          onCompleteOnboarding(agentData);
        }
      }
    } catch (err: any) {
      console.error('[AGENT AUTH] Error:', err);
      const code = String(err?.code || err?.error_code || '').toLowerCase();
      const msg = String(err?.message || '').toLowerCase();

      if (code === 'email_not_confirmed' || msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setPendingOtpEmail(cleanEmail);
        setPendingUserData({
          id: '',
          role: 'agent' as UserRole,
          name: agentName || cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: agentPhoneWA,
          agencyName: agencyName,
          universityId: 'uniosun',
          universityName: 'Osun State University (UNIOSUN)',
          businessVerificationStatus: 'none',
          isVerifiedAgent: false,
          isSignup: false,
          isEmailVerified: false
        });
        setStep('otp_verification');
        return;
      }

      if (
        code === 'invalid_credentials' ||
        code === 'auth/invalid-credential' ||
        msg.includes('invalid login credentials') ||
        msg.includes('invalid credentials')
      ) {
        setAuthError('Invalid email or password. Please verify your credentials or create a new account.');
        return;
      }

      setAuthError(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Verification Submission
  const handleVerifyOtp = async (otpCode: string) => {
    setIsOtpLoading(true);
    setOtpError(null);

    try {
      const { user } = await verifyOtpWithEmail(pendingOtpEmail, otpCode, 'signup');
      const verifiedUser = user || auth.currentUser;
      const uid = verifiedUser?.uid || verifiedUser?.id || pendingUserData?.id || `user_${Date.now()}`;

      const updatedUserData = {
        ...(pendingUserData || {}),
        id: uid,
        uid: uid,
        email: pendingOtpEmail,
        isEmailVerified: true
      };

      if (uid) {
        await saveUserToFirestore(updatedUserData).catch(() => {});
      }

      onCompleteOnboarding(updatedUserData);
    } catch (err: any) {
      console.error('[OTP VERIFY] Error:', err);
      const msg = err?.message || 'Invalid or expired 8-digit verification code. Please check your email and try again.';
      setOtpError(msg);
    } finally {
      setIsOtpLoading(false);
    }
  };

  // OTP Resend Action
  const handleResendOtp = async (): Promise<boolean> => {
    try {
      const ok = await resendVerificationEmail(pendingOtpEmail);
      return ok;
    } catch (err) {
      console.warn('Resend OTP error:', err);
      return false;
    }
  };

  // 1. Walkthrough Slides
  if (step === 'slides') {
    return (
      <OnboardingSlides
        onComplete={() => setStep('role_selection')}
        onLoginClick={() => {
          setAuthMode('signin');
          setStep('auth');
        }}
      />
    );
  }

  // 2. Role Selection Screen
  if (step === 'role_selection') {
    return (
      <RoleSelectionScreen
        selectedRole={selectedRole}
        onSelectRole={setSelectedRole}
        onContinue={() => {
          setAuthMode('signup');
          setStep('auth');
        }}
        onSwitchToSignIn={() => {
          setAuthMode('signin');
          setStep('auth');
        }}
        onBackToSlides={() => setStep('slides')}
      />
    );
  }

  // 3. OTP Verification Screen
  if (step === 'otp_verification') {
    return (
      <OtpVerificationScreen
        email={pendingOtpEmail}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onChangeEmail={() => {
          setStep('auth');
          setAuthError(null);
        }}
        isLoading={isOtpLoading}
        errorMessage={otpError}
      />
    );
  }

  // 4. Clean Production Auth Form
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between font-sans">
      {/* Top Header with Brand Logo (No URL path breadcrumbs) */}
      <header className="w-full max-w-xl mx-auto px-5 py-3.5 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <DormiqaLogo className="w-6 h-6 shrink-0" />
          <span className="text-base font-black tracking-tight text-neutral-900">DORMIQA</span>
        </div>

        <button
          type="button"
          onClick={() => setStep('role_selection')}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1 px-2.5 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          Change role
        </button>
      </header>

      {/* Main Container - Compact vertical spacing so users do not need to scroll */}
      <main className="w-full max-w-md mx-auto px-5 pt-4 pb-6 flex flex-col justify-start flex-1">
        <div className="space-y-1 mb-4 text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            {authMode === 'signup' ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-xs text-neutral-600">
            {selectedRole === 'student'
              ? 'Find verified lodges near your campus gates.'
              : 'Manage student lodge listings and bookings.'}
          </p>
        </div>

        {/* Clean Segmented Role Switcher */}
        <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('student');
              setAuthError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              selectedRole === 'student'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('agent');
              setAuthError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              selectedRole === 'agent'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Agent / Caretaker
          </button>
        </div>

        {/* Reset Success Notice */}
        {resetSuccessNotice && (
          <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="leading-snug font-semibold">{resetSuccessNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {authError && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-snug font-medium">{authError}</span>
          </div>
        )}

        {/* Form: Student */}
        {selectedRole === 'student' ? (
          <form onSubmit={handleStudentSubmit} className="space-y-3.5">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Full Name <span className="text-emerald-700">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Ibrahim Adeyemi"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Mobile or WhatsApp Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      placeholder="08012345678"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Preferred Higher Institution <span className="text-emerald-700">*</span>
                  </label>
                  <UniversitySelector
                    universities={universities}
                    selectedUniversityId={studentUniId}
                    onSelectUniversity={(uni) => {
                      setStudentUniId(uni.id);
                      setStudentUni(uni.name);
                    }}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Email Address <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Password <span className="text-emerald-700">*</span>
                </label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetModalEmail(studentEmail);
                      setShowResetModal(true);
                    }}
                    className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{authMode === 'signup' ? 'Create Student Account' : 'Sign In as Student'}</span>
              )}
            </button>
          </form>
        ) : (
          /* Form: Agent */
          <form onSubmit={handleAgentSubmit} className="space-y-3.5">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Full Legal Name <span className="text-emerald-700">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. Babatunde Lawal"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Agency or Property Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g. Oke-Baale Lodge Caretakers"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Direct WhatsApp / Phone <span className="text-emerald-700">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={agentPhoneWA}
                      onChange={(e) => setAgentPhoneWA(e.target.value)}
                      placeholder="08098765432"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Email Address <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  placeholder="agent@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Password <span className="text-emerald-700">*</span>
                </label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetModalEmail(agentEmail);
                      setShowResetModal(true);
                    }}
                    className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={agentPassword}
                  onChange={(e) => setAgentPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{authMode === 'signup' ? 'Continue to Verification' : 'Sign In as Agent'}</span>
              )}
            </button>
          </form>
        )}

        {/* Switcher: Create Account vs Sign In */}
        <div className="mt-6 text-center text-xs text-neutral-600">
          {authMode === 'signup' ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                }}
                className="text-emerald-700 font-semibold hover:underline cursor-pointer ml-1"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                }}
                className="text-emerald-700 font-semibold hover:underline cursor-pointer ml-1"
              >
                Create Account
              </button>
            </p>
          )}
        </div>
      </main>

      <footer className="w-full max-w-xl mx-auto px-6 py-4 text-center border-t border-neutral-100 text-xs text-neutral-400">
        DORMIQA Nigeria • Verified Student Housing Platform
      </footer>

      <PasswordResetModal
        isOpen={showResetModal}
        initialEmail={resetModalEmail}
        onClose={() => setShowResetModal(false)}
        onSwitchToSignIn={(email) => {
          setShowResetModal(false);
          setAuthMode('signin');
          if (email) {
            setStudentEmail(email);
            setAgentEmail(email);
          }
        }}
      />
    </div>
  );
};
