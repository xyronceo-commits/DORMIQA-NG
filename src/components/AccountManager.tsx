import React, { useState } from 'react';
import { 
  User as UserIcon, 
  LogOut, 
  Trash2, 
  ShieldCheck, 
  Building2,
  Phone,
  Mail,
  GraduationCap,
  AlertTriangle,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User, UserRole } from '../types';
import { resendVerificationEmail, checkEmailVerified, saveUserToFirestore, auth } from '../services/firebase';
import { EmailVerificationCard } from './EmailVerificationCard';
import { DeleteAccountModal } from './DeleteAccountModal';

interface AccountManagerProps {
  accounts: User[];
  activeAccountId: string;
  onSwitchAccount?: (account: User) => void;
  onAddAccount?: (newAccount: Omit<User, 'id' | 'createdAt'>) => void;
  onSignOut: () => void;
  onDeleteAccount: (accountId: string) => void;
  currentRole: UserRole;
}

export const AccountManager: React.FC<AccountManagerProps> = ({
  accounts,
  activeAccountId,
  onSignOut,
  onDeleteAccount,
  currentRole
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isVerifyingModalOpen, setIsVerifyingModalOpen] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

  const confirmDeleteAccount = () => {
    if (activeAccount) {
      onDeleteAccount(activeAccount.id);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Active Single User Profile Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={activeAccount?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                alt=""
                className="w-16 h-16 rounded-full object-cover border-2 border-black dark:border-white shadow-xs"
              />
              {(activeAccount?.isVerifiedAgent || activeAccount?.isAvatarLocked || activeAccount?.role === 'agent') && (
                <div className="absolute -bottom-1 -right-1 bg-black text-emerald-400 p-1.5 rounded-full border border-emerald-500 shadow-xs" title="Verified Identity Photo (Locked)">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-black dark:text-white">{activeAccount?.name || 'Account Holder'}</h3>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase ${
                  activeAccount?.role === 'student'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white'
                }`}>
                  {activeAccount?.role || currentRole}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium flex items-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                {activeAccount?.email}
              </p>
              {activeAccount?.phone && (
                <p className="text-xs text-neutral-500 font-medium flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  {activeAccount.phone}
                </p>
              )}
            </div>
          </div>

          {/* Sign Out & Delete Account Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onSignOut}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white font-extrabold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 border border-neutral-200 dark:border-neutral-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
              Sign Out
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-black hover:bg-neutral-900 text-white font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-black dark:bg-white dark:text-black dark:border-white"
            >
              <Trash2 className="w-4 h-4 text-emerald-400" />
              Delete Account
            </button>
          </div>
        </div>

        {/* Locked Profile Picture Non-Editable Notice */}
        {(activeAccount?.isVerifiedAgent || activeAccount?.isAvatarLocked || activeAccount?.role === 'agent') && (
          <div className="p-4 bg-black text-white rounded-2xl flex items-center gap-3 text-xs border border-neutral-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xs">
                  Verified Identity Profile Picture
                </span>
                <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                  Non-Editable
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
                Your profile picture was set during Agent Identity Verification (unblurred, clear face photo without mask). To protect students from scam listings and impersonation, verified profile photos cannot be edited.
              </p>
            </div>
          </div>
        )}

        {/* Email Verification Status Notice */}
        <div className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            {activeAccount?.isEmailVerified ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            )}
            <div>
              <p className="font-extrabold text-black dark:text-white">
                {activeAccount?.isEmailVerified ? 'Email Verified' : 'Email Verification Pending'}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {activeAccount?.isEmailVerified 
                  ? 'Your email address is fully verified and secure.' 
                  : 'Click the verification link sent to your email address.'}
              </p>
            </div>
          </div>

          {!activeAccount?.isEmailVerified && (
            <button
              onClick={() => setIsVerifyingModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Verify Email Link
            </button>
          )}
        </div>

        {/* Email Link Verification Modal */}
        {isVerifyingModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <EmailVerificationCard
              email={activeAccount?.email || auth.currentUser?.email || ''}
              onBack={() => setIsVerifyingModalOpen(false)}
              onVerified={() => {
                if (activeAccount) {
                  activeAccount.isEmailVerified = true;
                  saveUserToFirestore(activeAccount);
                }
                setIsVerifyingModalOpen(false);
              }}
            />
          </div>
        )}

        {resendStatus && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center">
            {resendStatus}
          </div>
        )}

        {/* Account Details & Security */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-neutral-700 block mb-1">
              {activeAccount?.role === 'student' ? 'University / Institution' : activeAccount?.role === 'agent' ? 'Agency Name' : 'Department'}
            </label>
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold text-neutral-800 flex items-center gap-2">
              {activeAccount?.role === 'student' ? <GraduationCap className="w-4 h-4 text-emerald-600" /> : <Building2 className="w-4 h-4 text-neutral-400" />}
              <span>{activeAccount?.universityName || activeAccount?.agencyName || 'Not specified'}</span>
            </div>
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1">Account Policy & Security</label>
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold text-neutral-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Single Verified Account Policy (Strict)</span>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 text-xs">
          <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold">Single Account Protection</h5>
            <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
              Your profile is bound to one authenticated session. To log into a different account, simply click <strong>Sign Out</strong> above to return to the authentication screen.
            </p>
          </div>
        </div>

        {/* Delete Account Option */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
          <div className="text-xs">
            <h5 className="font-bold text-neutral-800">Delete My Account</h5>
            <p className="text-[11px] text-neutral-500">Permanently remove your account profile from Dormiqa.</p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 bg-black hover:bg-neutral-900 text-white font-bold text-xs rounded-xl border border-black dark:bg-white dark:text-black dark:border-white transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-emerald-400" />
            Delete Account
          </button>
        </div>
      </div>

      {/* CONFIRM DELETE ACCOUNT MODAL */}
      <DeleteAccountModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirmDelete={confirmDeleteAccount}
        userEmail={activeAccount?.email}
        userName={activeAccount?.name}
      />

    </div>
  );
};
