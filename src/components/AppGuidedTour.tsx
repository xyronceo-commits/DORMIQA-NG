import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Footprints, 
  SlidersHorizontal, 
  ShieldCheck, 
  MessageSquare, 
  Heart, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { DormiqaLogo } from './DormiqaLogo';

interface AppGuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TourStep {
  id: number;
  badge: string;
  title: string;
  description: string;
  tip: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

export const AppGuidedTour: React.FC<AppGuidedTourProps> = ({
  isActive,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TourStep[] = [
    {
      id: 1,
      badge: 'STEP 1: CAMPUS SELECTION',
      title: 'Choose Your University & Campus',
      description: 'Start by selecting your exact campus (e.g. UNIOSUN Main Campus, Osogbo or satellite campuses) to see hostels situated directly in your area.',
      tip: 'Hostel distances update immediately based on your chosen campus gate.',
      icon: MapPin,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      id: 2,
      badge: 'STEP 2: WALKING DISTANCE',
      title: 'Filter by Walking Minutes',
      description: 'Use the pedestrian travel bar to find student lodges within 5, 10, or 20 minutes walking time to your lectures, saving you daily commute costs.',
      tip: 'Every walking estimate is calculated from the lodge gate to the university main gate.',
      icon: Footprints,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-500/10 border-teal-500/20'
    },
    {
      id: 3,
      badge: 'STEP 3: BUDGET & AMENITIES',
      title: 'Set Budget & Accommodation Type',
      description: 'Filter by Self-Contain, Single Room, or Flat. Select critical facilities such as Running Water, Generator, Pre-paid Meter, or Fenced Compound.',
      tip: 'All listed prices reflect total annual rent and caution deposits transparently.',
      icon: SlidersHorizontal,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      id: 4,
      badge: 'STEP 4: VERIFICATION BADGE',
      title: 'Look for Verified Properties',
      description: 'Check for the green verified badge on listing cards. This confirms the property has been physically vetted and managed by an authenticated caretaker.',
      tip: 'Dormiqa prevents unauthorized listings and ghost middlemen.',
      icon: ShieldCheck,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      id: 5,
      badge: 'STEP 5: DIRECT COMMUNICATION',
      title: 'Chat & Book In-Person Inspections',
      description: 'Tap any listing card to inspect high-definition photos, message the caretaker directly, or reserve a physical inspection slot before committing.',
      tip: 'Never send rent payments before completing an in-person physical inspection.',
      icon: MessageSquare,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-500/10 border-teal-500/20'
    },
    {
      id: 6,
      badge: 'STEP 6: SHORTLIST FAVORITES',
      title: 'Save & Compare Hostels',
      description: 'Tap the heart icon on any hostel card to add it to your Saved list. Easily compare rooms, prices, and amenities side-by-side with your roommates.',
      tip: 'Saved hostels are saved to your account and sync across your devices.',
      icon: Heart,
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-500/10 border-rose-500/20'
    }
  ];

  // Keyboard navigation support
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight') {
        setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onSkip, steps.length]);

  if (!isActive) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const StepIcon = step.icon;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[99995] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-neutral-950/70 backdrop-blur-[2px] selection:bg-emerald-500 selection:text-white transition-opacity">
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Interactive Search Tour"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        
        {/* Top Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <DormiqaLogo className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-black tracking-widest text-neutral-300 uppercase">Interactive Tour</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-neutral-400 bg-neutral-800 px-2.5 py-0.5 rounded-full">
              {currentStep + 1} of {steps.length}
            </span>
            <button
              type="button"
              onClick={onSkip}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Skip guided tour"
              aria-label="Skip tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-neutral-800">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content Box */}
        <div className="p-5 sm:p-6 flex flex-col">
          
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${step.iconBg}`}>
              <StepIcon className={`w-6 h-6 ${step.iconColor}`} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                {step.badge}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                {step.title}
              </h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-4">
            {step.description}
          </p>

          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-neutral-400">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong className="text-neutral-200">Pro Tip:</strong> {step.tip}</span>
          </div>

        </div>

        {/* Bottom Actions */}
        <div className="px-5 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-md shadow-emerald-500/20 active:scale-98 cursor-pointer"
            >
              <span>{isLast ? 'Finish Tour' : 'Next Step'}</span>
              {isLast ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
