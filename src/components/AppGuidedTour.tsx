import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Compass, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  MapPin, 
  SlidersHorizontal, 
  Calendar, 
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
    icon: <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="budget-distance-filters"]',
    title: '2. Set Walking Distance & Budget',
    description: 'Filter lodges by exact pedestrian walking minutes (<3m, <5m, <10m) to campus gate and set your annual Naira (₦) budget limit.',
    icon: <Footprints className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="property-filters"]',
    title: '3. Accommodation & Power Filters',
    description: 'Filter for Studio Self-Contains, 1-Bedroom Flats, or Shared Rooms. Check for 24/7 Solar Inverters, PHCN Prepaid meters, and Borehole water.',
    icon: <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    position: 'bottom'
  },
  {
    targetSelector: '[data-tour="listing-card"]',
    title: '4. Explore Verified Campus Lodges',
    description: 'Browse real property photos, campus gate walking distance badges, caretaker verification seals, and transparent utility details.',
    icon: <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    position: 'top'
  },
  {
    targetSelector: '[data-tour="book-inspection-btn"]',
    title: '5. Book Property Tour / Inspection',
    description: 'Click "Book Tour / Inspection" to schedule a physical guided inspection or view a 360° video walkthrough directly with the verified caretaker.',
    icon: <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
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
  const animFrameIdRef = useRef<number | null>(null);

  const step = steps[currentStepIndex];

  // Function to compute bounding box without invoking scrollIntoView
  const updateTargetPosition = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // RequestAnimationFrame throttled position updater for smooth scrolling & resizing
  const handleScrollOrResize = useCallback(() => {
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    animFrameIdRef.current = requestAnimationFrame(() => {
      updateTargetPosition();
      animFrameIdRef.current = null;
    });
  }, [updateTargetPosition]);

  // 1. Scroll target into view ONCE when step changes
  useEffect(() => {
    if (!isActive || !step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      // Scroll into view ONCE on step transition, never repeatedly on scroll
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Small timeout to allow smooth scroll animation to finish before reading rect
      const timer = setTimeout(() => {
        updateTargetPosition();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStepIndex, step, updateTargetPosition]);

  // 2. Attach passive scroll/resize listeners to keep targetRect synced during manual scroll
  useEffect(() => {
    if (!isActive) return;

    updateTargetPosition();

    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isActive, handleScrollOrResize, updateTargetPosition]);

  // Keyboard navigation support (Escape to skip, Enter/Right arrow for Next, Left arrow for Prev)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          onComplete();
        }
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        setCurrentStepIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex, steps.length, onSkip, onComplete]);

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

  // Compute Tooltip Popover Style dynamically
  const getTooltipStyle = (): React.CSSProperties => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    // Mobile: Render as a fixed bottom card
    if (isMobile) {
      return {
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        maxWidth: 'calc(100vw - 32px)',
        margin: '0 auto',
        zIndex: 50
      };
    }

    // Desktop: Position near targetRect with smart bounds checking
    if (!targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50
      };
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const tooltipWidth = 380;
    const tooltipHeight = 220;
    const padding = 16;

    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    if (left < 16) left = 16;
    if (left + tooltipWidth > windowWidth - 16) left = windowWidth - tooltipWidth - 16;

    const preferredPos = step.position || 'bottom';
    let top = 0;

    if (preferredPos === 'bottom') {
      top = targetRect.bottom + padding;
      // If bottom goes off-screen, show above target
      if (top + tooltipHeight > windowHeight - 16) {
        top = Math.max(16, targetRect.top - tooltipHeight - padding);
      }
    } else {
      top = targetRect.top - tooltipHeight - padding;
      // If top goes off-screen, show below target
      if (top < 16) {
        top = Math.min(windowHeight - tooltipHeight - 16, targetRect.bottom + padding);
      }
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 50
    };
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      
      {/* Non-blocking Spotlight Overlay */}
      {targetRect && (
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-40 transition-opacity duration-300">
          <defs>
            <mask id="dormiqa-tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect 
                x={targetRect.left - 6} 
                y={targetRect.top - 6} 
                width={targetRect.width + 12} 
                height={targetRect.height + 12} 
                rx="16" 
                fill="black" 
              />
            </mask>
          </defs>
          <rect 
            x="0" 
            y="0" 
            width="100%" 
            height="100%" 
            fill="rgba(15, 23, 42, 0.65)" 
            mask="url(#dormiqa-tour-mask)" 
          />
        </svg>
      )}

      {/* Target Element Highlight Box Ring */}
      {targetRect && (
        <div 
          className="fixed z-40 border-2 border-emerald-500 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.6)] pointer-events-none transition-all duration-150 ease-out"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`
          }}
        />
      )}

      {/* Floating Interactive Tooltip Popover */}
      <div 
        className="pointer-events-auto bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 shadow-2xl border-2 border-emerald-500/80 space-y-3.5 animate-in fade-in zoom-in-95 duration-200"
        style={getTooltipStyle()}
      >
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              {step.icon || <Compass className="w-4 h-4" />}
            </div>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Guided Tour • Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>

          <button
            onClick={onSkip}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Close / Skip Guided Tour"
            aria-label="Close guided tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Title & Description */}
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white">
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
            className="text-xs font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 py-2 px-1 min-h-[40px] flex items-center cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-2 min-h-[40px] rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
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

