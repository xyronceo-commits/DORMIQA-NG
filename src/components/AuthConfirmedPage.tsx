import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  RefreshCw, 
  Mail,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthConfirmedPageProps {
  onContinue: () => void;
  onSwitchToSignIn: (email?: string) => void;
}

type ConfirmedPageState = 'checking' | 'confirmed' | 'invalid';

export const AuthConfirmedPage: React.FC<AuthConfirmedPageProps> = ({
  onContinue,
  onSwitchToSignIn,
}) => {
  const [state, setState] = useState<ConfirmedPageState>('checking');
  const [emailInput, setEmailInput] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let isMounted = true;

    const processConfirmationLink = async () => {
      try {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(search);

        const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
        const error = hashParams.get('error') || searchParams.get('error');

        // 1. Error links -> invalid state
        if (errorCode || error) {
          if (isMounted) setState('invalid');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'auth-confirmed' }, '', '/auth/confirmed');
          }
          return;
        }

        const type = hashParams.get('type') || searchParams.get('type');
        const tokenHash = searchParams.get('token_hash');
        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // If type=recovery, this belongs to Reset Password page. Do not handle here.
        if (type === 'recovery' || hash.includes('type=recovery') || search.includes('type=recovery')) {
          if (isMounted) setState('invalid');
          return;
        }

        // Case A: token_hash with type=signup / email
        if (tokenHash) {
          const verifyType = type === 'email' ? 'email' : 'signup';
          const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: verifyType as any });
          if (verifyErr) {
            console.error('Email verification token error:', verifyErr);
            if (isMounted) setState('invalid');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'auth-confirmed' }, '', '/auth/confirmed');
            }
            return;
          }
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'auth-confirmed' }, '', '/auth/confirmed');
          }
          if (isMounted) setState('confirmed');
          return;
        }

        // Case B: PKCE code
        if (code) {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (codeErr) {
            console.error('Exchange code error:', codeErr);
            if (isMounted) setState('invalid');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'auth-confirmed' }, '', '/auth/confirmed');
            }
            return;
          }
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'auth-confirmed' }, '', '/auth/confirmed');
          }
          if (isMounted) setState('confirmed');
          return;
        }

        // Case C: Hash tokens (access_token & refresh_token with type=signup)
        if (accessToken && refreshToken) {
          const { error: sessionErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionErr) {
            console.error('Session set error:', sessionErr);
            if (isMounted) setState('invalid');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'auth-confirmed' }, '', '/auth/confirmed');
            }
            return;
          }
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'auth-confirmed' }, '', '/auth/confirmed');
          }
          if (isMounted) setState('confirmed');
          return;
        }

        // Case D: Direct visit to /auth/confirmed without tokens
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at) {
          if (isMounted) setState('confirmed');
        } else {
          if (isMounted) setState('invalid');
        }
      } catch (err) {
        console.error('Confirmation link processing exception:', err);
        if (isMounted) setState('invalid');
      }
    };

    processConfirmationLink();

    return () => {
      isMounted = false;
    };
  }, []);

  // Resend confirmation email handler
  const handleResendConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resendCooldown > 0 || isResending) return;

    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          const waitTime = data.retryAfterSeconds || 60;
          setResendCooldown(waitTime);
          setErrorMessage(data.message || `Please wait ${waitTime} seconds before requesting another email.`);
          return;
        }
        throw new Error(data.message || 'Failed to resend confirmation email.');
      }

      setResendCooldown(60);
      setNoticeMessage(`If an unconfirmed account exists with ${trimmed}, a fresh verification link has been sent.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not resend confirmation email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors">
      {/* Dormiqa Wordmark Header */}
      <div className="mb-8 text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-neutral-900 dark:text-white">
          DORMIQA
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Student Housing & Caretaker Portal
        </p>
      </div>

      <div className="w-full max-w-[420px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* STATE 1: CHECKING */}
        {state === 'checking' && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
              Confirming your email address...
            </p>
          </div>
        )}

        {/* STATE 2: CONFIRMED */}
        {state === 'confirmed' && (
          <div className="text-center space-y-5 py-2">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Email confirmed
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Your account is active and ready to use.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onContinue}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Continue</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: INVALID */}
        {state === 'invalid' && (
          <div className="space-y-5 py-2">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                This link can't be used
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                This confirmation link may be expired, already used, or invalid. If your email was already confirmed, you can sign in directly.
              </p>
            </div>

            {noticeMessage && (
              <div aria-live="polite" className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-900 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{noticeMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div aria-live="polite" className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-900 dark:text-red-200 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleResendConfirmation} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="student@uniosun.edu.ng"
                    className="w-full pl-10 pr-3 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={resendCooldown > 0 || isResending || !emailInput.trim()}
                  className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border min-h-[44px] ${
                    resendCooldown > 0 || isResending || !emailInput.trim()
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent cursor-pointer'
                  }`}
                >
                  {isResending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>
                    {resendCooldown > 0 
                      ? `Resend in ${resendCooldown}s` 
                      : 'Resend confirmation email'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchToSignIn(emailInput)}
                  className="w-full py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer text-center min-h-[44px] flex items-center justify-center"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
