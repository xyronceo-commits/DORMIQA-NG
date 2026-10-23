import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Footprints, 
  MessageSquare, 
  CalendarCheck, 
  Compass, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { DormiqaLogo } from './DormiqaLogo';

interface OnboardingShowcaseModalProps {
  isOpen: boolean;
  userName?: string;
  onClose: (startGuidedTour?: boolean) => void;
}

interface ShowcaseSlide {
  id: number;
  badge: string;
  title: string;
  highlight: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  points: string[];
}

export const OnboardingShowcaseModal: React.FC<OnboardingShowcaseModalProps> = ({
  isOpen,
  userName = 'Student',
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const slides: ShowcaseSlide[] = [
    {
      id: 1,
      badge: 'WELCOME TO DORMIQA',
      title: `Welcome to Dormiqa,`,
      highlight: userName,
      description: 'Your trusted platform for finding, vetting, and securing authentic student accommodation near campus without stress or exploitative fees.',
      icon: Sparkles,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-500',
      points: [
        'Curated accommodations near Osun State University & beyond',
        'Direct connection between university students and verified caretakers',
        'Transparent pricing, rules, and caution fees with zero hidden charges'
      ]
    },
    {
      id: 2,
      badge: 'SECURITY & VETTING',
      title: '100% Verified',
      highlight: 'Student Hostels',
      description: 'Say goodbye to ghost agents and misleading photos. Every lodge listed is inspected and tied to an authenticated property caretaker.',
      icon: ShieldCheck,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-500',
      points: [
        'Only verified caretakers and landlords can publish properties',
        'Accurate high-resolution photos and room specifications',
        'Community reporting system to rapidly remove fraudulent entries'
      ]
    },
    {
      id: 3,
      badge: 'PEDESTRIAN ROUTING',
      title: 'Accurate Walking Minutes to',
      highlight: 'Campus Gates',
      description: 'Never guess if a hostel is truly close to class. We calculate pedestrian distances directly to campus gates and faculty buildings.',
      icon: Footprints,
      iconBg: 'bg-teal-500/10 border-teal-500/20',
      iconColor: 'text-teal-500',
      points: [
        'Filter listings by 5, 10, or 20 minutes walking distance',
        'Compare walking times across different campus gates',
        'Cut daily transport expenses by living closer to lectures'
      ]
    },
    {
      id: 4,
      badge: 'DIRECT CONTACT',
      title: 'Chat Directly With',
      highlight: 'Property Caretakers',
      description: 'Communicate straight with the lodge manager without third-party extortion or illegal "search fees" before viewing.',
      icon: MessageSquare,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-500',
      points: [
        'Real-time in-app messaging and quick inquiry templates',
        'Clarify water, power, and security situations directly with managers',
        'Complete record of all conversations and inquiries'
      ]
    },
    {
      id: 5,
      badge: 'EASY INSPECTIONS',
      title: 'Schedule In-Person',
      highlight: 'Hostel Viewings',
      description: 'Book confirmed inspection slots online. Inspect the premises thoroughly in daylight before paying any rent or commitment fees.',
      icon: CalendarCheck,
      iconBg: 'bg-teal-500/10 border-teal-500/20',
      iconColor: 'text-teal-500',
      points: [
        'Pick inspection dates and time windows that match your schedule',
        'Receive automated appointment reminders and caretaker contact info',
        'Never pay rent before completing a satisfactory physical inspection'
      ]
    }
  ];

  const slide = slides[currentStep];
  const isLast = currentStep === slides.length - 1;
  const SlideIcon = slide.icon;

  const handleNext = () => {
    if (isLast) {
      onClose(true);
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
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm selection:bg-emerald-500 selection:text-white">
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Dormiqa Feature Showcase"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white relative animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-neutral-800/80">
          <div className="flex items-center gap-2">
            <DormiqaLogo className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-black tracking-widest text-neutral-300 uppercase">Dormiqa Features</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
              {currentStep + 1} of {slides.length}
            </span>
            <button
              type="button"
              onClick={() => onClose(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close walkthrough"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 flex flex-col items-center text-center">
          
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-5">
            <Sparkles className="w-3 h-3" />
            <span>{slide.badge}</span>
          </span>

          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border mb-5 ${slide.iconBg}`}>
            <SlideIcon className={`w-8 h-8 ${slide.iconColor}`} />
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug mb-2">
            {slide.title}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              {slide.highlight}
            </span>
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-sm mb-5">
            {slide.description}
          </p>

          {/* Points list */}
          <div className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2 text-left mb-6">
            {slide.points.map((pt, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-neutral-300">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>{pt}</span>
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentStep ? 'w-6 bg-emerald-400' : 'w-1.5 bg-neutral-700'
                }`}
              />
            ))}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 bg-neutral-950/70 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onClose(false)}
              className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer px-3 py-2"
            >
              Skip Walkthrough
            </button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isLast ? (
              <>
                <button
                  type="button"
                  onClick={() => onClose(false)}
                  className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer text-center"
                >
                  Go to Search
                </button>
                <button
                  type="button"
                  onClick={() => onClose(true)}
                  className="w-1/2 sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Start Tour</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-md shadow-emerald-500/20 active:scale-98 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
