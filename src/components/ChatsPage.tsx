import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Search, ShieldCheck, Building2, ChevronRight } from 'lucide-react';
import { Conversation, UserRole } from '../types';

interface ChatsPageProps {
  conversations: Conversation[];
  onOpenChat: (conversation: Conversation) => void;
  onGoBack: () => void;
  currentRole: UserRole;
}

export const ChatsPage: React.FC<ChatsPageProps> = ({
  conversations,
  onOpenChat,
  onGoBack,
  currentRole
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const otherName = currentRole === 'student' ? c.agentName : c.studentName;
    return (
      otherName.toLowerCase().includes(q) ||
      c.listingTitle.toLowerCase().includes(q) ||
      (c.agencyName && c.agencyName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      
      {/* HEADER WITH GO BACK ICON */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onGoBack}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Agent Messages</span>
                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-extrabold px-2 py-0.5 rounded-full">
                  {conversations.length}
                </span>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-slate-400">Direct inquiries with verified caretakers & agents</p>
            </div>
          </div>

        </div>
      </header>

      {/* CONTENT BODY */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        
        {/* Search Bar */}
        {conversations.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations by agent or hostel..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {filteredConversations.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 p-8 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 rounded-full flex items-center justify-center mx-auto text-blue-500">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">No active chats</h2>
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                Inquire about any hostel by tapping "Chat with Agent" on the property details page.
              </p>
            </div>
            <button
              onClick={onGoBack}
              className="px-5 py-2.5 bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              Browse Accommodation
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 divide-y divide-neutral-100 dark:divide-slate-800/80 shadow-2xs overflow-hidden">
            {filteredConversations.map((conv) => {
              const otherAvatar = currentRole === 'student' ? conv.agentAvatar : conv.studentAvatar;
              const otherName = currentRole === 'student' ? conv.agentName : conv.studentName;

              return (
                <div
                  key={conv.id}
                  onClick={() => onOpenChat(conv)}
                  className="p-4 hover:bg-neutral-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={otherAvatar}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shrink-0 border border-neutral-200 dark:border-slate-700"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {otherName}
                        </h3>
                        {currentRole === 'student' && (
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Verified Caretaker" />
                        )}
                      </div>

                      {/* Associated Hostel Context Badge */}
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md w-fit max-w-full">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">Property: {conv.listingTitle}</span>
                      </div>

                      <p className="text-xs text-neutral-500 dark:text-slate-400 truncate italic">
                        "{conv.lastMessage || 'Click to open conversation'}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium text-neutral-400 dark:text-slate-500 hidden sm:inline">
                      {conv.lastMessageTime}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
};
