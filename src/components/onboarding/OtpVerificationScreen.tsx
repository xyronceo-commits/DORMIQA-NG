import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
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

    if (value.length > 1) {
      const sanitized = value.replace(/\D/g, '').slice(0, 6);
      if (sanitized) {
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = sanitized[i] || '';
        }
        setDigits(newDigits);
        const lastIdx = Math.min(sanitized.length - 1, 5);
        inputRefs.current[lastIdx]?.focus();

        if (sanitized.length === 6) {
          onVerify(sanitized);
        }
        return;
      }
    }

    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (char && index === 5) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 6) {
        onVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();

    if (pasted.length === 6) {
      onVerify(pasted);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setLocalError('Please enter all 6 digits of your verification code.');
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
      {/* Top Header */}
      <header className="w-full max-w-xl mx-auto px-6 py-4 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold tracking-tight text-neutral-900">DORMIQA</span>
          <span className="text-neutral-300 font-light text-xs">/</span>
          <span className="text-xs text-neutral-500 font-medium">Verify Email</span>
        </div>

        <button
          type="button"
          onClick={onChangeEmail}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1.5 px-3 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          Change email
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto px-6 py-8 flex flex-col justify-center flex-1">
        <div className="space-y-1.5 mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Enter 6-digit code
          </h1>
          <p className="text-xs text-neutral-600 leading-relaxed">
            We sent a verification code to <span className="font-semibold text-neutral-900">{email}</span>. Check your inbox and enter the code below.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-snug font-medium">{error}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-snug font-medium">A fresh 6-digit verification code has been sent.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading}
                className="w-11 h-13 text-center text-xl font-bold text-neutral-900 bg-white border border-neutral-300 rounded-md focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-all disabled:opacity-50"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || digits.join('').length !== 6}
            className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify & Continue</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-neutral-600">
          <span>Didn't receive the email code? </span>
          {resendCooldown > 0 ? (
            <span className="text-neutral-400 font-medium">
              Resend in {resendCooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendClick}
              disabled={isResending}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer ml-1"
            >
              {isResending ? 'Sending...' : 'Resend code'}
            </button>
          )}
        </div>
      </main>

      <footer className="w-full max-w-xl mx-auto px-6 py-4 text-center border-t border-neutral-100 text-xs text-neutral-400">
        DORMIQA Nigeria • Verified Public Tertiary Institutions
      </footer>
    </div>
  );
};
