import React, { useState } from 'react';
import { X, ShieldAlert, Flag, CheckCircle2 } from 'lucide-react';
import { Listing, Report } from '../types';
import { submitReport } from '../services/api';

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

  const [aiReportResult, setAiReportResult] = useState<Report | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await submitReport({
        listingId: listing.id,
        listingTitle: listing.title,
        reporterId: 'usr_student_1',
        reporterName: 'Alex Chen',
        reason,
        details
      });
      setAiReportResult(res);
      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full border border-neutral-200 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-4 space-y-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
              aiReportResult?.aiActionTaken === 'listing_banned'
                ? 'bg-rose-100 text-rose-600 border border-rose-200 shadow-sm'
                : 'bg-emerald-100 text-emerald-600'
            }`}>
              {aiReportResult?.aiActionTaken === 'listing_banned' ? (
                <ShieldAlert className="w-8 h-8" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>

            {aiReportResult?.aiActionTaken === 'listing_banned' ? (
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider">
                  AI Auto-Banned & Delisted
                </span>
                <h3 className="text-lg font-black text-slate-900">Fake Listing Removed</h3>
                <p className="text-xs font-semibold text-rose-800 bg-rose-50 p-3 rounded-2xl border border-rose-100 text-left leading-relaxed">
                  {aiReportResult?.aiReason || 'Listing confirmed as fake or duplicate uploaded across agents. AI Anti-Scam engine has automatically banned and hidden this accommodation.'}
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  Thank you for keeping Dormiqa safe for all Nigerian students!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-neutral-900">Report Submitted to Trust Desk</h3>
                <p className="text-xs text-neutral-600">
                  Thank you for keeping Dormiqa safe. Our AI Safety Engine & Admin Audit team have flagged this listing for review.
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-800 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl text-xs font-bold w-fit">
              <ShieldAlert className="w-4 h-4" /> Anti-Scam Protection
            </div>

            <div>
              <h2 className="text-lg font-bold text-neutral-900">Report Listing</h2>
              <p className="text-xs text-neutral-500 truncate">{listing.title}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">Reason for Report</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-900 bg-neutral-50"
              >
                <option value="fake_listing">Fake property / Unreachable agent</option>
                <option value="misleading_photos">Photos don't match reality</option>
                <option value="scam_attempt">Agent requested off-platform wire transfer</option>
                <option value="incorrect_price">Price differs from advertised amount</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">Details</label>
              <textarea
                required
                rows={3}
                placeholder="Provide specific details to help our safety team..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 bg-neutral-50 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting Report...' : 'Submit Report to Trust Desk'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
