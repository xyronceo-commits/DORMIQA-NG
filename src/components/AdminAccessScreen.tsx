import React, { useState } from 'react';
import { Shield, ShieldAlert, Loader2, ArrowLeft, Lock, Mail, KeyRound, QrCode, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AdminAccessScreenProps {
 status: 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ADMIN_CHECKING' | 'AUTHORIZED' | 'UNAUTHORIZED' | 'SESSION_EXPIRED' | 'SIGNED_OUT';
 currentUserEmail?: string;
 errorMessage?: string | null;
 onContinueWithGoogle: () => void;
 onAdminSuccess?: () => void;
 onBackToDormiqa: () => void;
}

export const AdminAccessScreen: React.FC<AdminAccessScreenProps> = ({
 status,
 currentUserEmail,
 errorMessage,
 onContinueWithGoogle,
 onAdminSuccess,
 onBackToDormiqa,
}) => {
 const [authMode, setAuthMode] = useState<'google' | 'password'>('google');
 const [email, setEmail] = useState((import.meta.env.VITE_ADMIN_EMAIL || 'buildsafe247@gmail.com').trim().toLowerCase());
 const [password, setPassword] = useState('');
 const [totpCode, setTotpCode] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [localError, setLocalError] = useState<string | null>(null);

 // MFA state
 const [mfaStage, setMfaStage] = useState<'none' | 'challenge' | 'enroll'>('none');
 const [factorId, setFactorId] = useState<string>('');
 const [enrollQrSvg, setEnrollQrSvg] = useState<string>('');
 const [enrollSecret, setEnrollSecret] = useState<string>('');

 if (status === 'AUTH_LOADING' || status === 'ADMIN_CHECKING') {
  return (
   <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
    <div className="flex flex-col items-center gap-4 text-center max-w-sm p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl">
     <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
      <Loader2 className="w-7 h-7 animate-spin" />
     </div>
     <div className="space-y-1">
      <h3 className="text-base font-bold text-black dark:text-white">
       Dormiqa Admin
      </h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
       Verifying administrator credentials...
      </p>
     </div>
    </div>
   </div>
  );
 }

 if (status === 'UNAUTHORIZED') {
  return (
   <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
    <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-6 animate-in fade-in duration-200">
     <div className="w-16 h-16 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center mx-auto">
      <ShieldAlert className="w-8 h-8 text-emerald-400 dark:text-emerald-600" />
     </div>

     <div className="space-y-2">
      <h2 className="text-xl font-black text-black dark:text-white tracking-tight">
       Access denied
      </h2>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
       Admin access is restricted to verified administrators.
      </p>
     </div>

     <div className="pt-2 space-y-2">
      <button
       onClick={onBackToDormiqa}
       className="w-full py-3.5 px-4 rounded-2xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
       <ArrowLeft className="w-4 h-4" />
       <span>Back to Dormiqa</span>
      </button>
      <button
       onClick={onContinueWithGoogle}
       className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
      >
       Sign in with authorized Google account
      </button>
     </div>
    </div>
   </div>
  );
 }

 const isExpired = status === 'SESSION_EXPIRED';

 const handlePasswordSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLocalError(null);
  setIsSubmitting(true);

  try {
   const cleanEmail = email.trim().toLowerCase();
   const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password
   });

   if (error) {
    throw error;
   }

   if (!data.user) {
    throw new Error('Authentication failed. No user returned.');
   }

   // Check MFA Assurance Level
   const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
   if (aalError) throw aalError;

   if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
    // Factor already enrolled: challenge it
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    const totpFactor = factorsData.totp.find(f => f.status === 'verified');
    if (totpFactor) {
     setFactorId(totpFactor.id);
     setMfaStage('challenge');
     setIsSubmitting(false);
     return;
    }
   }

   if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal1') {
    // No verified factor enrolled yet: initiate enrollment for admin
    const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
     factorType: 'totp',
     issuer: 'Dormiqa Admin'
    });

    if (enrollError) throw enrollError;

    setFactorId(enrollData.id);
    setEnrollQrSvg(enrollData.totp.qr_code || '');
    setEnrollSecret(enrollData.totp.secret || '');
    setMfaStage('enroll');
    setIsSubmitting(false);
    return;
   }

   // If already at AAL2 (or non-MFA enabled), complete
   setIsSubmitting(false);
   if (onAdminSuccess) onAdminSuccess();
  } catch (err: any) {
   setIsSubmitting(false);
   console.warn('[ADMIN LOGIN] Password login error:', err);
   setLocalError(err.message || 'Login failed. Please check your credentials.');
  }
 };

 const handleVerifyTotp = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!totpCode || totpCode.trim().length < 6) {
   setLocalError('Please enter a valid 6-digit authenticator code.');
   return;
  }

  setLocalError(null);
  setIsSubmitting(true);

  try {
   const cleanCode = totpCode.trim().replace(/\s+/g, '');
   const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: cleanCode
   });

   if (error) throw error;

   setIsSubmitting(false);
   setMfaStage('none');
   if (onAdminSuccess) onAdminSuccess();
  } catch (err: any) {
   setIsSubmitting(false);
   console.warn('[ADMIN MFA] Code verification error:', err);
   setLocalError(err.message || 'Invalid 6-digit authenticator code.');
  }
 };

 return (
  <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
   <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-6 animate-in fade-in duration-200">
    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/50 dark:border-emerald-800/50">
     <Shield className="w-8 h-8" />
    </div>

    <div className="space-y-1">
     <h2 className="text-2xl font-black text-black dark:text-white tracking-tight">
      Dormiqa Admin
     </h2>
     <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
      Authorized administrator portal
     </p>
    </div>


    {(errorMessage || localError) && (
     <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-medium text-left">
      {localError || errorMessage}
     </div>
    )}

    {/* Tab switch: Google vs Email+Password */}
    {mfaStage === 'none' && (
     <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1">
      <button
       type="button"
       onClick={() => { setAuthMode('google'); setLocalError(null); }}
       className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
        authMode === 'google'
         ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm'
         : 'text-neutral-500 hover:text-black dark:hover:text-white'
       }`}
      >
       Google Sign-In
      </button>
      <button
       type="button"
       onClick={() => { setAuthMode('password'); setLocalError(null); }}
       className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
        authMode === 'password'
         ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm'
         : 'text-neutral-500 hover:text-black dark:hover:text-white'
       }`}
      >
       Password & MFA
      </button>
     </div>
    )}

    {/* Stage 1: Google OAuth */}
    {mfaStage === 'none' && authMode === 'google' && (
     <div className="pt-2 space-y-3">
      <button
       onClick={onContinueWithGoogle}
       className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-800 dark:text-white font-extrabold text-xs border border-neutral-300 dark:border-neutral-700 shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer hover:shadow"
      >
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
       <span>Continue with Google</span>
      </button>
      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
       Direct sign-in using verified administrator Google account
      </p>
     </div>
    )}

    {/* Stage 1: Password Form */}
    {mfaStage === 'none' && authMode === 'password' && (
     <form onSubmit={handlePasswordSubmit} className="pt-2 space-y-3 text-left">
      <div>
       <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
        Admin Email
       </label>
       <div className="relative">
        <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
        <input
         type="email"
         value={email}
         onChange={(e) => setEmail(e.target.value)}
         required
         placeholder="admin@dormiqa.com"
         className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-black dark:text-white focus:outline-none focus:border-emerald-500"
        />
       </div>
      </div>

      <div>
       <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
        Password
       </label>
       <div className="relative">
        <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
        <input
         type="password"
         value={password}
         onChange={(e) => setPassword(e.target.value)}
         required
         placeholder="••••••••••••"
         className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-black dark:text-white focus:outline-none focus:border-emerald-500"
        />
       </div>
      </div>

      <button
       type="submit"
       disabled={isSubmitting}
       className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
       {isSubmitting ? (
        <>
         <Loader2 className="w-4 h-4 animate-spin" />
         <span>Authenticating...</span>
        </>
       ) : (
        <span>Sign In with Password</span>
       )}
      </button>
     </form>
    )}

    {/* Stage 2: TOTP Challenge (Authenticator App code required) */}
    {mfaStage === 'challenge' && (
     <form onSubmit={handleVerifyTotp} className="pt-2 space-y-4 text-left">
      <div className="text-center space-y-1">
       <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto mb-2">
        <KeyRound className="w-5 h-5" />
       </div>
       <h3 className="text-sm font-bold text-black dark:text-white">Two-Factor Authentication</h3>
       <p className="text-[11px] text-neutral-500">
        Enter the 6-digit code from your authenticator app
       </p>
      </div>

      <div>
       <input
        type="text"
        maxLength={6}
        autoFocus
        placeholder="000000"
        value={totpCode}
        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
        className="w-full py-3 text-center text-lg tracking-widest font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-black dark:text-white focus:outline-none focus:border-emerald-500"
       />
      </div>

      <button
       type="submit"
       disabled={isSubmitting || totpCode.length < 6}
       className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
       {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Access Admin</span>}
      </button>

      <button
       type="button"
       onClick={() => { setMfaStage('none'); setTotpCode(''); }}
       className="w-full py-2 text-center text-xs text-neutral-500 hover:text-black dark:hover:text-white"
      >
       Cancel
      </button>
     </form>
    )}

    {/* Stage 3: TOTP Enrollment (First-time MFA setup for Admin) */}
    {mfaStage === 'enroll' && (
     <form onSubmit={handleVerifyTotp} className="pt-2 space-y-4 text-left">
      <div className="text-center space-y-1">
       <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center mx-auto mb-2">
        <QrCode className="w-5 h-5" />
       </div>
       <h3 className="text-sm font-bold text-black dark:text-white">Enroll Authenticator (MFA)</h3>
       <p className="text-[11px] text-neutral-500">
        Scan this QR code with Google Authenticator or 1Password
       </p>
      </div>

      {enrollQrSvg && (
       <div
        className="flex justify-center p-4 bg-white rounded-2xl border border-neutral-200"
        dangerouslySetInnerHTML={{ __html: enrollQrSvg }}
       />
      )}

      {enrollSecret && (
       <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-center">
        <p className="text-[10px] text-neutral-500 uppercase font-mono">Manual Key</p>
        <code className="text-xs font-mono font-bold text-black dark:text-white">{enrollSecret}</code>
       </div>
      )}

      <div>
       <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
        Enter Verification Code from App
       </label>
       <input
        type="text"
        maxLength={6}
        placeholder="000000"
        value={totpCode}
        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
        className="w-full py-2.5 text-center text-base tracking-widest font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-black dark:text-white focus:outline-none focus:border-emerald-500"
       />
      </div>

      <button
       type="submit"
       disabled={isSubmitting || totpCode.length < 6}
       className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
       {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Complete Setup & Access</span>}
      </button>

      <button
       type="button"
       onClick={() => { setMfaStage('none'); setTotpCode(''); }}
       className="w-full py-2 text-center text-xs text-neutral-500 hover:text-black dark:hover:text-white"
      >
       Cancel
      </button>
     </form>
    )}

    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
     <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
       Protected Administrator Environment (Google OAuth & TOTP MFA)
     </p>
    </div>
   </div>
  </div>
 );
};
