import React, { useEffect } from 'react';
import { Clock, ShieldCheck, LogOut, HelpCircle, AlertCircle } from 'lucide-react';
import { User, BusinessVerificationDetails } from '../types';
import { auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface VerificationStatusPageProps {
  agentData?: Partial<User> | null;
  onSignOut?: () => void;
  onApproved?: () => void;
}

export const VerificationStatusPage: React.FC<VerificationStatusPageProps> = ({
  agentData,
  onSignOut,
  onApproved
}) => {
  const details: BusinessVerificationDetails | undefined = agentData?.businessVerificationDetails;
  const businessName = details?.businessName || agentData?.agencyName || 'Hostel Management Agency';
  const agentFullName = details?.agentFullName || agentData?.name || 'Agent / Caretaker';
  const phone = details?.phone || agentData?.phone || 'N/A';
  const businessType = details?.businessType ? details.businessType.replace('_', ' ') : 'Registered Agency';

  // Real-time listener: if admin approves while agent is on this status page, auto-trigger onApproved
  useEffect(() => {
    const uid = agentData?.id || auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if ((data.businessVerificationStatus === 'approved' || data.isVerifiedAgent === true) && onApproved) {
          onApproved();
        }
      }
    }, (err) => console.warn('Verification status listener warning:', err));

    return () => unsubscribe();
  }, [agentData?.id, onApproved]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-50 dark:bg-neutral-950 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xs space-y-6">
        
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto shadow-xs border border-amber-200 dark:border-amber-800">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <span className="inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-800">
            STATUS: VERIFICATION IN PROGRESS
          </span>

          <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Verification under review
          </h2>

          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed font-medium">
            Thank you for submitting your business details! The Dormiqa verification team is currently auditing your identity documents and property information.
          </p>
        </div>

        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
          <h4 className="font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Submission Details Summary
          </h4>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 pt-1">
            <div><strong>Agency / Business:</strong> {businessName}</div>
            <div><strong>Agent Name:</strong> {agentFullName}</div>
            <div><strong>Contact Phone:</strong> {phone}</div>
            <div><strong>Business Type:</strong> {businessType}</div>
          </div>
          <p className="text-[10px] text-neutral-500 pt-2 border-t border-neutral-200 dark:border-neutral-700">
            Standard review time is <strong>12–24 hours</strong>. Main dashboard access will unlock automatically once approved.
          </p>
        </div>

        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Dashboard access is temporarily locked until our administrators complete the audit.</span>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out for Now</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => alert('Dormiqa Support: support@dormiqa.ng')}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Contact Support</span>
          </button>
        </div>

      </div>
    </div>
  );
};
