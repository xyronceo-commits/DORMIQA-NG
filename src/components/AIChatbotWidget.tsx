import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Loader2, 
  User as UserIcon, 
  HelpCircle, 
  Building2, 
  RefreshCw, 
  ChevronDown, 
  MessageSquare,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Listing } from '../types';
import { sendAIChat } from '../services/api';

interface AIChatbotWidgetProps {
  initialListingContext?: Listing | null;
  onClearListingContext?: () => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

const SUGGESTED_QUESTIONS = [
  "What caution deposits and agreement fees are standard for student lodges?",
  "How do I verify prepaid electricity meters and solar power before paying?",
  "What are the safest areas for night studies near UNILAG / UNIBEN / UI campuses?",
  "How do I negotiate rent and find a compatible flatmate on Campora?"
];

export const AIChatbotWidget: React.FC<AIChatbotWidgetProps> = ({
  initialListingContext,
  onClearListingContext,
  isOpenExternal,
  onCloseExternal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [listingContext, setListingContext] = useState<Listing | null>(initialListingContext || null);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your Campora AI Student Housing Advisor. How can I help you find safe, verified campus accommodation or answer questions about lease terms, deposits, and inspections today?',
      time: 'Just now'
    }
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync external open state if provided
  useEffect(() => {
    if (isOpenExternal !== undefined) {
      setIsOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  // Sync initial listing context if provided
  useEffect(() => {
    if (initialListingContext) {
      setListingContext(initialListingContext);
      setIsOpen(true);
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `I see you're looking at "${initialListingContext.title}" (${initialListingContext.universityName}, ₦${(initialListingContext.pricePerYear || 300000).toLocaleString()}/yr). What specific questions do you have about this lodge?`,
          time
        }
      ]);
    }
  }, [initialListingContext]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping, isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (onCloseExternal) onCloseExternal();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isTyping) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: query, time };

    setChatHistory(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);
    setErrorMsg(null);

    try {
      const historyPayload = chatHistory.map(m => ({
        sender: m.sender === 'user' ? 'Student' : 'Campora AI',
        text: m.text
      }));

      const res = await sendAIChat({
        userMessage: query,
        listingContext: listingContext ? {
          title: listingContext.title,
          address: listingContext.address,
          pricePerWeek: listingContext.pricePerWeek,
          universityName: listingContext.universityName
        } : undefined,
        universityName: listingContext?.universityName,
        conversationHistory: historyPayload
      });

      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'ai',
          text: res.reply || 'I am here to guide you with verified campus housing guidance.',
          time: aiTime
        }
      ]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || 'AI service temporarily unavailable.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    setChatHistory([
      {
        sender: 'ai',
        text: 'Chat reset. How else can I assist you with student lodges or lease agreements?',
        time: 'Just now'
      }
    ]);
    setErrorMsg(null);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      
      {/* Closed Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative px-4 py-3 bg-slate-900 hover:bg-black text-white rounded-full shadow-2xl border-2 border-emerald-400 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Open Campora AI Student Housing Assistant"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
            <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950 animate-spin-slow" />
          </div>
          <div className="text-left hidden sm:block pr-1">
            <p className="text-xs font-black tracking-tight text-white flex items-center gap-1">
              Campora AI
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </p>
            <p className="text-[10px] text-emerald-300 font-semibold">Campus Housing Chatbot</p>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Expanded Interactive Chatbot Drawer / Window */}
      {isOpen && (
        <div className="bg-white w-[92vw] sm:w-[420px] h-[560px] rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Chatbot Window Header */}
          <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                <Bot className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm tracking-tight text-white">Campora AI Assistant</h3>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Nigerian Universities Housing Advisor</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClearHistory}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Reset Chat History"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Close AI Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Listing Context Banner (if user came from a specific property) */}
          {listingContext && (
            <div className="px-3.5 py-2 bg-emerald-950 text-emerald-100 border-b border-emerald-800/80 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2 truncate pr-2">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate font-semibold text-[11px]">
                  Context: <strong className="text-white">{listingContext.title}</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  setListingContext(null);
                  if (onClearListingContext) onClearListingContext();
                }}
                className="text-[10px] font-bold text-emerald-300 hover:text-white underline shrink-0"
              >
                Clear
              </button>
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-neutral-50/80">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {msg.sender === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                </div>

                <div className={`max-w-[82%] rounded-2xl p-3 text-xs shadow-2xs space-y-1 ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-none'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[8px] text-right font-medium ${
                    msg.sender === 'user' ? 'text-slate-400' : 'text-neutral-400'
                  }`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-neutral-500 p-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span className="italic text-[11px]">Campora AI is thinking...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompt Chips (when conversation is short) */}
          {chatHistory.length <= 2 && (
            <div className="p-2.5 bg-white border-t border-neutral-200 shrink-0 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block px-1">
                Suggested Questions:
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q)}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-emerald-50 text-neutral-700 hover:text-emerald-900 border border-neutral-200 hover:border-emerald-300 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors shrink-0"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-neutral-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask AI about student lodges, lease terms..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

        </div>
      )}

    </div>
  );
};
