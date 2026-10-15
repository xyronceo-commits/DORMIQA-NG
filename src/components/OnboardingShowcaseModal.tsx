import React, { useState } from 'react';
import { 
  GraduationCap, 
  MapPin, 
  Zap, 
  UserCheck, 
  CalendarCheck, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  Sparkles,
  Footprints,
  Droplets,
  PhoneCall,
  ShieldCheck,
  Search,
  Check
} from 'lucide-react';

interface OnboardingShowcaseModalProps {
  isOpen: boolean;
  onClose: (startGuidedTour?: boolean) => void;
  userName?: string;
}

export const OnboardingShowcaseModal: React.FC<OnboardingShowcaseModalProps> = ({
  isOpen,
  onClose,
  userName = 'Student'
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      id: 'welcome',
      title: `Welcome to Dormiqa, ${userName}`,
      subtitle: "Verified student accommodation platform",
      badge: "Getting Started",
      badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300",
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-white">
          <GraduationCap className="w-8 h-8" />
        </div>
      ),
      description: "Find verified self-contains, studio apartments, and student lodges near your university campus.",
      highlights: [
        "Direct verified caretaker contact",
        "No hidden or illegal agent fees",
        "Inspected campus accommodation listings"
      ]
    },
    {
      id: 'feature1',
      title: "Real Walking Distance to Campus Gate",
      subtitle: "Verified walking times to university gates",
      badge: "Feature 1 of 4",
      badgeColor: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-emerald-400">
          <Footprints className="w-8 h-8" />
        </div>
      ),
      description: "Every lodge listing shows pedestrian walking times to the main gate or faculty quad, verified by campus representatives.",
      highlights: [
        "Filter lodges by walking duration",
        "Interactive distance calculator",
        "Neighborhood and street breakdown"
      ]
    },
    {
      id: 'feature2',
      title: "Transparent Power & Water Specs",
      subtitle: "Utility details before making payment",
      badge: "Feature 2 of 4",
      badgeColor: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-emerald-400">
          <Zap className="w-8 h-8" />
        </div>
      ),
      description: "Review utility specifications for every apartment including solar inverter availability, prepaid meters, and water supply schedules.",
      highlights: [
        "Solar and inverter availability",
        "Prepaid electricity meter status",
        "Water pumping and tap schedules"
      ]
    },
    {
      id: 'feature3',
      title: "Verified Caretakers & Direct Contact",
      subtitle: "Connect with verified agents and landlords",
      badge: "Feature 3 of 4",
      badgeColor: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-emerald-400">
          <UserCheck className="w-8 h-8" />
        </div>
      ),
      description: "All agents and landlords are verified. Contact property managers directly via phone or WhatsApp.",
      highlights: [
        "Verified agent badges",
        "Direct phone and WhatsApp chat",
        "Report unverified listings"
      ]
    },
    {
      id: 'feature4',
      title: "Inspection Scheduling",
      subtitle: "Book physical or video walkthroughs",
      badge: "Feature 4 of 4",
      badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300",
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-emerald-400">
          <CalendarCheck className="w-8 h-8" />
        </div>
      ),
      description: "Schedule physical room inspections or view immersive 360° virtual video walkthroughs directly from your laptop or smartphone.",
      highlights: [
        "1-click physical inspection calendar booking",
        "HD 360° video interior walkthrough previews",
        "Automatic SMS & email inspection reminders"
      ]
    }
  ];

  const current = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onClose(true); // Complete onboarding & launch guided tour
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose(true); // Skip onboarding modal & launch guided tour
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${current.badgeColor}`}>
              {current.badge}
            </span>
            <span className="text-xs font-bold text-neutral-400">
              {currentSlide + 1} / {slides.length}
            </span>
          </div>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="px-3 py-1 rounded-xl text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Skip</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Slide Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col items-center text-center space-y-5">
          
          {/* Main Icon */}
          <div className="pt-2">
            {current.icon}
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white leading-tight">
              {current.title}
            </h2>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {current.subtitle}
            </p>
          </div>

          {/* Main Description */}
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md">
            {current.description}
          </p>

          {/* Feature Highlight Bullets */}
          <div className="w-full bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 text-left space-y-2 border border-neutral-100 dark:border-neutral-800">
            {current.highlights.map((point, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Footer Navigation Bar */}
        <div className="p-6 bg-neutral-50 dark:bg-neutral-900/90 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
          
          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx 
                    ? 'w-6 bg-emerald-600 dark:bg-emerald-500' 
                    : 'w-2 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>{currentSlide === slides.length - 1 ? "Start Exploring" : "Next"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
