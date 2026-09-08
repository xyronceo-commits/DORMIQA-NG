import React, { useState, useEffect } from 'react';
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
import { UniversitySelector } from './UniversitySelector';
import { 
  auth,
  signInWithGoogle, 
  registerWithEmail, 
  loginWithEmail, 
  resendVerificationEmail, 
  checkEmailVerified,
  saveUserToFirestore,
  fetchUserProfileFromFirestore,
  saveStudentProfileToFirestore,
  fetchStudentProfileFromFirestore,
  validateAndNormalizePhoneNumber,
  logoutFirebase
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
  const [studentUniId, setStudentUniId] = useState('uniosun');
  const [studentUni, setStudentUni] = useState(universities[0]?.name || 'Osun State University (UNIOSUN)');
  const [studentPassword, setStudentPassword] = useState('');

  // Agent Form State
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [verificationType, setVerificationType] = useState<'cac' | 'id_card'>('cac');
  const [verificationDocNum, setVerificationDocNum] = useState('');
  const [agentUniId, setAgentUniId] = useState('uniosun');
  const [agentUni, setAgentUni] = useState(universities[0]?.name || 'Osun State University (UNIOSUN)');
  const [agentPhoneWA, setAgentPhoneWA] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [agentPassword, setAgentPassword] = useState('');

  // Google OAuth Auth State for Profile Completion Step
  const [googleAuthData, setGoogleAuthData] = useState<{
    uid: string;
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

  useEffect(() => {
    if (selectedRole === 'agent') {
      setAuthMethod('email');
    }
  }, [selectedRole]);

  const handleGoogleAuth = async () => {
    if (selectedRole === 'agent') {
      setAuthError("Agent authentication requires Email & Password. Google sign-in is disabled for Agents.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    try {
      const fbUser = await signInWithGoogle();
      const displayName = fbUser.displayName || '';
      const email = fbUser.email?.toLowerCase() || '';
      const photoURL = fbUser.photoURL || undefined;
      const uid = fbUser.uid;

      // Check if user profile already exists in Firestore regardless of tab selection
      const existingProfile = await fetchUserProfileFromFirestore(uid) || (email ? await fetchUserProfileFromFirestore(email) : null);

      if (existingProfile) {
        const userRole = (existingProfile.role || 'student') as UserRole;
        const fullData = {
          id: uid,
          role: userRole,
          name: existingProfile.name || displayName || email.split('@')[0] || 'User',
          email: email,
          phone: existingProfile.phone || '',
          universityId: existingProfile.universityId || 'uniosun',
          universityName: existingProfile.universityName || 'Osun State University (UNIOSUN)',
          agencyName: existingProfile.agencyName || '',
          avatarUrl: existingProfile.avatarUrl || photoURL,
          isVerifiedAgent: existingProfile.isVerifiedAgent || existingProfile.businessVerificationStatus === 'approved',
          businessVerificationStatus: existingProfile.businessVerificationStatus || 'none',
          isSignup: false,
          isEmailVerified: true
        };

        await saveUserToFirestore(fullData);
        onCompleteOnboarding(fullData);
        return;
      }

      // Brand-new Google user with no existing profile
      if (selectedRole === 'student') {
        const studentProfile = await fetchStudentProfileFromFirestore(uid);

        const studentData = {
          id: uid,
          role: 'student' as UserRole,
          name: studentProfile?.name || displayName || email.split('@')[0] || 'Student',
          email: email,
          phone: studentProfile?.phoneNumber || studentProfile?.phone || '',
          universityId: studentProfile?.universityId || 'uniosun',
          universityName: studentProfile?.universityName || 'Osun State University (UNIOSUN)',
          avatarUrl: studentProfile?.photoURL || studentProfile?.avatarUrl || photoURL,
          isSignup: false,
          isEmailVerified: true
        };

        await saveUserToFirestore(studentData);
        await saveStudentProfileToFirestore({
          uid,
          name: studentData.name,
          email: studentData.email,
          photoURL: studentData.avatarUrl,
          avatarUrl: studentData.avatarUrl,
          phoneNumber: studentData.phone,
          phone: studentData.phone,
          universityId: studentData.universityId,
          universityName: studentData.universityName,
          profileCompleted: true
        });

        onCompleteOnboarding(studentData);
        return;
      }

      if (displayName) setAgentName(prev => prev || displayName);
      if (email) setAgentEmail(email);

      setGoogleAuthData({
        uid,
        displayName,
        email,
        photoURL
      });
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error("Google Auth Failure:", err);
      }
      let errorMsg: string | null = "Google sign-in failed. Please try again.";
      if (err?.code === 'auth/unauthorized-domain') {
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'dormiqa-ng.vercel.app';
        errorMsg = `Firebase Auth Error (auth/unauthorized-domain): The domain '${currentHostname}' is not authorized for Firebase Authentication. Please add '${currentHostname}' to Authorized Domains under Firebase Console.`;
      } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        errorMsg = null;
      }
      setAuthError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleAuthData) return;

    setIsLoading(true);
    setAuthError(null);

    try {
      if (selectedRole === 'student') {
        // Validate phone number
        const phoneCheck = validateAndNormalizePhoneNumber(studentPhone);
        if (!phoneCheck.isValid) {
          setAuthError(phoneCheck.error || "Please enter a valid phone number.");
          setIsLoading(false);
          return;
        }

        // Validate university selection
        const selectedUniObj = universities.find(u => u.id === studentUniId) || {
          id: studentUniId,
          name: studentUni,
          code: studentUniId,
          status: studentUniId === 'uniosun' ? 'active' : 'coming_soon'
        };

        const isUniActive = selectedUniObj.status === 'active' || selectedUniObj.id === 'uniosun';
        if (!isUniActive) {
          // Block submission for coming soon university
          setIsLoading(false);
          return;
        }

        const studentData = {
          uid: googleAuthData.uid || auth.currentUser?.uid || '',
          name: studentName.trim() || googleAuthData.displayName || 'Student',
          email: googleAuthData.email,
          photoURL: googleAuthData.photoURL || '',
          avatarUrl: googleAuthData.photoURL || '',
          phoneNumber: phoneCheck.normalized,
          phone: phoneCheck.normalized,
          universityId: selectedUniObj.id,
          universityName: selectedUniObj.name,
          profileCompleted: true
        };

        await saveStudentProfileToFirestore(studentData);

        const fullData = {
          id: studentData.uid,
          role: 'student' as UserRole,
          name: studentData.name,
          email: studentData.email,
          phone: studentData.phoneNumber,
          universityId: studentData.universityId,
          universityName: studentData.universityName,
          avatarUrl: studentData.photoURL,
          isSignup: false,
          isEmailVerified: true
        };

        onCompleteOnboarding(fullData);
      } else {
        // Agent path
        const fullData = {
          id: googleAuthData.uid || auth.currentUser?.uid || '',
          role: selectedRole,
          name: agentName || googleAuthData.displayName || 'Property Agent',
          email: googleAuthData.email,
          phone: agentPhoneWA,
          universityName: agentUni,
          agencyName: agencyName || `${agentName} Housing`,
          avatarUrl: googleAuthData.photoURL,
          isSignup: true,
          isEmailVerified: true
        };

        await saveUserToFirestore(fullData);
        onCompleteOnboarding(fullData);
      }
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      setAuthError("We couldn't save your profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signup') {
        // 1. Create a new Firebase Authentication account
        await registerWithEmail(studentEmail.trim().toLowerCase(), studentPassword);

        // 2. Refresh current Firebase user
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        const fbUser = auth.currentUser;
        if (!fbUser) throw new Error("Firebase account creation failed.");

        const isVerified = fbUser.emailVerified === true;

        const studentData = {
          id: fbUser.uid,
          role: 'student' as UserRole,
          name: studentName || studentEmail.split('@')[0],
          email: studentEmail.trim().toLowerCase(),
          phone: studentPhone,
          universityName: studentUni,
          isSignup: true,
          isEmailVerified: isVerified
        };

        // 3. Save initial profile to Firestore
        await saveUserToFirestore(studentData);

        // 4. Send to verification screen & block access until verified
        setPendingUserOnboardingData(studentData);
        setShowEmailVerificationScreen(true);
      } else {
        // SIGN IN
        // 1. Authenticate with Firebase Auth
        await loginWithEmail(studentEmail.trim().toLowerCase(), studentPassword);

        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        const fbUser = auth.currentUser;
        if (!fbUser) throw new Error("Authentication failed.");

        const isVerified = fbUser.emailVerified === true;

        // 2. Fetch profile from Firestore
        const existingProfile = await fetchUserProfileFromFirestore(fbUser.uid) || await fetchUserProfileFromFirestore(fbUser.email || studentEmail.trim().toLowerCase());

        const studentData = {
          id: fbUser.uid,
          role: (existingProfile?.role || selectedRole || 'student') as UserRole,
          name: existingProfile?.name || fbUser.displayName || studentEmail.split('@')[0],
          email: fbUser.email || studentEmail.trim().toLowerCase(),
          phone: existingProfile?.phone || '',
          universityName: existingProfile?.universityName || studentUni,
          avatarUrl: existingProfile?.avatarUrl || fbUser.photoURL,
          isSignup: false,
          isEmailVerified: isVerified
        };

        // Update verification status in Firestore
        await saveUserToFirestore({
          id: fbUser.uid,
          name: studentData.name,
          email: studentData.email,
          role: studentData.role,
          isEmailVerified: isVerified
        });

        // 3. If email is not verified, show verification screen
        if (!isVerified) {
          setPendingUserOnboardingData(studentData);
          setShowEmailVerificationScreen(true);
        } else {
          onCompleteOnboarding(studentData);
        }
      }
    } catch (err: any) {
      console.error("Firebase Student Auth Error:", err);
      let errorMsg = err?.message || "Authentication failed. Please check your credentials and try again.";
      if (err?.code === 'auth/network-request-failed') {
        errorMsg = "Network connection failed during authentication. Please check your internet connection or use Google Sign-In below.";
      } else if (err?.code === 'auth/operation-not-allowed') {
        errorMsg = "Email/Password sign-up is disabled in your Firebase project (dormiqa-e16b8). Please enable Email/Password provider in Firebase Console > Authentication > Sign-in method, or sign in with Google below.";
      } else if (err?.code === 'auth/unauthorized-domain') {
        errorMsg = "Domain not authorized for email operations in Firebase. Please use Google Sign-In below.";
      } else if (err?.code === 'auth/user-not-found') {
        errorMsg = "Account not found. Please sign up first.";
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        errorMsg = "Incorrect email or password.";
      } else if (err?.code === 'auth/user-disabled') {
        errorMsg = "This account has been disabled. Please contact support.";
      } else if (err?.code === 'auth/email-already-in-use') {
        errorMsg = "An account with this email address already exists. Please click 'Sign In' or use a different email.";
      } else if (err?.code === 'auth/invalid-email') {
        errorMsg = "Invalid email address format. Please check your email.";
      } else if (err?.code === 'auth/weak-password') {
        errorMsg = "Password is too weak. Please use at least 6 characters.";
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

    try {
      if (authMode === 'signup') {
        // 1. Create a new Firebase Authentication account
        await registerWithEmail(agentEmail.trim().toLowerCase(), agentPassword);

        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        const fbUser = auth.currentUser;
        if (!fbUser) throw new Error("Firebase account creation failed.");

        const isVerified = fbUser.emailVerified === true;

        const agentData = {
          id: fbUser.uid,
          role: 'agent' as UserRole,
          name: agentName || agentEmail.split('@')[0],
          email: agentEmail.trim().toLowerCase(),
          agencyName: agencyName || `${agentName || 'Agent'} Housing`,
          phone: agentPhoneWA,
          universityName: agentUni,
          isSignup: true,
          isEmailVerified: isVerified
        };

        // 2. Save profile to Firestore
        await saveUserToFirestore(agentData);

        // 3. Send to verification screen & block access until verified
        setPendingUserOnboardingData(agentData);
        setShowEmailVerificationScreen(true);
      } else {
        // SIGN IN
        await loginWithEmail(agentEmail.trim().toLowerCase(), agentPassword);

        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        const fbUser = auth.currentUser;
        if (!fbUser) throw new Error("Authentication failed.");

        const isVerified = fbUser.emailVerified === true;

        const existingProfile = await fetchUserProfileFromFirestore(fbUser.uid) || await fetchUserProfileFromFirestore(fbUser.email || agentEmail.trim().toLowerCase());

        const agentData = {
          id: fbUser.uid,
          role: (existingProfile?.role || selectedRole || 'agent') as UserRole,
          name: existingProfile?.name || fbUser.displayName || agentEmail.split('@')[0],
          email: fbUser.email || agentEmail.trim().toLowerCase(),
          agencyName: existingProfile?.agencyName || agencyName,
          phone: existingProfile?.phone || agentPhoneWA,
          universityName: existingProfile?.universityName || agentUni,
          avatarUrl: existingProfile?.avatarUrl || fbUser.photoURL,
          businessVerificationStatus: existingProfile?.businessVerificationStatus || 'none',
          isVerifiedAgent: existingProfile?.isVerifiedAgent || false,
          isSignup: false,
          isEmailVerified: isVerified
        };

        await saveUserToFirestore({
          id: fbUser.uid,
          name: agentData.name,
          email: agentData.email,
          isEmailVerified: isVerified
        });

        if (!isVerified) {
          setPendingUserOnboardingData(agentData);
          setShowEmailVerificationScreen(true);
        } else {
          onCompleteOnboarding(agentData);
        }
      }
    } catch (err: any) {
      console.error("Firebase Agent Auth Error:", err);
      let errorMsg = err?.message || "Authentication failed. Please check your credentials and try again.";
      if (err?.code === 'auth/network-request-failed') {
        errorMsg = "Network connection failed during authentication. Please check your internet connection or use Google Sign-In below.";
      } else if (err?.code === 'auth/operation-not-allowed') {
        errorMsg = "Email/Password sign-up is disabled in your Firebase project (dormiqa-e16b8). Please enable Email/Password provider in Firebase Console > Authentication > Sign-in method, or sign in with Google below.";
      } else if (err?.code === 'auth/unauthorized-domain') {
        errorMsg = "Domain not authorized for email operations in Firebase. Please use Google Sign-In below.";
      } else if (err?.code === 'auth/user-not-found') {
        errorMsg = "Account not found. Please sign up first.";
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        errorMsg = "Incorrect email or password.";
      } else if (err?.code === 'auth/user-disabled') {
        errorMsg = "This account has been disabled. Please contact support.";
      } else if (err?.code === 'auth/email-already-in-use') {
        errorMsg = "An account with this email address already exists. Please click 'Sign In' or use a different email.";
      } else if (err?.code === 'auth/invalid-email') {
        errorMsg = "Invalid email address format. Please check your email.";
      } else if (err?.code === 'auth/weak-password') {
        errorMsg = "Password is too weak. Please use at least 6 characters.";
      }
      setAuthError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (showEmailVerificationScreen) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-neutral-50 dark:bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-4">
        <EmailVerificationCard
          email={pendingUserOnboardingData?.email || studentEmail || agentEmail || auth.currentUser?.email || ''}
          onBack={() => setShowEmailVerificationScreen(false)}
          onVerified={async () => {
            if (auth.currentUser) {
              await auth.currentUser.reload();
            }
            const isVerified = auth.currentUser?.emailVerified === true;
            if (!isVerified) return;

            const verifiedData = {
              ...pendingUserOnboardingData,
              isEmailVerified: true
            };
            await saveUserToFirestore(verifiedData);
            onCompleteOnboarding(verifiedData);
          }}
        />
      </div>
    );
  }

  if (googleAuthData) {
    const selectedUniObj = universities.find(u => u.id === (selectedRole === 'student' ? studentUniId : agentUniId));
    const isComingSoon = selectedRole === 'student' && selectedUniObj && selectedUniObj.status === 'coming_soon' && selectedUniObj.id !== 'uniosun';

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
          
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-bold">
              <GoogleIcon />
              <span>Google OAuth Verified</span>
            </div>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
              Complete your profile
            </h2>
            <p className="text-xs text-neutral-600 max-w-sm mx-auto leading-relaxed">
              Just a few details before you start exploring accommodation.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-black text-white border border-neutral-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* User Role Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">Select Account Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={async () => {
                  setSelectedRole('student');
                  if (googleAuthData) {
                    setIsLoading(true);
                    try {
                      const studentData = {
                        id: googleAuthData.uid,
                        role: 'student' as UserRole,
                        name: googleAuthData.displayName || googleAuthData.email.split('@')[0] || 'Student',
                        email: googleAuthData.email,
                        phone: '',
                        universityId: 'uniosun',
                        universityName: 'Osun State University (UNIOSUN)',
                        avatarUrl: googleAuthData.photoURL,
                        isSignup: false,
                        isEmailVerified: true
                      };
                      await saveUserToFirestore(studentData);
                      await saveStudentProfileToFirestore({
                        uid: googleAuthData.uid,
                        name: studentData.name,
                        email: studentData.email,
                        photoURL: studentData.avatarUrl,
                        avatarUrl: studentData.avatarUrl,
                        phoneNumber: '',
                        phone: '',
                        universityId: 'uniosun',
                        universityName: 'Osun State University (UNIOSUN)',
                        profileCompleted: true
                      });
                      onCompleteOnboarding(studentData);
                    } catch (e) {
                      console.error("Student Google auto-complete error:", e);
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }}
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

            {/* University Selector */}
            <UniversitySelector
              universities={universities}
              selectedUniversityId={selectedRole === 'student' ? studentUniId : agentUniId}
              onSelectUniversity={(uni) => {
                if (selectedRole === 'student') {
                  setStudentUniId(uni.id);
                  setStudentUni(uni.name);
                } else {
                  setAgentUniId(uni.id);
                  setAgentUni(uni.name);
                }
              }}
              label={selectedRole === 'student' ? 'University' : 'Primary Serviced Campus'}
              required
            />

            {/* Coming Soon Notice */}
            {isComingSoon && selectedUniObj && (
              <div className="p-4 bg-black text-white rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs text-white">
                      Dormiqa isn't available at this university yet.
                    </h4>
                    <p className="text-xs text-neutral-300 mt-0.5">
                      We're expanding rapidly! Join our waitlist to get early access when we launch at {selectedUniObj.name}.
                    </p>
                  </div>
                </div>
                <a
                  href={`https://dormiqa-waitlist.vercel.app?university=${encodeURIComponent(selectedUniObj.shortName || selectedUniObj.code || selectedUniObj.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs rounded-xl transition-all shadow-xs"
                >
                  <span>Join the waitlist →</span>
                </a>
              </div>
            )}

            {/* Phone Number (WhatsApp) */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">Phone number</label>
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
                  placeholder="+234 801 234 5678"
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
                disabled={isLoading || isComingSoon}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Save & Start Exploring →</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
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
          {selectedRole === 'agent' ? (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-xl text-xs text-neutral-700 dark:text-neutral-300 font-semibold mb-6 flex items-center gap-2 border border-neutral-200 dark:border-neutral-700">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Agent Portal: Caretakers and Agents sign in and register using Email & Password.</span>
            </div>
          ) : (
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
          )}

          {authError && (
            <div className="p-3 bg-black text-white rounded-xl flex items-center gap-2 text-xs font-medium mb-4 border border-neutral-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* OPTION A: GOOGLE SIGN-IN / SIGN-UP (STUDENTS ONLY) */}
          {authMethod === 'google' && selectedRole === 'student' ? (
            <div className="space-y-4 py-4">
              <div className="p-6 border border-neutral-200 rounded-2xl bg-neutral-50 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center mx-auto shadow-xs">
                  <GoogleIcon />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">
                    {authMode === 'signup' 
                      ? `Sign Up as Student with Google`
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
                    className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 font-extrabold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-600" /> : <GoogleIcon />}
                    <span>{authMode === 'signup' ? `Sign Up as Student with Google` : 'Sign In with Google'}</span>
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

                        {/* University Selection */}
                        <UniversitySelector
                          universities={universities}
                          selectedUniversityId={studentUniId}
                          onSelectUniversity={(uni) => {
                            setStudentUniId(uni.id);
                            setStudentUni(uni.name);
                          }}
                          label="University / Institution"
                          required
                        />
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

                      {/* Serviced University Selector */}
                      <UniversitySelector
                        universities={universities}
                        selectedUniversityId={agentUniId}
                        onSelectUniversity={(uni) => {
                          setAgentUniId(uni.id);
                          setAgentUni(uni.name);
                        }}
                        label="Primary University / Polytechnic Serviced"
                        required
                      />

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
