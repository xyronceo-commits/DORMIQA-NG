import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { Listing } from '../types';
import { submitReport } from '../services/api';
import { auth } from '../services/firebase';

interface ReportListingModalProps {
  listing: Listing;
  onClose: () => void;
}

export const ReportListingModal: React.FC<ReportListingModalProps> = ({
  listing,
  onClose
}) => {
  const [reason, setReason] = useState<'fake_listing' | 'misleading_photos' | 'scam_attempt' | 'incorrect_price' | 'other'>('fake_listing');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const user = auth.currentUser;
      await submitReport({
        listingId: listing.id,
        listingTitle: listing.title,
        reporterId: user?.uid || 'anonymous_student',
        reporterName: user?.displayName || user?.email?.split('@')[0] || 'Verified Student',
        reason,
        details
      });
      setSubmitting(false);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Report submission error:', err);
      setSubmitting(false);
      setErrorMessage(err.message || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-black dark:text-white">Report Submitted</h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                Thank you. Our admin team will review this listing.
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold w-fit">
              <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Trust & Safety Report
            </div>

            <div>
              <h2 className="text-lg font-bold text-black dark:text-white">Report Listing</h2>
              <p className="text-xs text-neutral-500 truncate">{listing.title}</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs rounded-xl">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-black dark:text-white uppercase block mb-1">Reason for Report</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-black dark:text-white bg-neutral-50 dark:bg-neutral-800"
              >
                <option value="fake_listing">Fake property / Unreachable agent</option>
                <option value="misleading_photos">Photos don't match reality</option>
                <option value="scam_attempt">Agent requested off-platform wire transfer</option>
                <option value="incorrect_price">Price differs from advertised amount</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-black dark:text-white uppercase block mb-1">Additional Details</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please describe what is incorrect or suspicious about this listing..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-black dark:text-white bg-neutral-50 dark:bg-neutral-800 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Report...</span>
                </>
              ) : (
                <span>Submit to Admin Team</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
