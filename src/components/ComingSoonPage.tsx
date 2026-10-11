import React from 'react';
import { 
  Building2, 
  MapPin, 
  ArrowRight, 
  BellRing, 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { University } from '../types';

interface ComingSoonPageProps {
  university: University;
  universities?: University[];
  onSelectUniversity?: (uniId: string) => void;
  onGoBackToUniosun?: () => void;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  university,
  universities = [],
  onSelectUniversity,
  onGoBackToUniosun
}) => {
  const WAITLIST_URL = 'https://dormiqa-waitlist.vercel.app';
  const [contact, setContact] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const nonUniosunUnis = universities.filter(u => u.id !== 'uniosun');

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityId: university.id,
          universityName: university.name,
          contact: contact.trim(),
          role: 'student'
        })
      });
    } catch (err) {
      console.warn('Waitlist notification error:', err);
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      
      {/* Top Header / Breadcrumb Bar */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {onGoBackToUniosun && (
            <button
              type="button"
              onClick={onGoBackToUniosun}
              className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to UNIOSUN Platform</span>
            </button>
          )}

          {/* Quick University Switcher */}
          {nonUniosunUnis.length > 0 && onSelectUniversity && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hidden sm:inline">
                Switch University:
              </span>
              <select
                value={university.id}
                onChange={(e) => onSelectUniversity?.(e.target.value)}
                className="text-xs font-bold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <option value="uniosun">Osun State University (UNIOSUN) — LIVE</option>
                {nonUniosunUnis.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.city}) — Coming Soon
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col justify-center w-full">
        
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-8 sm:p-12 shadow-sm space-y-8 text-center sm:text-left">
          
          {/* Header Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-6">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Coming Soon
              </span>
              <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">•</span>
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                {university.city}, {university.state}
              </span>
            </div>

            <span className="text-[11px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
              Institutional Expansion
            </span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-tight">
              DORMIQA is coming to {university.name}.
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
              DORMIQA has not officially launched verified student accommodation and caretaker listings at <span className="font-semibold text-neutral-900 dark:text-white">{university.name}</span> yet. We are actively verifying off-campus lodges, mapping student hubs, and onboarding trusted local caretakers around your campus.
            </p>
          </div>

          {/* Feature Pillars / What Students Will Get */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 text-left space-y-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Physical Verification</h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                Every lodge is physically inspected to eliminate scam search fees.
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 text-left space-y-1.5">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Real Walking Minutes</h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                Campus-aware travel distance measured directly to your gate.
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 text-left space-y-1.5">
              <BellRing className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white">First Access</h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                Waitlist members receive priority notifications before public launch.
              </p>
            </div>
          </div>

          {/* In-Page Quick Waitlist Form */}
          <div className="pt-2">
            {!submitted ? (
              <form onSubmit={handleWaitlistSubmit} className="bg-neutral-50 dark:bg-neutral-800/80 p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-white">
                    Get priority notification when we launch at {university.name}:
                  </h4>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Enter your student email or WhatsApp (+234...)"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs sm:text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !contact.trim()}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Joining...' : 'Notify Me at Launch'}</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  ⚡ We will never spam. You'll receive early access to verified off-campus lodges 48 hours before public launch.
                </p>
              </form>
            ) : (
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-1.5 animate-in fade-in">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h4 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                  You're on the priority launch waitlist for {university.name}!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  We've recorded {contact}. You will be among the first students notified when vetted lodges go live.
                </p>
              </div>
            )}
          </div>

          {/* Primary CTA & Secondary Action */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start">
            
            {/* Primary Waitlist Button */}
            <a
              href={WAITLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group cursor-pointer active:scale-98"
            >
              <span>Join the Waitlist</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>

            {/* Secondary Action: Explore Live UNIOSUN Experience */}
            {onGoBackToUniosun && (
              <button
                type="button"
                onClick={onGoBackToUniosun}
                className="w-full sm:w-auto px-6 py-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Explore UNIOSUN Platform</span>
                <ArrowRight className="w-4 h-4 text-neutral-500" />
              </button>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <span>Are you a caretaker or agent at {university.code}?</span>
            <a
              href={WAITLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Register for Caretaker Early Access →
            </a>
          </div>

        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 border-t border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-500 dark:text-neutral-400">
        <p>© {new Date().getFullYear()} DORMIQA Student Accommodation. All rights reserved.</p>
      </footer>

    </div>
  );
};
