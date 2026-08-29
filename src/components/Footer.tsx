import React from 'react';
import { ExternalLink, ShieldCheck, Mail } from 'lucide-react';

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
    <footer className="bg-white dark:bg-slate-950 text-neutral-800 dark:text-neutral-200 pt-8 pb-6 border-t border-neutral-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-6 border-b border-neutral-200 dark:border-slate-800">
          
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Dormiqa Logo" className="h-7 w-auto object-contain shrink-0" />
              <span className="font-black text-xl tracking-tight text-neutral-900 dark:text-white">
                DORMIQA
              </span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed max-w-sm">
              Verified student accommodation technology platform connecting university students directly with verified caretakers and lodge agents near campus.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 dark:bg-slate-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-slate-800 rounded-md text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Verified Campus Lodges</span>
              </span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
              <li>
                <a href="#how-dormiqa-works" onClick={(e) => handleDocClick('how-dormiqa-works', e)} className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  How Dormiqa Works
                </a>
              </li>
              <li>
                <button 
                  onClick={onOpenOnboarding || onOpenAgentPortal} 
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 text-left cursor-pointer"
                >
                  <span>Become an Agent</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </li>
              <li>
                <a href="#about-dormiqa" onClick={(e) => handleDocClick('about-dormiqa', e)} className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  About Us
                </a>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Support & Legal
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
              <li>
                <a href="#contact-us" onClick={(e) => handleDocClick('contact-us', e)} className="hover:text-neutral-900 dark:hover:text-white transition-colors font-bold text-emerald-700 dark:text-emerald-400">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#help-centre" onClick={(e) => handleDocClick('help-centre', e)} className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Help & FAQs
                </a>
              </li>
              <li>
                <a href="#terms-and-conditions" onClick={(e) => handleDocClick('terms-and-conditions', e)} className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#privacy-policy" onClick={(e) => handleDocClick('privacy-policy', e)} className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-3">
          <p>© 2026 Dormiqa Technologies Limited. All rights reserved.</p>
          <a href="mailto:dormiqa.ng@gmail.com" className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300">
            <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>dormiqa.ng@gmail.com</span>
          </a>
        </div>

      </div>
    </footer>
  );
};




