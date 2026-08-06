import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Search, 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  Building2, 
  MapPin, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Sliders, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { University, Listing } from '../types';
import { fetchAIRecommendations, sendAIChat } from '../services/api';

interface AISearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  universities: University[];
  selectedUniversityId: string;
  allListings: Listing[];
  onSelectListing: (listing: Listing) => void;
}

export const AISearchModal: React.FC<AISearchModalProps> = ({
  isOpen,
  onClose,
  universities,
  selectedUniversityId,
  allListings,
  onSelectListing
}) => {
  const [activeTab, setActiveTab] = useState<'recommend' | 'chat'>('recommend');
  const [selectedModel, setSelectedModel] = useState<string>('auto');

  // AI Recommendation State
  const [uniId, setUniId] = useState(selectedUniversityId);
  const [budget, setBudget] = useState<number>(350000);
  const [maxWalk, setMaxWalk] = useState<number>(15);
  const [propertyType, setPropertyType] = useState<string>('all');
  const [lifestyleNotes, setLifestyleNotes] = useState<string>('');
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendResults, setRecommendResults] = useState<{
    summaryAdvice?: string;
    matchedListingIds?: string[];
    matchReasons?: Array<{ listingId: string; reason: string; matchScorePercentage: number }>;
  } | null>(null);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your Campora AI Housing Assistant. Ask me anything about finding student lodges, lease contracts, caution deposits, or campus neighborhood safety!',
      time: 'Just now'
    }
  ]);
  const [chatError, setChatError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUni = universities.find(u => u.id === uniId);

  const handleGetRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecommending(true);
    setRecommendError(null);

    try {
      const res = await fetchAIRecommendations({
        universityId: uniId === 'all' ? undefined : uniId,
        universityName: currentUni?.name,
        budget: budget,
        maxWalkingMinutes: maxWalk,
        propertyType: propertyType === 'all' ? undefined : propertyType,
        preferenceText: lifestyleNotes,
        preferredModel: selectedModel
      });

      setRecommendResults({
        summaryAdvice: res.summaryAdvice,
        matchedListingIds: res.matchedListingIds,
        matchReasons: res.matchReasons
      });
    } catch (err: any) {
      console.error('Recommendation fetch error:', err);
      setRecommendError(err.message || 'Unable to connect to AI recommendations. Ensure API key is configured in Settings.');
    } finally {
      setIsRecommending(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userText = chatInput.trim();
    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatMessages(prev => [...prev, { sender: 'user', text: userText, time: userTime }]);
    setChatInput('');
    setIsChatting(true);
    setChatError(null);

    try {
      const history = chatMessages.map(m => ({ sender: m.sender === 'user' ? 'Student' : 'Campora AI', text: m.text }));
      const res = await sendAIChat({
        userMessage: userText,
        universityName: currentUni?.name,
        conversationHistory: history,
        preferredModel: selectedModel
      });

      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [...prev, { sender: 'ai', text: res.reply || 'Here to assist you!', time: aiTime }]);
    } catch (err: any) {
      console.error('Chat AI error:', err);
      setChatError(err.message || 'AI service unavailable.');
    } finally {
      setIsChatting(false);
    }
  };

  // Find matched listings objects
  const matchedListings = (recommendResults?.matchedListingIds || [])
    .map(id => allListings.find(l => l.id === id))
    .filter(Boolean) as Listing[];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Campora AI Assistant</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Multi-Model Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">Smart housing recommendations & campus accommodation chatbot</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model Selector Dropdown */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-emerald-300 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="auto" className="bg-slate-900 text-white">Auto (GPT-OSS / Qwen / Gemini)</option>
                <option value="openai/gpt-oss-120b" className="bg-slate-900 text-white">OpenAI GPT-OSS 120B</option>
                <option value="qwen/qwen3.6-27b" className="bg-slate-900 text-white">Qwen 3.6 27B</option>
                <option value="gemini-3.6-flash" className="bg-slate-900 text-white">Google Gemini 3.6 Flash</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Model selector bar */}
        <div className="sm:hidden px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Selected AI Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-900 text-emerald-300 font-bold text-xs px-2 py-1 rounded-lg border border-slate-800 focus:outline-none"
          >
            <option value="auto">Auto (GPT-OSS / Qwen / Gemini)</option>
            <option value="openai/gpt-oss-120b">OpenAI GPT-OSS 120B</option>
            <option value="qwen/qwen3.6-27b">Qwen 3.6 27B</option>
            <option value="gemini-3.6-flash">Google Gemini 3.6 Flash</option>
          </select>
        </div>

        {/* Tab Switcher */}
        <div className="bg-neutral-100 p-1.5 border-b border-neutral-200 flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('recommend')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'recommend'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            AI Search Recommendations
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Bot className="w-4 h-4 text-teal-600" />
            AI Student Housing Chatbot
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6 bg-neutral-50">
          
          {/* TAB 1: AI RECOMMENDATIONS */}
          {activeTab === 'recommend' && (
            <div className="space-y-6">
              
              <form onSubmit={handleGetRecommendations} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
                <h4 className="text-xs font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-600" /> Specify Your Ideal Campus Living Preferences
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-neutral-700 font-bold mb-1">Target Campus</label>
                    <select
                      value={uniId}
                      onChange={(e) => setUniId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-neutral-50 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">All Nigerian Campuses</option>
                      {universities.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-bold mb-1">Max Annual Budget (₦)</label>
                    <input
                      type="number"
                      step={25000}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-neutral-50 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. 400000"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-bold mb-1">Max Walking Distance (Minutes to Campus)</label>
                    <select
                      value={maxWalk}
                      onChange={(e) => setMaxWalk(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-neutral-50 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={5}>Within 5 Mins Walk</option>
                      <option value={10}>Within 10 Mins Walk</option>
                      <option value={15}>Within 15 Mins Walk</option>
                      <option value={25}>Within 25 Mins Walk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-bold mb-1">Property Type</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-neutral-50 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Any Room / Flat Type</option>
                      <option value="single_room">Single Self-Contained Room</option>
                      <option value="shared">Shared Room / Flatmate</option>
                      <option value="apartment">1-2 Bedroom Student Flat</option>
                      <option value="hotel_suite">Executive Student Suite</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Lifestyle & Facilities Preference (Optional)</label>
                  <textarea
                    rows={2}
                    value={lifestyleNotes}
                    onChange={(e) => setLifestyleNotes(e.target.value)}
                    placeholder="e.g. Need constant water supply, borehole, prepay meter, quiet study area, close to main gate..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-neutral-50 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRecommending}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  {isRecommending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing available listings with Gemini AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Smart Recommendations
                    </>
                  )}
                </button>
              </form>

              {recommendError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-bold">Recommendation Generation Issue</p>
                    <p className="mt-0.5">{recommendError}</p>
                  </div>
                </div>
              )}

              {/* Recommendation Output Results */}
              {recommendResults && (
                <div className="space-y-4 animate-in fade-in">
                  
                  {recommendResults.summaryAdvice && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-emerald-800 uppercase tracking-wide text-[10px]">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Gemini AI Accommodation Insight
                      </div>
                      <p className="font-semibold leading-relaxed">{recommendResults.summaryAdvice}</p>
                    </div>
                  )}

                  <h4 className="text-xs font-black uppercase text-neutral-500 tracking-wider">
                    Top AI Matches ({matchedListings.length})
                  </h4>

                  {matchedListings.length === 0 ? (
                    <div className="p-6 bg-white rounded-2xl border border-neutral-200 text-center space-y-2">
                      <Building2 className="w-8 h-8 text-neutral-300 mx-auto" />
                      <p className="text-xs font-bold text-neutral-700">No Listings Match Current Parameters</p>
                      <p className="text-[11px] text-neutral-500">Try adjusting your annual budget or selecting a broader property type.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {matchedListings.map((listing) => {
                        const reasonObj = recommendResults.matchReasons?.find(r => r.listingId === listing.id);
                        return (
                          <div 
                            key={listing.id}
                            onClick={() => {
                              onSelectListing(listing);
                              onClose();
                            }}
                            className="bg-white p-4 rounded-2xl border border-neutral-200 hover:border-emerald-500 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <img 
                                src={listing.photos[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=400&q=80'} 
                                alt={listing.title}
                                className="w-20 h-20 rounded-xl object-cover shrink-0 border border-neutral-200"
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                                    {reasonObj?.matchScorePercentage || 92}% Match Score
                                  </span>
                                  {listing.isVerified && (
                                    <span className="text-[10px] font-bold text-neutral-600 flex items-center gap-0.5">
                                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                                    </span>
                                  )}
                                </div>

                                <h5 className="font-extrabold text-neutral-900 text-sm group-hover:text-emerald-700 transition-colors">
                                  {listing.title}
                                </h5>

                                <p className="text-xs text-neutral-500 flex items-center gap-2">
                                  <span>₦{listing.pricePerWeek.toLocaleString()}/yr</span> • 
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-3 h-3 text-amber-500" /> {listing.walkingDistanceMinutes} mins walk
                                  </span>
                                </p>

                                {reasonObj && (
                                  <p className="text-[11px] text-emerald-900 bg-emerald-50/80 p-2 rounded-xl font-medium border border-emerald-100">
                                    💡 <strong>Gemini Reason:</strong> {reasonObj.reason}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button className="px-3.5 py-2 bg-slate-900 text-white font-extrabold text-xs rounded-xl group-hover:bg-black transition-all flex items-center gap-1 shrink-0">
                              View Lodge <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* TAB 2: AI HOUSING CHATBOT */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[480px] bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              
              {/* Chat messages list */}
              <div className="p-4 overflow-y-auto flex-1 space-y-3.5 bg-neutral-50">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      msg.sender === 'user' 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {msg.sender === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-[80%] rounded-2xl p-3.5 text-xs shadow-2xs space-y-1 ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-none'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-[9px] text-right font-medium ${
                        msg.sender === 'user' ? 'text-slate-400' : 'text-neutral-400'
                      }`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}

                {isChatting && (
                  <div className="flex items-center gap-2 text-xs text-neutral-500 p-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Gemini AI is crafting response...</span>
                  </div>
                )}

                {chatError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                    {chatError}
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-neutral-200 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about accommodation fees, agreement terms, UNILAG/UNIBEN/UI lodges..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatting}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <span className="flex items-center gap-1 font-semibold text-neutral-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Safe & Verified Campus Data
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs rounded-xl transition-all"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
