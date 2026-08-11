import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2, 
  ArrowLeft 
} from 'lucide-react';
import { sendVerificationCode, verifyCode, checkVerificationCodeStatus } from '../services/api';

interface EmailVerificationCardProps {
  email: string;
  onVerified: () => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}

export const EmailVerificationCard: React.FC<EmailVerificationCardProps> = ({
  email,
  onVerified,
  onBack,
  title = "Verify your email",
  subtitle
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 minutes default
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isSendingCode, setIsSendingCode] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [statusState, setStatusState] = useState<'idle' | 'success' | 'expired' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send initial code on mount & Auto-Focus first OTP input box
  useEffect(() => {
    let isMounted = true;
    const initializeVerification = async () => {
      setIsSendingCode(true);
      setErrorMessage(null);
      try {
        // Check if there is already an active code timer on server
        const status = await checkVerificationCodeStatus(email);
        if (isMounted && status.active && status.remainingSeconds && status.remainingSeconds > 0) {
          setSecondsRemaining(status.remainingSeconds);
          setIsTimerRunning(true);
          setIsSendingCode(false);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
          return;
        }

        // Dispatch initial code
        const res = await sendVerificationCode(email);
        if (isMounted) {
          setSecondsRemaining(res.expiresInSeconds || 600);
          setIsTimerRunning(true);
          setResendCooldown(60); // 60 seconds cooldown for resends
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("Failed to dispatch initial verification code:", err);
          setErrorMessage(err.message || "Could not send verification code. Click 'Resend code' to try again.");
        }
      } finally {
        if (isMounted) {
          setIsSendingCode(false);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      }
    };

    initializeVerification();

    return () => {
      isMounted = false;
    };
  }, [email]);

  // Live countdown timer (10:00 -> 00:00)
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setStatusState('expired');
            setErrorMessage('This code has expired. Request a new code.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (secondsRemaining === 0) {
      setIsTimerRunning(false);
      setStatusState('expired');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, secondsRemaining]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: any = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  // Format MM:SS
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Digit Change
  const handleDigitChange = (index: number, value: string) => {
    if (statusState === 'expired') return;

    // Filter to last entered digit
    const cleanValue = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);
    setErrorMessage(null);
    if (statusState === 'error') setStatusState('idle');

    // Auto-advance focus to next input
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace Key
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle Paste 6 digits
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (statusState === 'expired') return;

    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);
    setErrorMessage(null);
    if (statusState === 'error') setStatusState('idle');

    // Focus last filled box or next empty box
    const nextEmptyIndex = newDigits.findIndex(d => !d);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  // Resend Code Action
  const handleResend = async () => {
    if (resendCooldown > 0 || isSendingCode) return;

    setIsSendingCode(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusState('idle');
    setDigits(['', '', '', '', '', '']);

    try {
      const res = await sendVerificationCode(email);
      setSecondsRemaining(res.expiresInSeconds || 600);
      setIsTimerRunning(true);
      setResendCooldown(60); // 60s cooldown
      setSuccessMessage('✓ A new 6-digit code has been dispatched to your email.');
      setTimeout(() => setSuccessMessage(null), 4000);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const errResp = err.response;
      if (errResp?.error === 'too_frequent') {
        setErrorMessage(errResp.message || 'Please wait before requesting another code.');
      } else {
        setErrorMessage(err.message || 'Failed to resend code. Please try again.');
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify Code Submission
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = digits.join('');
    if (fullCode.length < 6 || secondsRemaining === 0 || isVerifying) return;

    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await verifyCode(email, fullCode);
      setStatusState('success');
      setSuccessMessage('✓ Email address verified successfully!');
      
      // Brief pause for success state, then complete
      setTimeout(() => {
        onVerified();
      }, 1000);
    } catch (err: any) {
      const resp = err.response;
      setStatusState('error');
      if (resp?.error === 'expired') {
        setStatusState('expired');
        setSecondsRemaining(0);
        setIsTimerRunning(false);
        setErrorMessage('This code has expired. Request a new code.');
      } else if (resp?.error === 'too_many_attempts') {
        setStatusState('expired');
        setSecondsRemaining(0);
        setIsTimerRunning(false);
        setErrorMessage('Too many incorrect attempts. This code was invalidated. Request a new code.');
      } else {
        setErrorMessage(err.message || 'Incorrect 6-digit code. Please check and try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const isCodeComplete = digits.every(d => d.length === 1);
  const isExpired = secondsRemaining === 0;

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xl transition-all">
      
      {/* Top Header & Back Button */}
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

      {/* Main Icon & Title */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center mx-auto shadow-xs">
          <Mail className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {subtitle || (
              <>
                We've sent a 6-digit verification code to <strong className="text-neutral-900 dark:text-white font-bold">{email}</strong>.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Verification Form */}
      <form onSubmit={handleVerify} className="mt-6 space-y-6">
        
        {/* 6 Digit Code Inputs */}
        <div className="flex items-center justify-center gap-2 sm:gap-2.5">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={isExpired || isSendingCode || isVerifying || statusState === 'success'}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-extrabold rounded-2xl border-2 transition-all outline-hidden
                ${isExpired 
                  ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed' 
                  : statusState === 'error'
                    ? 'border-red-500 dark:border-red-500/80 bg-red-50/30 dark:bg-red-950/20 text-red-900 dark:text-red-300 focus:ring-2 focus:ring-red-500/20'
                    : statusState === 'success'
                      ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                }
              `}
            />
          ))}
        </div>

        {/* Live Countdown Timer Banner */}
        <div className="flex items-center justify-between text-xs px-2 py-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Clock className={`w-4 h-4 ${isExpired ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span className={isExpired ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-300'}>
              {isExpired ? 'Code expired' : `Code expires in ${formatTime(secondsRemaining)}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isSendingCode}
            className={`font-semibold transition-colors text-xs cursor-pointer flex items-center gap-1
              ${resendCooldown > 0 || isSendingCode 
                ? 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed' 
                : 'text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline'
              }
            `}
          >
            {isSendingCode && <Loader2 className="w-3 h-3 animate-spin" />}
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive it? Resend code"}
          </button>
        </div>

        {/* Dynamic Status / Feedback Messages */}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl flex items-start gap-2 text-xs text-red-800 dark:text-red-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">{errorMessage}</p>
              {isExpired && (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-[11px] font-extrabold text-red-700 dark:text-red-400 underline hover:text-red-900 cursor-pointer"
                >
                  Request a new verification code →
                </button>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action Button: [ Verify ] */}
        <button
          type="submit"
          disabled={!isCodeComplete || isExpired || isVerifying || statusState === 'success'}
          className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-sm
            ${!isCodeComplete || isExpired || isVerifying || statusState === 'success'
              ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-emerald-600/20 cursor-pointer'
            }
          `}
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying Code...
            </>
          ) : statusState === 'success' ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Verified!
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Verify
            </>
          )}
        </button>

      </form>

      {/* Security Disclaimer Footnote */}
      <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800/60 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
        Codes are valid for 10 minutes and never stored plaintext on client devices.
      </div>

    </div>
  );
};
