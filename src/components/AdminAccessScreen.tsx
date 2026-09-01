import React from 'react';
import { Shield, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';

interface AdminAccessScreenProps {
  status: 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ADMIN_CHECKING' | 'AUTHORIZED' | 'UNAUTHORIZED' | 'SESSION_EXPIRED' | 'SIGNED_OUT';
  currentUserEmail?: string;
  errorMessage?: string | null;
  onContinueWithGoogle: () => void;
  onBackToDormiqa: () => void;
}

export const AdminAccessScreen: React.FC<AdminAccessScreenProps> = ({
  status,
  currentUserEmail,
  errorMessage,
  onContinueWithGoogle,
  onBackToDormiqa,
}) => {
  if (status === 'AUTH_LOADING' || status === 'ADMIN_CHECKING') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-black dark:text-white">
              Dormiqa Admin
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Verifying administrator credentials...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'UNAUTHORIZED') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-emerald-400 dark:text-emerald-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-black dark:text-white tracking-tight">
              Access denied
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
              This Google account is not authorized to access the Dormiqa Admin Portal.
            </p>
            {currentUserEmail && (
              <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 truncate pt-1">
                {currentUserEmail}
              </p>
            )}
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={onBackToDormiqa}
              className="w-full py-3.5 px-4 rounded-2xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dormiqa</span>
            </button>
            <button
              onClick={onContinueWithGoogle}
              className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              Sign in with another Google account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = status === 'SESSION_EXPIRED';

  // Default: UNAUTHENTICATED
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-6 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/50 dark:border-emerald-800/50">
          <Shield className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-black dark:text-white tracking-tight">
            Dormiqa Admin
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Authorized administrators only.
          </p>
        </div>

        {isExpired && (
          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white text-xs font-semibold space-y-1">
            <p className="font-extrabold text-black dark:text-white">Session Expired</p>
            <p className="text-[11px] leading-normal opacity-90">
              Your 12-hour administrator session has expired. Please sign in with Google to continue.
            </p>
          </div>
        )}

        {errorMessage && !isExpired && (
          <div className="p-3.5 rounded-2xl bg-black text-white dark:bg-white dark:text-black border border-neutral-800 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={onContinueWithGoogle}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-800 dark:text-white font-extrabold text-xs border border-neutral-300 dark:border-neutral-700 shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer hover:shadow"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            🔒 Secure Google Authentication for Authorized Administrators
          </p>
        </div>
      </div>
    </div>
  );
};
