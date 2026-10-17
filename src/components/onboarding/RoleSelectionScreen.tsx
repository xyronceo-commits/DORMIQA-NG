import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { UserRole } from '../../types';

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
      {/* Top Header */}
      <header className="w-full max-w-xl mx-auto px-6 py-4 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold tracking-tight text-neutral-900">DORMIQA</span>
          <span className="text-neutral-300 font-light text-xs">/</span>
          <span className="text-xs text-neutral-500 font-medium">Get Started</span>
        </div>

        {onBackToSlides && (
          <button
            type="button"
            onClick={onBackToSlides}
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1.5 px-3 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Back
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="w-full max-w-xl mx-auto px-6 py-8 flex flex-col justify-center flex-1">
        <div className="space-y-1.5 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Select your account type
          </h1>
          <p className="text-sm text-neutral-600">
            Choose how you will be using the Dormiqa accommodation platform.
          </p>
        </div>

        {/* Clean Selection Cards */}
        <div className="space-y-3">
          {/* Option 1: Student */}
          <div
            onClick={() => onSelectRole('student')}
            className={`p-4 rounded-lg border transition-all cursor-pointer ${
              selectedRole === 'student'
                ? 'border-2 border-emerald-600 bg-emerald-50/20'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">Student</span>
                  <span className="text-xs text-neutral-400 font-normal">· Looking for housing</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Search verified self-contains, single rooms, and flats near university campus gates. Free in-person inspections.
                </p>
                <div className="text-[11px] text-neutral-500 pt-1 flex items-center gap-1.5">
                  <span>₦0 viewing fees</span>
                  <span aria-hidden="true">·</span>
                  <span>Direct caretaker contact</span>
                  <span aria-hidden="true">·</span>
                  <span>UNIOSUN Active</span>
                </div>
              </div>

              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
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
            className={`p-4 rounded-lg border transition-all cursor-pointer ${
              selectedRole === 'agent'
                ? 'border-2 border-emerald-600 bg-emerald-50/20'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">Agent or Caretaker</span>
                  <span className="text-xs text-neutral-400 font-normal">· Listing properties</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  List student accommodation, schedule physical viewings, and connect directly with verified students.
                </p>
                <div className="text-[11px] text-neutral-500 pt-1 flex items-center gap-1.5">
                  <span>Direct tenant inquiries</span>
                  <span aria-hidden="true">·</span>
                  <span>Fast verification</span>
                  <span aria-hidden="true">·</span>
                  <span>Inspection calendar</span>
                </div>
              </div>

              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
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
      <footer className="w-full max-w-xl mx-auto px-6 pb-6 sm:pb-8 pt-4 border-t border-neutral-100 flex flex-col gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none"
        >
          <span>Continue as {selectedRole === 'student' ? 'Student' : 'Agent'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-xs text-neutral-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-emerald-700 font-semibold hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </footer>
    </div>
  );
};
