import React, { useState } from 'react';
import { Shield, X, ArrowRight, AlertCircle, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { sendAdminMagicLink } from '../services/firebase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your administrator email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validates authorization & sends Firebase magic link
      await sendAdminMagicLink(cleanEmail);
      setIsSent(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.warn("Magic link send error:", err);
      setError(err.message || "This email doesn't have administrator access.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await sendAdminMagicLink(email);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to resend sign-in link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                Admin Access
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Passwordless Administrator Sign-In
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!isSent ? (
            <form onSubmit={handleSendLink} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="buildsafe247@gmail.com"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying authorization...</span>
                  </>
                ) : (
                  <>
                    <span>Send sign-in link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  Check your email
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  We sent a secure sign-in link to{' '}
                  <span className="font-bold text-neutral-900 dark:text-neutral-200">{email}</span>.
                  Open the email to continue.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleResend}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Resend link</span>}
                </button>
                <button
                  onClick={() => {
                    setIsSent(false);
                    setError(null);
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  Use another email
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <span className="text-[11px] text-neutral-500 font-medium block">
            🔒 Secure Passwordless Magic Link Authentication
          </span>
        </div>
      </div>
    </div>
  );
};
