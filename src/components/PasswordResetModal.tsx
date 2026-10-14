import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  RefreshCw, 
  Check, 
  ShieldAlert, 
  ExternalLink 
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { 
  detectAuthLinkError, 
  detectRecoveryUrl, 
  isRecoveryFlowActive, 
  markRecoveryFlowIfPresent, 
  clearRecoveryFlow 
} from '../utils/routing';

export type PasswordResetStep = 'forgot' | 'check_email' | 'reset' | 'success' | 'invalid_link';

interface PasswordResetModalProps {
  initialStep?: PasswordResetStep;
  initialEmail?: string;
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignIn: (email?: string) => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  initialStep = 'forgot',
  initialEmail = '',
  isOpen,
  onClose,
  onSwitchToSignIn,
}) => {
  const [step, setStep] = useState<PasswordResetStep>(initialStep);
  const [email, setEmail] = useState<string>(initialEmail);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isGoogleOnly, setIsGoogleOnly] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    setStep(initialStep);
    if (initialEmail) setEmail(initialEmail);
    setErrorMessage(null);
    setInfoMessage(null);
    setIsGoogleOnly(false);
  }, [initialStep, initialEmail, isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle password recovery link / action code detection
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const handleUrlAction = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const urlParams = new URLSearchParams(window.location.search);

        const errorCode = hashParams.get('error_code') || urlParams.get('error_code');
        const error = hashParams.get('error') || urlParams.get('error');

        // 1. Error links (e.g. error_code=otp_expired, error=access_denied) always show the "Invalid or expired link" screen
        if (detectAuthLinkError() || errorCode || error) {
          if (isMounted) setStep('invalid_link');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'onboarding' }, '', '/auth/reset-password');
          }
          return;
        }

        const type = hashParams.get('type') || urlParams.get('type');
        const tokenHash = urlParams.get('token_hash');
        const code = urlParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
        const isResetPath = pathname === '/auth/reset-password' || pathname === '/reset-password';

        // Only treat as reset when type=recovery OR on dedicated reset path
        // (Sign-up confirmation type=signup or Google sign-in code on other routes must NOT open reset screen)
        if (!isResetPath && type !== 'recovery') {
          return;
        }

        // Case A: token_hash with type=recovery (or on /auth/reset-password)
        if (tokenHash && (type === 'recovery' || isResetPath)) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
          if (verifyErr) {
            console.error('Password recovery token error:', verifyErr);
            if (isMounted) setStep('invalid_link');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'onboarding' }, '', '/auth/reset-password');
            }
            return;
          }
          markRecoveryFlowIfPresent();
          if (isMounted) setStep('reset');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'onboarding' }, '', '/auth/reset-password');
          }
          return;
        }

        // Case B: PKCE code (only on /auth/reset-password or if type=recovery)
        if (code && (isResetPath || type === 'recovery')) {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (codeErr) {
            console.error('Exchange code error:', codeErr);
            if (isMounted) setStep('invalid_link');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'onboarding' }, '', '/auth/reset-password');
            }
            return;
          }
          markRecoveryFlowIfPresent();
          if (isMounted) setStep('reset');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'onboarding' }, '', '/auth/reset-password');
          }
          return;
        }

        // Case C: Hash tokens (access_token & refresh_token with type=recovery or on /auth/reset-password)
        if (accessToken && refreshToken && (type === 'recovery' || isResetPath)) {
          const { error: sessionErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionErr) {
            console.error('Session set error:', sessionErr);
            if (isMounted) setStep('invalid_link');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'onboarding' }, '', '/auth/reset-password');
            }
            return;
          }
          markRecoveryFlowIfPresent();
          if (isMounted) setStep('reset');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'onboarding' }, '', '/auth/reset-password');
          }
          return;
        }

        // Case D: Direct visit to /auth/reset-password without tokens and without an active recovery session
        if (isResetPath) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session && !isRecoveryFlowActive()) {
            if (isMounted) setStep('invalid_link');
            return;
          }
          if (session || isRecoveryFlowActive()) {
            if (isMounted) setStep('reset');
            return;
          }
        }
      } catch (err) {
        console.warn('URL recovery parser notice:', err);
      }
    };

    handleUrlAction();

    // Listen to Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        markRecoveryFlowIfPresent();
        setStep('reset');
        setErrorMessage(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Password Strength Calculation
  const isMinLength = newPassword.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  let strengthLabel = 'Weak';
  let strengthColor = 'bg-red-500';
  let strengthWidth = 'w-1/4';
  if (isMinLength && hasNumberOrSymbol) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
    strengthWidth = 'w-full';
  } else if (isMinLength || hasNumberOrSymbol) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-amber-500';
    strengthWidth = 'w-2/3';
  }

  // 1. Submit Request for Reset Link (Forgot Password endpoint)
  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsGoogleOnly(false);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          const waitTime = data.retryAfterSeconds || 60;
          setResendCooldown(waitTime);
          setErrorMessage(data.message || `Too many requests. Please wait ${waitTime} seconds before trying again.`);
          return;
        }
        throw new Error(data.message || data.error || 'Could not process reset request.');
      }

      if (data.isGoogleOnly) {
        setIsGoogleOnly(true);
        setErrorMessage(data.message || 'This account signs in with Google. Please use Google Sign-In.');
        return;
      }

      // Success (Always standard message, no account enumeration)
      setStep('check_email');
      setResendCooldown(60);
      setInfoMessage(data.message || `If an account exists for ${trimmed}, a password reset link has been sent.`);
    } catch (err: any) {
      console.error('Forgot password submission error:', err);
      setErrorMessage(err?.message || 'Failed to request password reset. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Resend Reset Link from "Check your email" screen
  const handleResendResetLink = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          const wait = data.retryAfterSeconds || 60;
          setResendCooldown(wait);
          setErrorMessage(data.message || `Please wait ${wait} seconds before requesting another email.`);
          return;
        }
        throw new Error(data.message || 'Failed to resend reset link.');
      }
      setResendCooldown(60);
      setInfoMessage(`A fresh reset link has been sent to ${email}. Please check your inbox and spam folder.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not resend reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Submit New Password & Global Sign-out
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // Update password in Supabase
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Retrieve current session token to notify backend
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Trigger the Password Changed notice email (Section 2.3)
      if (accessToken) {
        try {
          await fetch('/api/auth/password-changed-notice', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (noticeErr) {
          console.warn('Password changed notice API error:', noticeErr);
        }
      }

      // Global sign-out of all sessions for security
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (_) {
        await supabase.auth.signOut();
      }

      // Clear local state and advance to Success
      setNewPassword('');
      setConfirmPassword('');
      setStep('success');
    } catch (err: any) {
      console.error('Password update failure:', err);
      if (err?.message?.toLowerCase().includes('expired') || err?.message?.toLowerCase().includes('invalid')) {
        setStep('invalid_link');
      } else {
        setErrorMessage(err?.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-5 transition-all text-neutral-900 dark:text-neutral-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-reset-title"
      >

        {/* STEP 1: FORGOT PASSWORD (EMAIL INPUT) */}
        {step === 'forgot' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => onSwitchToSignIn(email)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 id="password-reset-title" className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Forgot your password?
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Enter your registered email address and we'll send you a secure link to reset your password.
              </p>
            </div>

            {errorMessage && (
              <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                isGoogleOnly 
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold' 
                  : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 font-medium'
              }`}>
                {isGoogleOnly ? <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />}
                <div className="space-y-1">
                  <p>{errorMessage}</p>
                  {isGoogleOnly && (
                    <button
                      type="button"
                      onClick={() => onSwitchToSignIn()}
                      className="text-xs font-bold underline text-amber-800 dark:text-amber-300 hover:text-amber-900 cursor-pointer block pt-0.5"
                    >
                      Go to Google Sign-In →
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSendResetLink} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@uniosun.edu.ng"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>Send Reset Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchToSignIn(email)}
                  className="w-full py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer text-center"
                >
                  Cancel & Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: CHECK YOUR EMAIL */}
        {step === 'check_email' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Mail className="w-6 h-6" />
              </div>
              <h2 id="password-reset-title" className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Check your email
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed px-2">
                We've sent a password reset link to <strong className="text-neutral-900 dark:text-white font-extrabold">{email}</strong>.
              </p>
            </div>

            {infoMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-900 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-900 dark:text-red-200 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Spam Folder Guidance */}
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs space-y-1.5 text-neutral-600 dark:text-neutral-400">
              <p className="font-bold text-neutral-900 dark:text-white">Didn't see the email?</p>
              <ul className="text-[11px] space-y-1 list-disc pl-4">
                <li>Check your <strong>Spam</strong> or <strong>Junk</strong> folder.</li>
                <li>In Gmail, check the <strong>Updates</strong> or <strong>Promotions</strong> tab.</li>
                <li>The link will expire in <strong>1 hour</strong>.</li>
              </ul>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleResendResetLink}
                disabled={resendCooldown > 0 || isLoading}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                  resendCooldown > 0 || isLoading
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 cursor-not-allowed'
                    : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>
                  {resendCooldown > 0 
                    ? `Resend link in ${resendCooldown}s` 
                    : 'Resend reset link'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchToSignIn(email)}
                className="w-full py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer text-center"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RESET PASSWORD (NEW PASSWORD FORM) */}
        {step === 'reset' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h2 id="password-reset-title" className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Create new password
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Your new password must be at least 8 characters long.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-900 dark:text-red-200 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
              {/* New Password */}
              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-1.5 px-0.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-neutral-500">Strength:</span>
                    <span className={strengthLabel === 'Strong' ? 'text-emerald-600' : strengthLabel === 'Fair' ? 'text-amber-600' : 'text-red-600'}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full ${strengthColor} ${strengthWidth} transition-all duration-300 rounded-full`} />
                  </div>
                  <div className="flex items-center gap-3 pt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                    <span className={`flex items-center gap-1 ${isMinLength ? 'text-emerald-600 font-bold' : ''}`}>
                      <Check className="w-3 h-3" /> 8+ chars
                    </span>
                    <span className={`flex items-center gap-1 ${hasNumberOrSymbol ? 'text-emerald-600 font-bold' : ''}`}>
                      <Check className="w-3 h-3" /> Number or symbol
                    </span>
                  </div>
                </div>
              )}

              {/* Confirm New Password */}
              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">Passwords do not match.</p>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isLoading || !isMinLength || !passwordsMatch}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Update Password & Sign Out All Sessions</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: SUCCESS SCREEN */}
        {step === 'success' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 id="password-reset-title" className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Password changed successfully!
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                All existing sessions have been signed out for security. A security confirmation email has been dispatched.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSwitchToSignIn(email)}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Sign In to Dormiqa</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: INVALID OR EXPIRED LINK */}
        {step === 'invalid_link' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 id="password-reset-title" className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Reset link invalid or expired
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                This password reset link is invalid, expired (after 1 hour), or has already been used.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setStep('forgot')}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Request a Fresh Reset Link</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchToSignIn(email)}
                className="w-full py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer text-center"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
