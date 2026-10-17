import React from 'react';
import { 
  ArrowRight, 
  Check, 
  GraduationCap, 
  Briefcase, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Phone 
} from 'lucide-react';
import { UserRole } from '../../types';
import { DormiqaLogo } from '../DormiqaLogo';

interface RoleSelectionScreenProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onContinue: () => void;
  onSwitchToSignIn: () => void;
  onBackToSlides?: () => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  selectedRole,
  onSelectRole,
  onContinue,
  onSwitchToSignIn,
  onBackToSlides,
}) => {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between font-sans">
      {/* Top Header: DORMIQA Find Your Place, Live Closer (No URL path breadcrumb) */}
      <header className="w-full max-w-xl mx-auto px-5 py-3.5 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <DormiqaLogo className="w-6 h-6 shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-base font-black tracking-tight text-neutral-900 leading-none">
              DORMIQA
            </span>
            <span className="text-xs text-neutral-500 font-medium tracking-tight">
              Find Your Place, Live Closer
            </span>
          </div>
        </div>

        {onBackToSlides && (
          <button
            type="button"
            onClick={onBackToSlides}
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1 px-2.5 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Back
          </button>
        )}
      </header>

      {/* Main Container - Elevated up so users do not need to scroll */}
      <main className="w-full max-w-xl mx-auto px-5 pt-4 pb-3 flex flex-col justify-start flex-1">
        <div className="space-y-1 mb-4">
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            Select your account type
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Choose how you will be using the Dormiqa accommodation platform.
          </p>
        </div>

        {/* Clean Selection Cards */}
        <div className="space-y-3">
          {/* Option 1: Student */}
          <div
            onClick={() => onSelectRole('student')}
            className={`p-3.5 sm:p-4 rounded-lg border transition-all cursor-pointer ${
              selectedRole === 'student'
                ? 'border-2 border-emerald-600 bg-emerald-50/20'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${selectedRole === 'student' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-700'}`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 block leading-tight">Student</span>
                    <span className="text-[11px] text-neutral-500 font-normal">Looking for accommodation</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed pl-8">
                  Search verified self-contains, single rooms, and flats near university campus gates. Free in-person inspections.
                </p>

                <div className="text-[11px] text-neutral-500 pt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-8">
                  <span className="flex items-center gap-1 font-medium text-neutral-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    ₦0 viewing fees
                  </span>
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                    Direct caretaker contact
                  </span>
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                    UNIOSUN Active
                  </span>
                </div>
              </div>

              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                selectedRole === 'student'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-neutral-300 bg-white'
              }`}>
                {selectedRole === 'student' && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

          {/* Option 2: Agent / Caretaker */}
          <div
            onClick={() => onSelectRole('agent')}
            className={`p-3.5 sm:p-4 rounded-lg border transition-all cursor-pointer ${
              selectedRole === 'agent'
                ? 'border-2 border-emerald-600 bg-emerald-50/20'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${selectedRole === 'agent' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-700'}`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 block leading-tight">Agent or Caretaker</span>
                    <span className="text-[11px] text-neutral-500 font-normal">Listing properties</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed pl-8">
                  List student accommodation, schedule physical viewings, and connect directly with verified students.
                </p>

                <div className="text-[11px] text-neutral-500 pt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-8">
                  <span className="flex items-center gap-1 font-medium text-neutral-700">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    Fast verification
                  </span>
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-neutral-400 shrink-0" />
                    Inspection booking
                  </span>
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                    Direct inquiries
                  </span>
                </div>
              </div>

              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                selectedRole === 'agent'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-neutral-300 bg-white'
              }`}>
                {selectedRole === 'agent' && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom CTA */}
      <footer className="w-full max-w-xl mx-auto px-5 pb-5 pt-3 border-t border-neutral-100 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none"
        >
          <span>Continue as {selectedRole === 'student' ? 'Student' : 'Agent'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-xs text-neutral-600 hover:text-neutral-900 font-medium cursor-pointer"
          >
            Already have an account? <span className="text-emerald-700 font-semibold underline">Sign In</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
