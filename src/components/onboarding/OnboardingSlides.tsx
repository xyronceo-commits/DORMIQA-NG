import React, { useState } from 'react';
import { 
  Building2, 
  Footprints, 
  ShieldCheck, 
  CalendarCheck, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { DormiqaLogo } from '../DormiqaLogo';

interface OnboardingSlidesProps {
  onComplete: () => void;
  onLoginClick: () => void;
}

interface SlideData {
  id: number;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  highlightText: string;
  description: string;
  tagline: string;
}

const ONBOARDING_SLIDES: SlideData[] = [
  {
    id: 1,
    badge: 'VERIFIED CAMPUS LODGINGS',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Find safe, verified student accommodation near',
    highlightText: 'campus gates',
    description: 'Every hostel and self-contain on Dormiqa undergoes real verification. No ghost agents, zero scam risks, and authentic interior photography.',
    tagline: '100% Vetted Caretakers & Direct Landlords'
  },
  {
    id: 2,
    badge: 'WALKING DISTANCE ROUTING',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: Footprints,
    iconBg: 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400',
    iconColor: 'text-teal-600 dark:text-teal-400',
    title: 'Know the exact walking time before you',
    highlightText: 'pay or visit',
    description: 'Pedestrian routes calculated straight to your university faculty and main gates. Filter by 5, 10, or 20 minutes walking distance with complete clarity.',
    tagline: 'No guesswork, no misleading distance claims'
  },
  {
    id: 3,
    badge: 'ZERO EXPLOITATIVE SEARCH FEES',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Building2,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Transparent rent pricing with direct caretaker',
    highlightText: 'communication',
    description: 'Browse transparent rental prices, caution deposits, and legal fees upfront. Chat directly with verified caretakers without paying extortionate search fees.',
    tagline: 'Direct messaging & upfront pricing'
  },
  {
    id: 4,
    badge: 'CONFIRMED INSPECTIONS',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: CalendarCheck,
    iconBg: 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400',
    iconColor: 'text-teal-600 dark:text-teal-400',
    title: 'Schedule real in-person hostel viewings with',
    highlightText: 'instant confirmation',
    description: 'Book your inspection slot seamlessly. Receive caretaker directions, safety guidelines, and schedule alerts right on your phone.',
    tagline: 'Convenient inspection booking on your schedule'
  }
];

export const OnboardingSlides: React.FC<OnboardingSlidesProps> = ({
  onComplete,
  onLoginClick
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const currentSlide = ONBOARDING_SLIDES[currentSlideIndex];
  const isLastSlide = currentSlideIndex === ONBOARDING_SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const CurrentIcon = currentSlide.icon;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative overflow-hidden">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <DormiqaLogo className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-emerald-400" />
          <span className="text-base sm:text-lg font-black tracking-tight text-white">DORMIQA</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLoginClick}
            className="text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800/60 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-950/40 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Skip</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Slide Card */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col items-center justify-center flex-1 z-10">
        <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md flex flex-col items-center text-center relative">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-6 sm:mb-8">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{currentSlide.badge}</span>
          </div>

          {/* Central Feature Icon */}
          <div className="relative mb-6 sm:mb-8">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center border shadow-inner ${currentSlide.iconBg}`}>
              <CurrentIcon className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          </div>

          {/* Title & Description */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug max-w-lg mb-3">
            {currentSlide.title}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              {currentSlide.highlightText}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-md mb-6">
            {currentSlide.description}
          </p>

          {/* Subtag highlight */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-[11px] sm:text-xs font-semibold text-emerald-300">
            <span>{currentSlide.tagline}</span>
          </div>

          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-2 mt-8 sm:mt-10">
            {ONBOARDING_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlideIndex 
                    ? 'w-8 bg-emerald-400' 
                    : 'w-2 bg-neutral-700 hover:bg-neutral-600'
                }`}
              />
            ))}
          </div>

        </div>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-6 pt-2 flex items-center justify-between gap-3 z-10">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            currentSlideIndex === 0
              ? 'opacity-0 pointer-events-none'
              : 'text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 cursor-pointer'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="flex-1 sm:flex-none sm:min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
        >
          <span>{isLastSlide ? 'Get Started' : 'Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </footer>

    </div>
  );
};
