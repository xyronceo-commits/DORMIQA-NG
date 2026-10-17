import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Check,
  KeyRound
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { 
  detectAuthLinkError, 
  markRecoveryFlowIfPresent, 
  clearRecoveryFlow, 
  RECOVERY_FLOW_STORAGE_KEY 
} from '../utils/routing';
import { DormiqaLogo } from './DormiqaLogo';

interface ResetPasswordPageProps {
  onSwitchToSignIn: (email?: string) => void;
  onRequestNewLinkModal: () => void;
}

type ResetPageState = 'checking' | 'form' | 'success' | 'invalid';

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onSwitchToSignIn,
  onRequestNewLinkModal,
}) => {
  const [state, setState] = useState<ResetPageState>('checking');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveredEmail, setRecoveredEmail] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    let isMounted = true;

    const processRecoveryLink = async () => {
      try {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(search);

        const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
        const error = hashParams.get('error') || searchParams.get('error');

        const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
        const isResetPath = pathname === '/auth/reset-password' || pathname === '/reset-password';
        const canonicalPath = pathname.startsWith('/auth/reset-password') ? '/auth/reset-password' : '/reset-password';

        // 1. Error links -> invalid state
        if (detectAuthLinkError() || errorCode || error) {
          if (isMounted) setState('invalid');
          try { sessionStorage.removeItem(RECOVERY_FLOW_STORAGE_KEY); } catch (_) {}
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'reset-password' }, '', canonicalPath);
          }
          return;
        }

        const type = hashParams.get('type') || searchParams.get('type');
        const tokenHash = searchParams.get('token_hash');
        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // If not a recovery link/path, check existing recovery session or state
        if (!isResetPath && type !== 'recovery' && !tokenHash && !code && !accessToken) {
          const { data: { session } } = await supabase.auth.getSession();
          let isFlowActive = false;
          try {
            isFlowActive = sessionStorage.getItem(RECOVERY_FLOW_STORAGE_KEY) === 'true';
          } catch (_) {}

          if (session || isFlowActive) {
            if (session?.user?.email) {
              setRecoveredEmail(session.user.email);
            }
            if (isMounted) setState('form');
            return;
          }
          if (isMounted) setState('invalid');
          return;
        }

        // Case A: token_hash with type=recovery
        if (tokenHash && (type === 'recovery' || isResetPath)) {
          const { data, error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
          if (verifyErr) {
            console.error('Password recovery token error:', verifyErr);
            if (isMounted) setState('invalid');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'reset-password' }, '', canonicalPath);
            }
            return;
          }
          if (data?.user?.email) {
            setRecoveredEmail(data.user.email);
          }
          markRecoveryFlowIfPresent();
          if (isMounted) setState('form');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'reset-password' }, '', canonicalPath);
          }
          return;
        }

        // Case B: PKCE code
        if (code && (isResetPath || type === 'recovery')) {
          const { data, error: codeErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (codeErr) {
            console.error('Exchange code error:', codeErr);
            if (isMounted) setState('invalid');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'reset-password' }, '', canonicalPath);
            }
            return;
          }
          if (data?.user?.email) {
            setRecoveredEmail(data.user.email);
          }
          markRecoveryFlowIfPresent();
          if (isMounted) setState('form');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'reset-password' }, '', canonicalPath);
          }
          return;
        }

        // Case C: Hash tokens (access_token & refresh_token)
        if (accessToken && refreshToken && (type === 'recovery' || isResetPath)) {
          const { data, error: sessionErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionErr) {
            console.error('Session set error:', sessionErr);
            if (isMounted) setState('invalid');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'reset-password' }, '', canonicalPath);
            }
            return;
          }
          if (data?.user?.email) {
            setRecoveredEmail(data.user.email);
          }
          markRecoveryFlowIfPresent();
          if (isMounted) setState('form');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'reset-password' }, '', canonicalPath);
          }
          return;
        }

        // Case D: Direct visit to reset-password
        const { data: { session } } = await supabase.auth.getSession();
        let isFlowActive = false;
        try {
          isFlowActive = sessionStorage.getItem(RECOVERY_FLOW_STORAGE_KEY) === 'true';
        } catch (_) {}

        if (session || isFlowActive) {
          if (session?.user?.email) {
            setRecoveredEmail(session.user.email);
          }
          if (isMounted) setState('form');
        } else {
          if (isMounted) setState('invalid');
        }
      } catch (err) {
        console.error('Recovery link processing exception:', err);
        if (isMounted) setState('invalid');
      }
    };

    processRecoveryLink();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        if (session?.user?.email) {
          setRecoveredEmail(session.user.email);
        }
        markRecoveryFlowIfPresent();
        setState('form');
        setErrorMessage(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Automatic countdown timer when state === 'success' to redirect to login
  useEffect(() => {
    if (state !== 'success') return;

    if (countdown <= 0) {
      onSwitchToSignIn(recoveredEmail);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, countdown, onSwitchToSignIn, recoveredEmail]);

  // Password Strength Calculation
  const isMinLength = newPassword.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  let strengthLabel = 'Weak';
  if (isMinLength && hasNumberOrSymbol) {
    strengthLabel = 'Strong';
  } else if (isMinLength || hasNumberOrSymbol) {
    strengthLabel = 'Fair';
  }

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Capture user email for autofilling sign-in screen
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const userEmail = session?.user?.email || recoveredEmail;
      if (userEmail) {
        setRecoveredEmail(userEmail);
      }

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

      // Global sign-out of all sessions to enforce re-authentication
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (_) {
        await supabase.auth.signOut();
      }

      clearRecoveryFlow();
      setCountdown(3);
      setState('success');
    } catch (err: any) {
      console.error('Password update failure:', err);
      if (err?.message?.toLowerCase().includes('expired') || err?.message?.toLowerCase().includes('invalid')) {
        setState('invalid');
      } else {
        setErrorMessage(err?.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between font-sans">
      {/* Top Header with Brand Logo */}
      <header className="w-full max-w-xl mx-auto px-5 py-3.5 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <DormiqaLogo className="w-6 h-6 shrink-0" />
          <span className="text-base font-black tracking-tight text-neutral-900">DORMIQA</span>
        </div>

        <button
          type="button"
          onClick={() => onSwitchToSignIn(recoveredEmail)}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1 px-2.5 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          Sign in
        </button>
      </header>

      {/* Main Content Container */}
      <main className="w-full max-w-md mx-auto px-5 pt-6 pb-8 flex flex-col justify-center flex-1">
        
        {/* STATE 1: CHECKING */}
        {state === 'checking' && (
          <div className="text-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs font-semibold text-neutral-600">
              Validating your password recovery link...
            </p>
          </div>
        )}

        {/* STATE 2: FORM */}
        {state === 'form' && (
          <div className="space-y-5">
            <div className="text-center space-y-1 mb-2">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
                Create new password
              </h1>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mx-auto">
                Enter your new password below. Once set, you will be directed to the login page to sign in.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  New Password <span className="text-emerald-700">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-1 px-0.5">
                  <div className="flex justify-between items-center text-[11px] font-semibold">
                    <span className="text-neutral-500">Strength:</span>
                    <span className={strengthLabel === 'Strong' ? 'text-emerald-700' : strengthLabel === 'Fair' ? 'text-amber-700' : 'text-red-600'}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                    <span className={`flex items-center gap-1 ${isMinLength ? 'text-emerald-700 font-medium' : ''}`}>
                      <Check className="w-3.5 h-3.5" /> 8+ characters
                    </span>
                    <span className={`flex items-center gap-1 ${hasNumberOrSymbol ? 'text-emerald-700 font-medium' : ''}`}>
                      <Check className="w-3.5 h-3.5" /> Number or symbol
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Confirm New Password <span className="text-emerald-700">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !isMinLength || !passwordsMatch}
                className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting password...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STATE 3: SUCCESS (Confirm password reset and redirect to login) */}
        {state === 'success' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
                Password Successfully Reset
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mx-auto">
                Your password has been successfully reset. You will now be redirected to the sign-in page to enter your credentials.
              </p>
            </div>

            <div className="py-2">
              <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-700 rounded-md text-xs font-semibold">
                Redirecting to login in {countdown}s...
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSwitchToSignIn(recoveredEmail)}
              className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none"
            >
              <span>Go to Login Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STATE 4: INVALID OR EXPIRED LINK */}
        {state === 'invalid' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
                Reset Link Expired or Invalid
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mx-auto">
                This password reset link is invalid, expired, or has already been used. Please request a fresh link.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={onRequestNewLinkModal}
                className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Request New Reset Link</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchToSignIn(recoveredEmail)}
                className="w-full py-2.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-xs transition-colors cursor-pointer text-center"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

      </main>

      <footer className="w-full max-w-xl mx-auto px-5 py-4 text-center border-t border-neutral-100 text-[11px] text-neutral-400">
        DORMIQA Account Security & Recovery
      </footer>
    </div>
  );
};
