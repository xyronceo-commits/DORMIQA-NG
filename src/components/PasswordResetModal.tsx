import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  RefreshCw, 
  ShieldAlert 
} from 'lucide-react';

export type PasswordResetStep = 'forgot' | 'check_email';

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

  if (!isOpen) return null;

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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer min-h-[44px]"
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
              <div 
                aria-live="polite"
                className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                  isGoogleOnly 
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold' 
                    : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 font-medium'
                }`}
              >
                {isGoogleOnly ? <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />}
                <div className="space-y-1">
                  <p>{errorMessage}</p>
                  {isGoogleOnly && (
                    <button
                      type="button"
                      onClick={() => onSwitchToSignIn()}
                      className="text-xs font-bold underline text-amber-800 dark:text-amber-300 hover:text-amber-900 cursor-pointer block pt-0.5 min-h-[44px] flex items-center"
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
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@uniosun.edu.ng"
                    className="w-full pl-10 pr-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>Send Reset Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchToSignIn(email)}
                  className="w-full py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer text-center min-h-[44px] flex items-center justify-center"
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
              <div aria-live="polite" className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-900 dark:text-red-200 font-semibold flex items-center gap-2">
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
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border min-h-[44px] ${
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
                className="w-full py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer text-center min-h-[44px] flex items-center justify-center"
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
