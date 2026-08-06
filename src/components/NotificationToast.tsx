import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  MessageSquare, 
  Calendar, 
  Building2, 
  X, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';

interface NotificationToastProps {
  notification: AppNotification | null;
  onClose: () => void;
  onClick: (notif: AppNotification) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onClick
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [notification]);

  if (!notification) return null;

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'inspection':
        return <Calendar className="w-5 h-5 text-purple-600" />;
      case 'listing':
        return <Building2 className="w-5 h-5 text-emerald-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div
      className={`fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 transition-all duration-300 transform ${
        visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
          {getIcon(notification.type)}
        </div>

        <div className="flex-1 pr-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              {notification.type} ALERT
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Just now</span>
          </div>

          <h4 className="text-xs font-black text-white leading-snug">
            {notification.title}
          </h4>

          <p className="text-[11px] text-slate-300 font-medium line-clamp-2 mt-1 leading-relaxed">
            {notification.body}
          </p>

          <button
            onClick={() => {
              setVisible(false);
              onClick(notification);
            }}
            className="mt-2.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
          >
            Open details <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
