import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { sendEmailVerification, applyActionCode } from 'firebase/auth';
import { auth, getActionCodeSettings } from '../services/firebase';
import { supabase } from '../services/supabase';
import { mapAuthError } from '../utils/authErrors';

interface EmailVerificationCardProps {
  email: string;
  password?: string;
  onVerified: () => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}

export const EmailVerificationCard: React.FC<EmailVerificationCardProps> = ({
  email,
  password,
  onVerified,
  onBack,
  title = "Verify your email",
  subtitle
}) => {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [noticeMessage, setNoticeMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' | 'warning' } | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  const displayEmail = email || auth.currentUser?.email || 'your registered email';

  // Listen to Supabase Auth state changes across tabs/windows
  useEffect(() => {
    let isMounted = true;

    // 1. Check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted && session?.user?.email_confirmed_at) {
        setIsVerified(true);
        setNoticeMessage({
          text: "Email verified! Redirecting to your dashboard...",
          type: 'success'
        });
        setTimeout(() => {
          if (isMounted) onVerified();
        }, 800);
      }
    });

    // 2. Subscribe to real-time auth events (shared across tabs in the same browser)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted || isVerified) return;
      if (session?.user?.email_confirmed_at) {
        console.log('[VERIFY SCREEN] onAuthStateChange event received with confirmed email:', event);
        setIsVerified(true);
        setNoticeMessage({
          text: "Email verified! Redirecting to your dashboard...",
          type: 'success'
        });
        setTimeout(() => {
          if (isMounted) onVerified();
        }, 800);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [onVerified, isVerified]);

  // Complete Supabase confirmation callbacks in URL params if opened directly
  useEffect(() => {
    let isMounted = true;

    const handleIncomingActionCode = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const tokenHash = urlParams.get('token_hash');
        const type = urlParams.get('type') || hashParams.get('type') || (mode === 'verifyEmail' ? 'signup' : null);
        const code = urlParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if ((tokenHash && type) || code || (accessToken && refreshToken)) {
          setIsChecking(true);
          try {
            if (tokenHash && type) {
              const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
              if (otpError) {
                try {
                  await applyActionCode(auth, tokenHash, type);
                } catch (_) {
                  throw otpError;
                }
              }
            } else if (code) {
              const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
              if (error) throw error;
            } else if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              if (error) throw error;
            }
            if (auth.currentUser) {
              await auth.currentUser.reload();
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            if (isMounted) {
              setIsVerified(true);
              setNoticeMessage({
                text: "Your email address has been successfully verified!",
                type: 'success'
              });
              setTimeout(() => {
                if (isMounted) onVerified();
              }, 1000);
            }
          } catch (codeErr: any) {
            console.error("Supabase email verification error:", codeErr);
            if (isMounted) {
              setNoticeMessage({
                text: "This verification link is invalid or has expired. Please click 'Resend verification email' to receive a fresh link.",
                type: 'error'
              });
            }
          } finally {
            if (isMounted) setIsChecking(false);
          }
        }
      } catch (e) {
        console.warn("URL action code check failed:", e);
      }
    };

    handleIncomingActionCode().catch(err => console.warn("Action code check warning:", err));

    return () => {
      isMounted = false;
    };
  }, [onVerified]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Manual Check Button Handler: "I've verified my email"
  const handleIHaveVerified = async () => {
    if (isChecking || isVerified) return;

    setIsChecking(true);
    setNoticeMessage(null);

    try {
      // 1. Try getSession first
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        setNoticeMessage({
          text: "✓ Email verified! Loading your Dormiqa account...",
          type: 'success'
        });
        setTimeout(() => onVerified(), 800);
        return;
      }

      // 2. If user typed password, attempt sign in to establish/refresh session
      if (password && displayEmail) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: displayEmail.trim().toLowerCase(),
          password
        });
        if (!error && data?.user?.email_confirmed_at) {
          setIsVerified(true);
          setNoticeMessage({
            text: "✓ Email verified! Loading your Dormiqa account...",
            type: 'success'
          });
          setTimeout(() => onVerified(), 800);
          return;
        } else if (error) {
          const errMsg = error.message.toLowerCase();
          if (errMsg.includes('not confirmed')) {
            setNoticeMessage({
              text: "Your email hasn't been confirmed yet. Please check your inbox and click the verification link.",
              type: 'warning'
            });
            return;
          }
        }
      }

      // 3. Check getUser if session exists
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email_confirmed_at) {
        setIsVerified(true);
        setNoticeMessage({
          text: "✓ Email verified! Loading your Dormiqa account...",
          type: 'success'
        });
        setTimeout(() => onVerified(), 800);
        return;
      }

      setNoticeMessage({
        text: "Your email hasn't been verified yet. Please click the verification link sent to your inbox.",
        type: 'warning'
      });
    } catch (err: any) {
      console.error("Error checking verification:", err);
      setNoticeMessage({
        text: err?.message || "Failed to check verification status. Please try again.",
        type: 'error'
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Resend Verification Link Handler
  const handleResendLink = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setNoticeMessage(null);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const emailRedirectTo = `${origin}/auth/confirmed`;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: displayEmail.trim().toLowerCase(),
        options: {
          emailRedirectTo
        }
      });

      if (error) {
        throw error;
      }

      setResendCooldown(60); // 60s cooldown
      setNoticeMessage({
        text: `A fresh verification link has been sent to ${displayEmail}. Please check your inbox and spam folder.`,
        type: 'info'
      });
    } catch (err: any) {
      console.error("Resend verification email error:", err);
      setNoticeMessage({
        text: mapAuthError(err),
        type: 'error'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xl transition-all">
      
      {/* Top Navigation Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      )}

      {/* Main Header Icon & Title */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center mx-auto shadow-xs">
          <Mail className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed px-2">
            {subtitle || (
              <>
                We've sent a verification link to <strong className="text-neutral-900 dark:text-white font-extrabold">{displayEmail}</strong>. Please check your inbox and click the link to verify your account.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Dynamic Notifications & Buttons */}
      <div className="mt-6 space-y-4">

        {noticeMessage && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 ${
            noticeMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 font-bold'
              : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-black dark:text-white font-semibold'
          }`}>
            {noticeMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{noticeMessage.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          
          {/* Primary Button: [ I've verified my email ] */}
          <button
            type="button"
            onClick={handleIHaveVerified}
            disabled={isChecking || isVerified}
            className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
              isVerified
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-emerald-600/20 cursor-pointer'
            }`}
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking verification status...
              </>
            ) : isVerified ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Email Verified!
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                I've verified my email
              </>
            )}
          </button>

          {/* Secondary Button: [ Resend verification email ] */}
          <button
            type="button"
            onClick={handleResendLink}
            disabled={resendCooldown > 0 || isResending || isVerified}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 border ${
              resendCooldown > 0 || isResending || isVerified
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 cursor-not-allowed'
                : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 cursor-pointer'
            }`}
          >
            {isResending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                Sending email...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
                Resend verification email in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Resend verification email
              </>
            )}
          </button>

        </div>

      </div>

      {/* Spam Folder & Deliverability Guidance Box */}
      <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-black dark:text-white font-bold">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Didn't receive the email in your primary inbox?</span>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
            Automated verification emails are sometimes routed to alternate folders by email providers.
          </p>
          <ul className="space-y-1.5 pt-1 text-[11px] text-neutral-700 dark:text-neutral-300 font-medium">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span><strong>Check Spam / Junk Folder:</strong> Search for the Dormiqa verification email.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span><strong>Check Gmail Promotions Tab:</strong> Look under "Promotions", "Social", or "Updates" categories.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span><strong>Mark as "Not Spam":</strong> If found in Spam, click "Report not spam" so links work properly.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span><strong>Search All Mail:</strong> Enter <code>noreply</code> or <code>verify</code> in your email search bar.</span>
            </li>
          </ul>
        </div>

        <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
          Supabase Auth • Email verification
        </p>
      </div>

    </div>
  );
};
