import React, { useState } from 'react';
import { AlertTriangle, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void> | void;
  userEmail?: string;
  userName?: string;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  userEmail,
  userName
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirmDelete();
    } catch (err: any) {
      console.error("Account deletion error:", err);
      setErrorMessage(err?.message || "Failed to wipe account data. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Warning Icon Banner */}
        <div className="w-16 h-16 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center mx-auto ring-8 ring-neutral-100 dark:ring-neutral-900">
          <AlertTriangle className="w-8 h-8 text-emerald-400 dark:text-emerald-600" />
        </div>

        {/* Modal Header & Copy */}
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black text-black dark:text-white">
            Delete Account?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
            Are you sure you want to delete <strong className="text-black dark:text-white">{userName || userEmail || 'your account'}</strong>? This action is <span className="text-black dark:text-white font-bold underline decoration-emerald-500">permanent and irreversible</span>.
          </p>
        </div>

        {/* Warning Box details */}
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-left text-xs space-y-1.5 text-black dark:text-white">
          <p className="font-bold flex items-center gap-1.5 text-black dark:text-white">
            <Trash2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>The following data will be wiped permanently:</span>
          </p>
          <ul className="list-disc list-inside space-y-1 text-neutral-700 dark:text-neutral-300 font-medium pl-1">
            <li>Your user profile & verified credentials</li>
            <li>All posted hostel listings (for caretakers/agents)</li>
            <li>Active chat conversations & inspection requests</li>
            <li>Saved hostels and preference history from Firebase</li>
          </ul>
        </div>

        {errorMessage && (
          <div className="p-3 bg-black text-white text-xs font-bold rounded-xl border border-neutral-800 text-left">
            {errorMessage}
          </div>
        )}

        {/* Two Options: Go Back vs Delete Account */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-3.5 px-5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-neutral-200 dark:border-neutral-700 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-3.5 px-5 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border border-black dark:border-white disabled:opacity-50 active:scale-95"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Wiping Data...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>Delete Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
