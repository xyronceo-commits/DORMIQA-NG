import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, Loader2, ArrowLeft, Lock, Mail, KeyRound, CheckCircle2, RotateCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { requestAdminOtp, startAdminSession } from '../services/api';
import { PasswordResetModal } from './PasswordResetModal';

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
  onAdminSuccess,
  onBackToDormiqa,
}) => {
  const [email, setEmail] = useState<string>(() => currentUserEmail || 'buildsafe247@gmail.com');
  const [otpStage, setOtpStage] = useState<'email' | 'otp'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [showResetModal, setShowResetModal] = useState(false);

  // Request guards to prevent concurrent calls or double submissions
  const isRequestingOtpRef = useRef(false);
  const isVerifyingOtpRef = useRef(false);

  // Active countdown timer for OTP resend cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Loading state
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
              Verifying administrator credentials & session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Session expired state (Enforce 12-hour session deadline)
  if (status === 'SESSION_EXPIRED') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200/50 dark:border-amber-800/50">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-black dark:text-white tracking-tight">
              Session Expired
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
              Your admin session has expired. Sign in again to continue.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={async () => {
                await supabase.auth.signOut().catch(() => {});
                setOtpStage('email');
                setLocalError(null);
                setInfoNotice(null);
                if (onAdminSuccess) onAdminSuccess();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Sign In with Admin OTP</span>
            </button>
            <button
              onClick={onBackToDormiqa}
              className="w-full py-3 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dormiqa</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Access denied state for unauthorized accounts
  if (status === 'UNAUTHORIZED') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200/50">
            <ShieldAlert className="w-8 h-8" />
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
              onClick={async () => {
                await supabase.auth.signOut().catch(() => {});
                setOtpStage('email');
                setLocalError(null);
                setInfoNotice(null);
                if (onAdminSuccess) onAdminSuccess();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Sign In with Admin Account</span>
            </button>
            <button
              onClick={onBackToDormiqa}
              className="w-full py-3 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dormiqa</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Request OTP for authorized admin email (Guarded against duplicate calls)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRequestingOtpRef.current || isSubmitting) return;

    setLocalError(null);
    setInfoNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter a valid administrator email address.');
      return;
    }

    isRequestingOtpRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await requestAdminOtp(cleanEmail);
      setOtpStage('otp');
      setCooldownSeconds(response.cooldownSeconds || 60);
      setInfoNotice(response.message || `A verification code was sent to ${cleanEmail}. Check your inbox.`);
    } catch (err: any) {
      console.warn('[ADMIN OTP REQUEST] Supabase notice:', err?.message);
      const msg = err?.message || 'Unable to send OTP. Please verify your administrator email.';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('security') || msg.includes('429')) {
        const secMatch = msg.match(/after (\d+) seconds/i);
        const waitSec = secMatch ? parseInt(secMatch[1], 10) : 60;
        setCooldownSeconds(waitSec);
      }
      setLocalError(msg);
    } finally {
      isRequestingOtpRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Step 2: Validate OTP code & start 12-hour session (Guarded against double submission)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifyingOtpRef.current || isSubmitting) return;

    setLocalError(null);

    const cleanCode = otpCode.trim().replace(/\D/g, '');
    if (cleanCode.length < 6 || cleanCode.length > 8) {
      setLocalError('Please enter the complete verification code (6 to 8 digits).');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    isVerifyingOtpRef.current = true;
    setIsSubmitting(true);

    try {
      // 1. Validate OTP with authentication provider
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'email',
      });

      if (error) {
        throw error;
      }

      if (!data.session?.access_token || !data.user) {
        throw new Error('Authentication failed. No active session returned by provider.');
      }

      // 2. Register trusted 12-hour administrative session on the server
      await startAdminSession(data.session.access_token);

      // Trigger App.tsx admin verification check
      if (onAdminSuccess) {
        onAdminSuccess();
      }
    } catch (err: any) {
      console.warn('[ADMIN OTP VERIFY] Verification error:', err?.message);
      setLocalError(err?.message || 'Invalid or expired verification code. Please request a new one.');
    } finally {
      isVerifyingOtpRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Resend OTP code with rate limit cooldown and request guard
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isSubmitting || isRequestingOtpRef.current) return;
    setLocalError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter a valid administrator email address.');
      return;
    }

    isRequestingOtpRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await requestAdminOtp(cleanEmail);
      setCooldownSeconds(response.cooldownSeconds || 60);
      setInfoNotice('A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      console.warn('[ADMIN OTP RESEND] Supabase notice:', err?.message);
      const msg = err?.message || 'Failed to resend code. Please try again in a moment.';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('security') || msg.includes('429')) {
        const secMatch = msg.match(/after (\d+) seconds/i);
        const waitSec = secMatch ? parseInt(secMatch[1], 10) : 60;
        setCooldownSeconds(waitSec);
      }
      setLocalError(msg);
    } finally {
      isRequestingOtpRef.current = false;
      setIsSubmitting(false);
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
            Authorized administrator portal — 8-digit OTP & 12-hour session security
          </p>
        </div>

        {infoNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-left flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{infoNotice}</span>
          </div>
        )}

        {(errorMessage || localError) && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-medium text-left">
            {localError || errorMessage}
          </div>
        )}

        {/* STAGE 1: Administrator Email Input */}
        {otpStage === 'email' && (
          <form onSubmit={handleRequestOtp} className="pt-2 space-y-4 text-left">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                  Administrator Email
                </label>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Verified account required
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="buildsafe247@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-black dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                A verification code will be dispatched to your email for authentication.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Code...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onBackToDormiqa}
              className="w-full py-2.5 text-center text-xs text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              Back to Dormiqa
            </button>
          </form>
        )}

        {/* STAGE 2: Sign-In OTP Code Verification */}
        {otpStage === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="pt-2 space-y-4 text-left">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white">
                Enter Verification Code
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Enter the verification code sent to <span className="font-semibold text-black dark:text-white">{email}</span>
              </p>
            </div>

            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                autoFocus
                placeholder="Code (6-8 digits)"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full py-3.5 text-center text-xl tracking-[0.25em] font-mono font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-black dark:text-white focus:outline-none focus:border-emerald-500 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otpCode.trim().length < 6}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <span>Verify & Access Admin Dashboard</span>
              )}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setOtpStage('email');
                  setOtpCode('');
                  setLocalError(null);
                  setInfoNotice(null);
                }}
                className="text-[11px] font-semibold text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
              >
                Change email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldownSeconds > 0 || isSubmitting}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className={`w-3 h-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>
                  {cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : 'Resend code'}
                </span>
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Sessions expire after 12 hours. Re-authentication requires a fresh OTP.
          </p>
        </div>
      </div>

      <PasswordResetModal
        isOpen={showResetModal}
        initialEmail={email || 'buildsafe247@gmail.com'}
        onClose={() => setShowResetModal(false)}
        onSwitchToSignIn={(em) => {
          setShowResetModal(false);
          if (em) setEmail(em);
        }}
      />
    </div>
  );
};
