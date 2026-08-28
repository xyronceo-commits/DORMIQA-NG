import React from 'react';
import { Compass, Heart, MessageSquare, User } from 'lucide-react';

interface BottomNavProps {
  activeView: string;
  onNavigate: (view: 'search' | 'saved' | 'messages' | 'student-dash') => void;
  savedCount?: number;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onNavigate,
  savedCount = 0,
  unreadCount = 0
}) => {
  const navItems = [
    {
      id: 'search',
      label: 'Discover',
      icon: Compass,
      badge: 0
    },
    {
      id: 'saved',
      label: 'Saved',
      icon: Heart,
      badge: savedCount
    },
    {
      id: 'messages',
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadCount
    },
    {
      id: 'student-dash',
      label: 'Profile',
      icon: User,
      badge: 0
    }
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 py-1.5 px-3 shadow-lg md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id || (item.id === 'search' && activeView === 'landing');

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
