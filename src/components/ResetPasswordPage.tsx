import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  Check 
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { 
  detectAuthLinkError, 
  markRecoveryFlowIfPresent, 
  clearRecoveryFlow, 
  RECOVERY_FLOW_STORAGE_KEY 
} from '../utils/routing';

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

        // 1. Error links -> invalid state
        if (detectAuthLinkError() || errorCode || error) {
          if (isMounted) setState('invalid');
          try { sessionStorage.removeItem(RECOVERY_FLOW_STORAGE_KEY); } catch (_) {}
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'reset-password' }, '', '/auth/reset-password');
          }
          return;
        }

        const type = hashParams.get('type') || searchParams.get('type');
        const tokenHash = searchParams.get('token_hash');
        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
        const isResetPath = pathname === '/auth/reset-password' || pathname === '/reset-password';

        // If not a recovery link/path, check existing recovery session or state
        if (!isResetPath && type !== 'recovery' && !tokenHash && !code && !accessToken) {
          const { data: { session } } = await supabase.auth.getSession();
          let isFlowActive = false;
          try {
            isFlowActive = sessionStorage.getItem(RECOVERY_FLOW_STORAGE_KEY) === 'true';
          } catch (_) {}

          if (session || isFlowActive) {
            if (isMounted) setState('form');
            return;
          }
          if (isMounted) setState('invalid');
          return;
        }

        // Case A: token_hash with type=recovery
        if (tokenHash && (type === 'recovery' || isResetPath)) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
          if (verifyErr) {
            console.error('Password recovery token error:', verifyErr);
            if (isMounted) setState('invalid');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'reset-password' }, '', '/auth/reset-password');
            }
            return;
          }
          markRecoveryFlowIfPresent();
          if (isMounted) setState('form');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'reset-password' }, '', '/auth/reset-password');
          }
          return;
        }

        // Case B: PKCE code
        if (code && (isResetPath || type === 'recovery')) {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (codeErr) {
            console.error('Exchange code error:', codeErr);
            if (isMounted) setState('invalid');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'reset-password' }, '', '/auth/reset-password');
            }
            return;
          }
          markRecoveryFlowIfPresent();
          if (isMounted) setState('form');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'reset-password' }, '', '/auth/reset-password');
          }
          return;
        }

        // Case C: Hash tokens (access_token & refresh_token)
        if (accessToken && refreshToken && (type === 'recovery' || isResetPath)) {
          const { error: sessionErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionErr) {
            console.error('Session set error:', sessionErr);
            if (isMounted) setState('invalid');
            if (window.location.hash || window.location.search) {
              window.history.replaceState({ type: 'view', view: 'reset-password' }, '', '/auth/reset-password');
            }
            return;
          }
          markRecoveryFlowIfPresent();
          if (isMounted) setState('form');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({ type: 'view', view: 'reset-password' }, '', '/auth/reset-password');
          }
          return;
        }

        // Case D: Direct visit to /auth/reset-password
        const { data: { session } } = await supabase.auth.getSession();
        let isFlowActive = false;
        try {
          isFlowActive = sessionStorage.getItem(RECOVERY_FLOW_STORAGE_KEY) === 'true';
        } catch (_) {}

        if (session || isFlowActive) {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
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
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
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
      const userEmail = session?.user?.email || '';
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

      // Global sign-out of all sessions
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (_) {
        await supabase.auth.signOut();
      }

      clearRecoveryFlow();
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
              Verifying your reset link...
            </p>
          </div>
        )}

        {/* STATE 2: FORM */}
        {state === 'form' && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Create new password
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Enter your new secure password below.
              </p>
            </div>

            {errorMessage && (
              <div 
                aria-live="polite"
                className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-900 dark:text-red-200 font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-10 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Hint */}
              {newPassword.length > 0 && (
                <div className="space-y-1 px-0.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-neutral-500">Strength:</span>
                    <span className={strengthLabel === 'Strong' ? 'text-emerald-600' : strengthLabel === 'Fair' ? 'text-amber-600' : 'text-red-600'}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span className={`flex items-center gap-1 ${isMinLength ? 'text-emerald-600 font-bold' : ''}`}>
                      <Check className="w-3.5 h-3.5" /> 8+ chars
                    </span>
                    <span className={`flex items-center gap-1 ${hasNumberOrSymbol ? 'text-emerald-600 font-bold' : ''}`}>
                      <Check className="w-3.5 h-3.5" /> Number or symbol
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-10 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(p => !p)}
                    className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p aria-live="polite" className="text-[11px] text-red-500 font-medium mt-1">Passwords do not match.</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !isMinLength || newPassword !== confirmPassword}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STATE 3: SUCCESS */}
        {state === 'success' && (
          <div className="text-center space-y-5 py-2">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Password updated
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSwitchToSignIn(recoveredEmail)}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Sign in</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STATE 4: INVALID */}
        {state === 'invalid' && (
          <div className="text-center space-y-5 py-2">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                This link can't be used
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                This password reset link is invalid, expired, or has already been used.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={onRequestNewLinkModal}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Request a new link</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchToSignIn()}
                className="w-full py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer text-center min-h-[44px] flex items-center justify-center"
              >
                Back to sign in
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
