import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  ShieldCheck, 
  Scale, 
  HelpCircle, 
  Building2, 
  ChevronRight, 
  Printer, 
  FileText, 
  AlertTriangle,
  ArrowLeft,
  Mail,
  Check,
  ExternalLink
} from 'lucide-react';
import { INFO_PAGES_DATA, INFO_PAGE_CATEGORIES, InfoPageDoc } from '../data/infoPagesData';

interface InfoPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDocId?: string;
  onNavigateToOnboarding?: () => void;
}

export const InfoPagesModal: React.FC<InfoPagesModalProps> = ({
  isOpen,
  onClose,
  defaultDocId = 'terms-and-conditions',
  onNavigateToOnboarding
}) => {
  const [activeDocId, setActiveDocId] = useState<string>(defaultDocId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

  // Sync defaultDocId when modal opens with a specific document ID
  React.useEffect(() => {
    if (defaultDocId && INFO_PAGES_DATA[defaultDocId]) {
      setActiveDocId(defaultDocId);
    }
  }, [defaultDocId, isOpen]);

  const activeDoc: InfoPageDoc = useMemo(() => {
    return INFO_PAGES_DATA[activeDocId] || INFO_PAGES_DATA['terms-and-conditions'];
  }, [activeDocId]);

  // Filter documents based on search query or selected category filter
  const filteredDocsList = useMemo(() => {
    return Object.values(INFO_PAGES_DATA).filter((doc) => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesQuery = searchQuery.trim() === '' || 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.sections.some(s => s.heading.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'legal': return <Scale className="w-4 h-4" />;
      case 'trust': return <ShieldCheck className="w-4 h-4" />;
      case 'support': return <HelpCircle className="w-4 h-4" />;
      case 'company': return <Building2 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.origin + '?doc=' + activeDocId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200">
        
        {/* Top Header Bar */}
        <div className="bg-neutral-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/favicon-white.svg" alt="Dormiqa White Logo" className="h-7 w-auto object-contain shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-base sm:text-lg text-white">DORMIQA</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-emerald-400 px-2 py-0.5 rounded-md border border-neutral-700">
                  Documentation & Legal
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Official Policies, Trust Standards & Company Resources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print document"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Mobile Bar */}
        <div className="bg-neutral-50 px-4 sm:px-6 py-3 border-b border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search terms, policy rules, FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'all' 
                  ? 'bg-neutral-900 text-white' 
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              All Docs
            </button>
            {INFO_PAGE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id 
                    ? 'bg-neutral-900 text-white' 
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Main Content Body: Sidebar + Main Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-80 bg-neutral-50/80 border-r border-neutral-200 overflow-y-auto shrink-0 p-3 sm:p-4 space-y-4 max-h-[35vh] md:max-h-full border-b md:border-b-0">
            {INFO_PAGE_CATEGORIES.map((category) => {
              const categoryDocs = filteredDocsList.filter(d => d.category === category.id);
              if (categoryDocs.length === 0 && selectedCategory !== 'all') return null;

              return (
                <div key={category.id} className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 text-neutral-700">
                      {getCategoryIcon(category.id)}
                      <span>{category.label}</span>
                    </div>
                    <span className="bg-neutral-200 text-neutral-600 px-1.5 py-0.2 rounded-md text-[10px]">
                      {categoryDocs.length}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {categoryDocs.map((doc) => {
                      const isActive = doc.id === activeDocId;
                      return (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setActiveDocId(doc.id);
                            setFeedbackSent(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${
                            isActive 
                              ? 'bg-neutral-900 text-white font-bold shadow-xs' 
                              : 'text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-900'
                          }`}
                        >
                          <span className="truncate pr-2">{doc.title}</span>
                          {doc.badge && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                              isActive 
                                ? 'bg-emerald-500/20 text-emerald-300' 
                                : 'bg-neutral-200 text-neutral-600 group-hover:bg-neutral-300'
                            }`}>
                              {doc.badge === 'Coming Soon' ? 'Soon' : 'Core'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredDocsList.length === 0 && (
              <div className="p-4 text-center text-neutral-500 text-xs">
                No documentation matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Right Main Document Viewer Pane */}
          <div className="flex-1 bg-white overflow-y-auto p-4 sm:p-8 space-y-6">
            
            {/* Breadcrumb & Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                <span>Dormiqa</span>
                <ChevronRight className="w-3 h-3 text-neutral-400" />
                <span className="text-neutral-700">{activeDoc.categoryLabel}</span>
                <ChevronRight className="w-3 h-3 text-neutral-400" />
                <span className="text-neutral-900 font-bold">{activeDoc.title}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-400 font-medium">
                  Last updated: {activeDoc.lastUpdated}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-all flex items-center gap-1"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Link Copied!' : 'Share'}</span>
                </button>
              </div>
            </div>

            {/* Document Title Header */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  {activeDoc.title}
                </h1>
                {activeDoc.badge && (
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {activeDoc.badge}
                  </span>
                )}
              </div>

              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-normal bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
                {activeDoc.summary}
              </p>
            </div>

            {/* Important Notice Callout Box */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-300 text-black text-xs sm:text-sm space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-black">
                <AlertTriangle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Intermediary Platform Notice</span>
              </div>
              <p className="text-neutral-700 leading-relaxed">
                Dormiqa is an independent technology venue connecting tertiary institution students directly with verified property hosts and caretakers. Dormiqa does not own, rent, manage, or process payments for accommodation. All rental agreements and payments are made directly between the student and the agent/landlord.
              </p>
            </div>

            {/* Document Sections */}
            <div className="space-y-6 pt-2">
              {activeDoc.sections.map((sec, idx) => (
                <div key={idx} className="space-y-3 border-b border-neutral-100 pb-6 last:border-b-0">
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                    <span>{sec.heading}</span>
                  </h2>

                  {Array.isArray(sec.content) ? (
                    <div className="space-y-2">
                      {sec.content.map((p, pIdx) => (
                        <p key={pIdx} className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                      {sec.content}
                    </p>
                  )}

                  {sec.subpoints && sec.subpoints.length > 0 && (
                    <ul className="space-y-2 pt-1 pl-2">
                      {sec.subpoints.map((sub, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2 text-xs sm:text-sm text-neutral-700 leading-relaxed">
                          <span className="text-emerald-600 font-bold mt-0.5">•</span>
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Document Footer: Was this helpful & Support Navigation */}
            <div className="pt-8 border-t border-neutral-200 space-y-4">
              <div className="bg-neutral-50 p-4 sm:p-6 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900">Was this document clear and helpful?</h4>
                  <p className="text-xs text-neutral-500">Your feedback helps us continuously refine our campus policies.</p>
                </div>

                {feedbackSent ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Thank you for your feedback!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFeedbackSent(true)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-bold text-xs shadow-xs transition-colors"
                    >
                      👍 Yes
                    </button>
                    <button
                      onClick={() => setFeedbackSent(true)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-bold text-xs shadow-xs transition-colors"
                    >
                      👎 Needs Clarity
                    </button>
                  </div>
                )}
              </div>

              {/* Need Assistance Action Banner */}
              <div className="bg-neutral-900 text-white p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-bold text-sm sm:text-base">Have questions regarding this policy?</h4>
                  <p className="text-xs text-neutral-400">Our Legal & Support Team is available to assist students and agents.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveDocId('contact-us');
                      setFeedbackSent(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Contact Support</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveDocId('faq');
                      setFeedbackSent(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors"
                  >
                    View FAQ
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
