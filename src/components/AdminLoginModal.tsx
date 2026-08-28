import React, { useState } from 'react';
import { Shield, X, ArrowRight, AlertCircle, Loader2, Mail } from 'lucide-react';
import { adminLogin } from '../services/api';
import { AdminRole } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string, role: AdminRole) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your authorized administrator email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify Administrator Authorization directly by email
      const response = await adminLogin(cleanEmail);
      if (response.success && response.authorized) {
        setError(null);
        onSuccess(response.email || cleanEmail, response.role || 'ADMIN');
        onClose();
      } else {
        setError(response.message || "You don't have permission to access the Admin Portal.");
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your network connection.');
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
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-slate-800 dark:text-neutral-200">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                Admin Authentication
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Dormiqa Email Verification
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 block">
                Administrator Email
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
                  placeholder="admin@dormiqa.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-neutral-400 font-medium pt-1">
                Enter your authorized administrator email address to verify access.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Administrator Email...</span>
                </>
              ) : (
                <>
                  <span>Verify & Open Admin Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <span className="text-[11px] text-neutral-500 font-medium block">
            🔒 Protected Portal • Authorized Administrator Accounts Only
          </span>
        </div>
      </div>
    </div>
  );
};
