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
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-200 py-1.5 px-3 md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-emerald-700 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
