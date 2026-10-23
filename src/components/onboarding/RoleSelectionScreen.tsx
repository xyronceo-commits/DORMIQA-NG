import React from 'react';
import { 
  GraduationCap, 
  Building2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  MapPin, 
  Sparkles 
} from 'lucide-react';
import { UserRole } from '../../types';
import { DormiqaLogo } from '../DormiqaLogo';

interface RoleSelectionScreenProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onContinue: () => void;
  onSwitchToSignIn: () => void;
  onBackToSlides: () => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  selectedRole,
  onSelectRole,
  onContinue,
  onSwitchToSignIn,
  onBackToSlides
}) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative overflow-hidden">
      
      {/* Background Subtle Gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between z-10">
        <button
          type="button"
          onClick={onBackToSlides}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <DormiqaLogo className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 text-emerald-400" />
          <span className="text-base sm:text-lg font-black tracking-tight text-white">DORMIQA</span>
        </div>

        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </header>

      {/* Main Role Selection Area */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col items-center justify-center flex-1 z-10">
        
        {/* Title Header */}
        <div className="text-center max-w-md mx-auto mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>ACCOUNT CREATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            How will you use Dormiqa?
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
            Choose your role to get the tailored student or caretaker portal experience.
          </p>
        </div>

        {/* Role Cards Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* 1. Student Role Option */}
          <button
            type="button"
            onClick={() => onSelectRole('student')}
            className={`w-full text-left p-5 sm:p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
              selectedRole === 'student'
                ? 'bg-neutral-900 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${
                  selectedRole === 'student'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 group-hover:text-neutral-200'
                }`}>
                  <GraduationCap className="w-6 h-6" />
                </div>

                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                  selectedRole === 'student'
                    ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
                    : 'border-neutral-600 bg-neutral-950'
                }`}>
                  {selectedRole === 'student' && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                CAMPUS RESIDENT
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                I am a Student
              </h2>

              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Discover verified hostels, self-contains, and shared flats near your campus with accurate walking times and direct caretaker contacts.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-800/80 flex items-center gap-2 text-[11px] font-semibold text-neutral-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Explore UNIOSUN & partner campuses</span>
            </div>
          </button>

          {/* 2. Caretaker / Agent Role Option */}
          <button
            type="button"
            onClick={() => onSelectRole('agent')}
            className={`w-full text-left p-5 sm:p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
              selectedRole === 'agent'
                ? 'bg-neutral-900 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${
                  selectedRole === 'agent'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 group-hover:text-neutral-200'
                }`}>
                  <Building2 className="w-6 h-6" />
                </div>

                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                  selectedRole === 'agent'
                    ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
                    : 'border-neutral-600 bg-neutral-950'
                }`}>
                  {selectedRole === 'agent' && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">
                PROPERTY MANAGER
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                I am an Agent / Caretaker
              </h2>

              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                List student lodges, manage tenant inquiries, confirm inspection bookings, and showcase verified rooms directly to university students.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-800/80 flex items-center gap-2 text-[11px] font-semibold text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Fast verification & property management</span>
            </div>
          </button>

        </div>

        {/* Security & Moderation Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-neutral-500 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-500/70 shrink-0" />
          <span>Every agent is vetted and authenticated to ensure safe student living.</span>
        </div>

      </main>

      {/* Footer Navigation */}
      <footer className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-6 pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer order-2 sm:order-1"
        >
          Already have an account? <span className="font-bold text-emerald-400 underline">Sign In</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer order-1 sm:order-2"
        >
          <span>Continue as {selectedRole === 'agent' ? 'Caretaker' : 'Student'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </footer>

    </div>
  );
};
