import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  MapPin, 
  SlidersHorizontal, 
  Calendar, 
  Sparkles,
  Footprints,
  Eye
} from 'lucide-react';

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

const DEFAULT_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="university-filter"]',
    title: '1. Select Your University Campus',
    description: 'Select your institution (e.g. UNILAG, UI, FUTA, OAU, LASU) to filter verified student lodges around your specific campus gate.',
    icon: <MapPin className="w-4 h-4 text-emerald-600" />,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="budget-distance-filters"]',
    title: '2. Set Walking Distance & Budget',
    description: 'Filter lodges by exact pedestrian walking minutes (<3m, <5m, <10m) to campus gate and set your annual Naira (₦) budget limit.',
    icon: <Footprints className="w-4 h-4 text-emerald-600" />,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="property-filters"]',
    title: '3. Accommodation & Power Filters',
    description: 'Filter for Studio Self-Contains, 1-Bedroom Flats, or Shared Rooms. Check for 24/7 Solar Inverters, PHCN Prepaid meters, and Borehole water.',
    icon: <SlidersHorizontal className="w-4 h-4 text-emerald-600" />,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="listing-card"]',
    title: '4. Explore Verified Campus Lodges',
    description: 'Browse real property photos, campus gate walking distance badges, caretaker verification seals, and transparent utility details.',
    icon: <Eye className="w-4 h-4 text-emerald-600" />,
    position: 'top'
  },
  {
    targetSelector: '[data-tour="book-inspection-btn"]',
    title: '5. Book Property Tour / Inspection',
    description: 'Click "Book Tour / Inspection" to schedule a physical guided inspection or view a 360° video walkthrough directly with the verified caretaker.',
    icon: <Calendar className="w-4 h-4 text-emerald-600" />,
    position: 'top'
  }
];

interface AppGuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  steps?: TourStep[];
}

export const AppGuidedTour: React.FC<AppGuidedTourProps> = ({
  isActive,
  onComplete,
  onSkip,
  steps = DEFAULT_STEPS
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStepIndex];

  // Update position of spotlight target
  useEffect(() => {
    if (!isActive || !step) return;

    const updateRect = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
        }, 200);
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, currentStepIndex, step]);

  if (!isActive || !step) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Tooltip positioning logic
  const getTooltipStyle = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const padding = 12;
    const windowWidth = window.innerWidth;
    const isMobile = windowWidth < 640;

    if (isMobile) {
      return {
        bottom: '24px',
        left: '16px',
        right: '16px',
        margin: '0 auto'
      };
    }

    // Desktop positioning
    const preferredPos = step.position || 'bottom';
    let top = 0;
    let left = targetRect.left + targetRect.width / 2 - 180; // 360px wide tooltip centered

    // Ensure left stays within viewport
    if (left < 16) left = 16;
    if (left + 360 > windowWidth - 16) left = windowWidth - 376;

    if (preferredPos === 'bottom') {
      top = targetRect.bottom + padding;
      if (top + 220 > window.innerHeight) {
        top = Math.max(16, targetRect.top - 220 - padding);
      }
    } else {
      top = targetRect.top - 220 - padding;
      if (top < 16) {
        top = targetRect.bottom + padding;
      }
    }

    return {
      top: `${top}px`,
      left: `${left}px`
    };
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto transition-all duration-300">
      
      {/* Dimmed Overlay with Spotlight cutout */}
      {targetRect ? (
        <div 
          className="absolute inset-0 transition-all duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 1.4}px, rgba(15, 23, 42, 0.78) ${Math.max(targetRect.width, targetRect.height) / 1.2}px)`
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs pointer-events-none" />
      )}

      {/* Target Element Highlight Box Ring */}
      {targetRect && (
        <div 
          className="absolute border-2 border-emerald-500 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all duration-300 pointer-events-none animate-pulse-slow"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`
          }}
        />
      )}

      {/* Floating Tooltip Box */}
      <div 
        className="fixed z-50 w-full max-w-[380px] bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-2xl border-2 border-emerald-500/80 space-y-4 animate-in fade-in zoom-in-95 duration-200"
        style={getTooltipStyle()}
      >
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              {step.icon || <Compass className="w-4 h-4" />}
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Guided Tour • Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>

          <button
            onClick={onSkip}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Skip Guided Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Title & Description */}
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
            {step.title}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Controls */}
        <div className="pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onSkip}
            className="text-xs font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>{currentStepIndex === steps.length - 1 ? 'Got It!' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
