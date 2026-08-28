import React from 'react';
import { Home, Building2, MessageSquare, User as UserIcon } from 'lucide-react';

export type AgentNavView = 'home' | 'hostels' | 'inbox' | 'calendar' | 'profile';

interface AgentBottomNavProps {
  activeNav: AgentNavView;
  onNavigate: (view: AgentNavView) => void;
  unreadInboxCount?: number;
  pendingInspectionCount?: number;
}

export const AgentBottomNav: React.FC<AgentBottomNavProps> = ({
  activeNav,
  onNavigate,
  unreadInboxCount = 0,
  pendingInspectionCount = 0
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-2 py-2 shadow-lg">
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {/* 1. Home */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-colors cursor-pointer ${
            activeNav === 'home'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
          }`}
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* 2. Hostels */}
        <button
          onClick={() => onNavigate('hostels')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-colors cursor-pointer ${
            activeNav === 'hostels'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
          }`}
        >
          <Building2 className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Hostels</span>
        </button>

        {/* 3. Inbox */}
        <button
          onClick={() => onNavigate('inbox')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-colors cursor-pointer ${
            activeNav === 'inbox'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Inbox</span>
          {unreadInboxCount > 0 && (
            <span className="absolute top-1 right-3.5 w-4 h-4 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {unreadInboxCount > 9 ? '9+' : unreadInboxCount}
            </span>
          )}
        </button>

        {/* 4. Profile */}
        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-colors cursor-pointer ${
            activeNav === 'profile'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
          }`}
        >
          <UserIcon className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Profile</span>
        </button>
      </div>
    </div>
  );
};
