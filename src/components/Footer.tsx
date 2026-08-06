import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onSelectUniversity?: (uniId: string) => void;
  onOpenAgentPortal: () => void;
  onOpenOnboarding?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  onOpenAgentPortal,
  onOpenOnboarding 
}) => {
  return (
    <footer className="bg-white text-neutral-800 pt-10 pb-8 border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-neutral-200">
          
          {/* Col 1: Brand & Logo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white font-black text-base flex items-center justify-center shadow-xs">
                C
              </div>
              <span className="font-black text-xl tracking-tight text-neutral-900">
                CAMPORA
              </span>
            </div>
            <p className="text-neutral-500 text-xs leading-relaxed max-w-xs">
              Verified student housing marketplace connecting students directly with verified property hosts and caretakers near campus.
            </p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md w-fit border border-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Verified Campus Accommodations</span>
            </div>
          </div>

          {/* Col 2: For Students Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              For Students
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 font-medium">
              <li>
                <a href="#how-it-works" className="hover:text-black transition-colors">
                  How Walking Radius Search Works
                </a>
              </li>
              <li>
                <a href="#report" className="hover:text-rose-600 transition-colors">
                  Report Fake Listing or Scam
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-black transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: For Agents Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              For Agents
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 font-medium">
              <li>
                <button 
                  onClick={onOpenOnboarding || onOpenAgentPortal} 
                  className="hover:text-black transition-colors text-emerald-700 font-bold flex items-center gap-1"
                >
                  <span>Become a Verified Property Agent</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </li>
              <li>
                <a href="#trust" className="hover:text-black transition-colors">
                  CAC & ID Verification Policy
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-black transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>© 2026 Campora Student Housing Technologies. All rights reserved.</p>
          <div className="flex items-center gap-6 font-medium">
            <a href="#privacy" className="hover:text-neutral-800 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-neutral-800 transition-colors">Terms of Service</a>
            <a href="#trust" className="hover:text-neutral-800 transition-colors">Verification Standards</a>
          </div>
        </div>

      </div>
    </footer>
  );
};


