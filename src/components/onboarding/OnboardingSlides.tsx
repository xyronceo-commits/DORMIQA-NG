import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  primaryAction: string;
  imageUrl: string;
  keyPoints: string[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Verified Lodges Near Campus Gates',
    description: 'Browse student accommodation verified for security, prepaid meters, and running water within direct walking distance of campus lecture halls.',
    primaryAction: 'Find Accommodation',
    imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80',
    keyPoints: ['Walking distance to gates', 'Verified utilities & water', 'Clear annual rent in Naira']
  },
  {
    id: 2,
    title: 'Free In-Person Lodge Inspections',
    description: 'Schedule in-person physical inspections directly with verified property caretakers. Under platform policy, viewing fees are strictly zero.',
    primaryAction: 'Continue',
    imageUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=80',
    keyPoints: ['₦0 inspection fee', 'Inspect before paying rent', 'Direct caretaker contact']
  },
  {
    id: 3,
    title: 'Direct Caretaker Contact',
    description: 'Connect directly with verified local lodge managers and caretakers operating around your university. No middleman extortion or hidden markups.',
    primaryAction: 'Get Started',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80',
    keyPoints: ['Verified caretaker identity', 'Direct WhatsApp & phone', 'UNIOSUN launch campus']
  }
];

interface OnboardingSlidesProps {
  onComplete: () => void;
  onLoginClick: () => void;
}

export const OnboardingSlides: React.FC<OnboardingSlidesProps> = ({
  onComplete,
  onLoginClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState<Record<number, boolean>>({});

  const slide = SLIDES[currentIndex];

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between font-sans">
      {/* Top Bar */}
      <header className="w-full max-w-xl mx-auto px-6 py-4 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold tracking-tight text-neutral-900">DORMIQA</span>
          <span className="text-neutral-300 font-light text-xs">/</span>
          <span className="text-xs text-neutral-500 font-medium">UNIOSUN Launch</span>
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1.5 px-3 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          Skip
        </button>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-xl mx-auto px-6 py-6 sm:py-8 flex flex-col justify-center flex-1">
        {/* Real Accommodation Photography Container */}
        <div className="w-full aspect-[16/10] sm:aspect-[16/9] rounded-lg border border-neutral-200 overflow-hidden bg-neutral-100 relative mb-6">
          {!imageFailed[slide.id] ? (
            <img
              src={slide.imageUrl}
              alt={slide.title}
              referrerPolicy="no-referrer"
              onError={() => setImageFailed((prev) => ({ ...prev, [slide.id]: true }))}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-50 text-neutral-500 text-xs">
              <span className="font-semibold text-neutral-700 mb-1">{slide.title}</span>
              <span>DORMIQA Verified Accommodation</span>
            </div>
          )}
        </div>

        {/* Slide Content */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight leading-tight">
              {slide.title}
            </h1>
            <p className="text-sm text-neutral-600 leading-relaxed font-normal">
              {slide.description}
            </p>
          </div>

          {/* Key Facts: Unboxed text separated with dots */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 pt-1">
            {slide.keyPoints.map((point, i) => (
              <React.Fragment key={i}>
                <span className="text-neutral-700 font-medium">{point}</span>
                {i < slide.keyPoints.length - 1 && <span className="text-neutral-300 font-bold" aria-hidden="true">·</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Step Progress Indicators */}
          <div className="flex items-center gap-1.5 pt-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1 rounded-sm transition-all cursor-pointer ${
                  i === currentIndex ? 'w-8 bg-emerald-600' : 'w-3 bg-neutral-200 hover:bg-neutral-300'
                }`}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Action Footer */}
      <footer className="w-full max-w-xl mx-auto px-6 pb-6 sm:pb-8 pt-4 border-t border-neutral-100 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleNext}
          className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none"
        >
          <span>{slide.primaryAction}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onLoginClick}
          className="w-full py-2.5 px-4 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-medium text-sm transition-colors cursor-pointer text-center"
        >
          Sign In
        </button>
      </footer>
    </div>
  );
};
