import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Mail, ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { DormiqaLogo } from '../DormiqaLogo';

interface OtpVerificationScreenProps {
  email: string;
  onVerify: (otpCode: string) => Promise<void>;
  onResend: () => Promise<boolean>;
  onChangeEmail: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  email,
  onVerify,
  onResend,
  onChangeEmail,
  isLoading = false,
  errorMessage: externalErrorMessage,
}) => {
  // 8-digit OTP code state
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    setLocalError(null);
    setResendSuccess(false);

    // Handle full pasted string or multiple characters
    if (value.length > 1) {
      const sanitized = value.replace(/\D/g, '').slice(0, 8);
      if (sanitized) {
        const newDigits = [...digits];
        for (let i = 0; i < 8; i++) {
          newDigits[i] = sanitized[i] || '';
        }
        setDigits(newDigits);
        const lastIdx = Math.min(sanitized.length - 1, 7);
        inputRefs.current[lastIdx]?.focus();

        if (sanitized.length === 8) {
          onVerify(sanitized);
        }
        return;
      }
    }

    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    if (char && index === 7) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 8) {
        onVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 8; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    const targetIdx = Math.min(pasted.length, 7);
    inputRefs.current[targetIdx]?.focus();

    if (pasted.length === 8 || pasted.length === 6) {
      onVerify(pasted);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = digits.join('').trim();
    if (fullCode.length < 6) {
      setLocalError('Please enter your 8-digit verification code.');
      return;
    }
    onVerify(fullCode);
  };

  const handleResendClick = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setLocalError(null);
    setResendSuccess(false);
    try {
      const ok = await onResend();
      if (ok) {
        setResendSuccess(true);
        setResendCooldown(60);
      } else {
        setLocalError('Failed to resend code. Please wait a moment and try again.');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Error resending code.');
    } finally {
      setIsResending(false);
    }
  };

  const error = localError || externalErrorMessage;

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between font-sans">
      {/* Top Header with Brand Logo (No URL path breadcrumbs) */}
      <header className="w-full max-w-xl mx-auto px-5 py-3.5 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <DormiqaLogo className="w-6 h-6 shrink-0" />
          <span className="text-base font-black tracking-tight text-neutral-900">DORMIQA</span>
        </div>

        <button
          type="button"
          onClick={onChangeEmail}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1 px-2.5 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change email</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto px-5 pt-4 pb-6 flex flex-col justify-center flex-1">
        <div className="space-y-1.5 mb-5 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
            <Mail className="w-5 h-5" />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            Enter 8-digit verification code
          </h1>

          <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mx-auto">
            We sent an 8-digit security code to{' '}
            <span className="font-semibold text-neutral-900 break-all">{email}</span>.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-snug font-medium">{error}</span>
          </div>
        )}

        {/* Resend Success Alert */}
        {resendSuccess && (
          <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-snug font-medium">A fresh 8-digit code has been sent to your email.</span>
          </div>
        )}

        {/* Form with 8 Digit Boxes */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2 justify-center">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                aria-label={`Digit ${idx + 1}`}
                className="w-full h-11 sm:h-12 text-center text-base sm:text-lg font-bold text-neutral-900 bg-white border border-neutral-300 rounded-md focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors disabled:opacity-50"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || digits.join('').length < 6}
            className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying code...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Continue</span>
              </>
            )}
          </button>
        </form>

        {/* Resend Code Section */}
        <div className="mt-5 text-center space-y-2">
          <p className="text-xs text-neutral-500">
            Didn't receive the email code? Check your spam/junk folder.
          </p>

          <button
            type="button"
            onClick={handleResendClick}
            disabled={resendCooldown > 0 || isResending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:text-neutral-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            <span>
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : 'Resend verification code'}
            </span>
          </button>
        </div>
      </main>

      <footer className="w-full max-w-xl mx-auto px-5 py-4 text-center border-t border-neutral-100 text-[11px] text-neutral-400">
        DORMIQA Secure Account Verification
      </footer>
    </div>
  );
};
