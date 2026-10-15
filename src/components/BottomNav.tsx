import React from 'react';
import { Home, Compass, Heart, MessageSquare, User } from 'lucide-react';

interface BottomNavProps {
  activeView: string;
  onNavigate: (view: 'landing' | 'search' | 'saved' | 'messages' | 'student-dash') => void;
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
      id: 'landing' as const,
      label: 'Home',
      icon: Home,
      badge: 0
    },
    {
      id: 'search' as const,
      label: 'Explore',
      icon: Compass,
      badge: 0
    },
    {
      id: 'saved' as const,
      label: 'Saved',
      icon: Heart,
      badge: savedCount
    },
    {
      id: 'messages' as const,
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadCount
    },
    {
      id: 'student-dash' as const,
      label: 'Profile',
      icon: User,
      badge: 0
    }
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-800 py-1.5 px-3 shadow-lg md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-black">
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
