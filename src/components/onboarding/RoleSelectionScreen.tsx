import React from 'react';
import { 
  ArrowRight, 
  Check, 
  GraduationCap, 
  Briefcase
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
    <div className="h-[100dvh] max-h-[100dvh] bg-white text-neutral-900 flex flex-col justify-between font-sans overflow-y-auto">
      {/* Top Header: DORMIQA Brand */}
      <header className="w-full max-w-md mx-auto px-4 py-2.5 sm:py-3.5 flex items-center justify-between border-b border-neutral-100 shrink-0">
        <div className="flex items-center gap-2">
          <DormiqaLogo className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <span className="text-sm sm:text-base font-black tracking-tight text-neutral-900">
            DORMIQA
          </span>
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

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto px-4 py-2 sm:py-4 flex flex-col justify-center flex-1 min-h-0">
        <div className="space-y-1 mb-3 text-center sm:text-left">
          <h1 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight leading-snug">
            Select your account type
          </h1>
          <p className="text-xs text-neutral-600">
            Choose how you will be using the Dormiqa accommodation platform.
          </p>
        </div>

        {/* Clean Selection Cards */}
        <div className="space-y-2.5 sm:space-y-3">
          {/* Option 1: Student */}
          <div
            onClick={() => onSelectRole('student')}
            className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
              selectedRole === 'student'
                ? 'border-2 border-emerald-600 bg-emerald-50/30 shadow-xs'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl shrink-0 ${selectedRole === 'student' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-700'}`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-extrabold text-neutral-900 block leading-tight">Student</span>
                  <span className="text-xs text-neutral-500 font-normal truncate block">Looking for verified campus lodges with free inspection tours.</span>
                </div>
              </div>

              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                selectedRole === 'student'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-neutral-300 bg-white'
              }`}>
                {selectedRole === 'student' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Option 2: Agent / Caretaker */}
          <div
            onClick={() => onSelectRole('agent')}
            className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
              selectedRole === 'agent'
                ? 'border-2 border-emerald-600 bg-emerald-50/30 shadow-xs'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl shrink-0 ${selectedRole === 'agent' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-700'}`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-extrabold text-neutral-900 block leading-tight">Agent or Caretaker</span>
                  <span className="text-xs text-neutral-500 font-normal truncate block">Publish properties, manage room vacancies & schedule viewings.</span>
                </div>
              </div>

              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                selectedRole === 'agent'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-neutral-300 bg-white'
              }`}>
                {selectedRole === 'agent' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom CTA */}
      <footer className="w-full max-w-md mx-auto px-4 pb-4 sm:pb-6 pt-2.5 border-t border-neutral-100 flex flex-col gap-2 shrink-0">
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <span>Continue as {selectedRole === 'student' ? 'Student' : 'Agent'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="w-full py-2 sm:py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-semibold text-xs sm:text-sm transition-colors cursor-pointer text-center"
        >
          Already have an account? Sign In
        </button>
      </footer>
    </div>
  );
};
