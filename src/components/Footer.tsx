import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onSelectUniversity?: (uniId: string) => void;
  onOpenAgentPortal: () => void;
  onOpenOnboarding?: () => void;
  onOpenInfoPage?: (docId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  onOpenAgentPortal,
  onOpenOnboarding,
  onOpenInfoPage 
}) => {
  const handleDocClick = (docId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenInfoPage) {
      onOpenInfoPage(docId);
    }
  };

  return (
    <footer className="bg-white text-neutral-800 pt-10 pb-8 border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 pb-8 border-b border-neutral-200">
          
          {/* Col 1: Brand & Logo */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Dormiqa Map Pin Logo" className="h-7 w-auto object-contain shrink-0" />
              <span className="font-black text-xl tracking-tight text-neutral-900">
                DORMIQA
              </span>
            </div>
            <p className="text-neutral-500 text-xs leading-relaxed max-w-xs">
              Verified student accommodation technology platform connecting university students directly with verified caretakers near campus.
            </p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md w-fit border border-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Verified Campus Accommodation</span>
            </div>
          </div>

          {/* Col 2: Legal & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Legal & Policies
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 font-medium">
              <li>
                <a href="#terms-and-conditions" onClick={(e) => handleDocClick('terms-and-conditions', e)} className="hover:text-black transition-colors">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="#privacy-policy" onClick={(e) => handleDocClick('privacy-policy', e)} className="hover:text-black transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#cookie-policy" onClick={(e) => handleDocClick('cookie-policy', e)} className="hover:text-black transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#agent-terms" onClick={(e) => handleDocClick('agent-terms', e)} className="hover:text-black transition-colors">
                  Agent Terms
                </a>
              </li>
              <li>
                <a href="#student-terms" onClick={(e) => handleDocClick('student-terms', e)} className="hover:text-black transition-colors">
                  Student Terms
                </a>
              </li>
              <li>
                <a href="#acceptable-use-policy" onClick={(e) => handleDocClick('acceptable-use-policy', e)} className="hover:text-black transition-colors">
                  Acceptable Use Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Trust & Safety */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Trust & Safety
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 font-medium">
              <li>
                <a href="#verification-policy" onClick={(e) => handleDocClick('verification-policy', e)} className="hover:text-black transition-colors font-bold text-emerald-700">
                  Verification Policy
                </a>
              </li>
              <li>
                <a href="#anti-fraud-policy" onClick={(e) => handleDocClick('anti-fraud-policy', e)} className="hover:text-rose-600 transition-colors font-semibold">
                  Anti-Fraud Policy
                </a>
              </li>
              <li>
                <a href="#listing-quality-guidelines" onClick={(e) => handleDocClick('listing-quality-guidelines', e)} className="hover:text-black transition-colors">
                  Listing Quality Guidelines
                </a>
              </li>
              <li>
                <a href="#review-policy" onClick={(e) => handleDocClick('review-policy', e)} className="hover:text-black transition-colors">
                  Review & Rating Policy
                </a>
              </li>
              <li>
                <a href="#report-abuse-policy" onClick={(e) => handleDocClick('report-abuse-policy', e)} className="hover:text-black transition-colors">
                  Report Abuse Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Support & Help
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 font-medium">
              <li>
                <a href="#help-centre" onClick={(e) => handleDocClick('help-centre', e)} className="hover:text-black transition-colors">
                  Help Centre
                </a>
              </li>
              <li>
                <a href="#faq" onClick={(e) => handleDocClick('faq', e)} className="hover:text-black transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="#contact-us" onClick={(e) => handleDocClick('contact-us', e)} className="hover:text-black transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#report-a-problem" onClick={(e) => handleDocClick('report-a-problem', e)} className="hover:text-rose-600 transition-colors">
                  Report a Problem
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 font-medium">
              <li>
                <a href="#about-dormiqa" onClick={(e) => handleDocClick('about-dormiqa', e)} className="hover:text-black transition-colors">
                  About Dormiqa
                </a>
              </li>
              <li>
                <a href="#how-dormiqa-works" onClick={(e) => handleDocClick('how-dormiqa-works', e)} className="hover:text-black transition-colors">
                  How Dormiqa Works
                </a>
              </li>
              <li>
                <button 
                  onClick={onOpenOnboarding || onOpenAgentPortal} 
                  className="hover:text-black transition-colors text-emerald-700 font-bold flex items-center gap-1 text-left"
                >
                  <span>Become an Agent</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </li>
              <li>
                <a href="#careers" onClick={(e) => handleDocClick('careers', e)} className="hover:text-black transition-colors flex items-center gap-1">
                  <span>Careers</span>
                  <span className="text-[9px] bg-neutral-200 text-neutral-600 px-1 py-0.2 rounded font-bold">Soon</span>
                </a>
              </li>
              <li>
                <a href="#press-kit" onClick={(e) => handleDocClick('press-kit', e)} className="hover:text-black transition-colors flex items-center gap-1">
                  <span>Press Kit</span>
                  <span className="text-[9px] bg-neutral-200 text-neutral-600 px-1 py-0.2 rounded font-bold">Soon</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>© 2026 Dormiqa Technologies Limited. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-medium">
            <a href="#privacy-policy" onClick={(e) => handleDocClick('privacy-policy', e)} className="hover:text-neutral-800 transition-colors">Privacy Policy</a>
            <a href="#terms-and-conditions" onClick={(e) => handleDocClick('terms-and-conditions', e)} className="hover:text-neutral-800 transition-colors">Terms of Service</a>
            <a href="#verification-policy" onClick={(e) => handleDocClick('verification-policy', e)} className="hover:text-neutral-800 transition-colors">Verification Standards</a>
            <a href="#disclaimer" onClick={(e) => handleDocClick('disclaimer', e)} className="hover:text-neutral-800 transition-colors">Disclaimer</a>
          </div>
        </div>

      </div>
    </footer>
  );
};



