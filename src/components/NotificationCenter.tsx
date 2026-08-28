import React, { useState } from 'react';
import { 
  Bell, 
  MessageSquare, 
  Calendar, 
  Building2, 
  Sparkles, 
  CheckCheck, 
  X, 
  ChevronRight, 
  BellRing, 
  Clock, 
  Trash2,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Pin,
  PinOff,
  Filter,
  CheckCircle2,
  CircleDot
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';
import { requestFCMPermission } from '../services/firebase';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectNotification: (notif: AppNotification) => void;
  onTogglePin?: (id: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectNotification,
  onTogglePin
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'message' | 'inspection' | 'listing'>('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [fcmEnabled, setFcmEnabled] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [isEnablingFcm, setIsEnablingFcm] = useState(false);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(n => {
      if (activeTab !== 'all' && n.type !== activeTab) return false;
      if (onlyUnread && n.read) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleEnablePush = async () => {
    setIsEnablingFcm(true);
    const token = await requestFCMPermission();
    if (token) {
      setFcmEnabled(true);
    }
    setIsEnablingFcm(false);
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'inspection':
        return <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'listing':
        return <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Slide-over Notification Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 h-full shadow-2xl flex flex-col z-10 border-l border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Messages, inspection requests & lodge updates</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enable Push Banner (Compact & Clean) */}
        {!fcmEnabled && (
          <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-900 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] text-emerald-900 dark:text-emerald-200 font-bold">Turn on instant push alerts</span>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={isEnablingFcm}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-[11px] shrink-0 transition-all cursor-pointer shadow-xs"
            >
              {isEnablingFcm ? 'Enabling...' : 'Allow'}
            </button>
          </div>
        )}

        {/* Clean Filter Tabs & Actions */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
            <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-xl shrink-0">
              {(['all', 'message', 'inspection', 'listing'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${
                    activeTab === tab
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'message' ? 'Messages' : tab === 'inspection' ? 'Tours' : 'Listings'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setOnlyUnread(!onlyUnread)}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                onlyUnread
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-2xs'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <CircleDot className="w-3 h-3 text-amber-600 fill-amber-600" />
              <span>Unread</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 px-1 font-medium">
            <span>{filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-neutral-400 hover:text-rose-600 font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notification Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="py-20 text-center space-y-3 px-4">
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">No notifications right now</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                {onlyUnread || activeTab !== 'all'
                  ? 'No notifications match your filter settings.'
                  : 'You will receive notifications here for tour bookings, chat messages, and new listings.'}
              </p>
              {(onlyUnread || activeTab !== 'all') && (
                <button
                  onClick={() => {
                    setOnlyUnread(false);
                    setActiveTab('all');
                  }}
                  className="px-3.5 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  onMarkAsRead(notif.id);
                  onSelectNotification(notif);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                  notif.isPinned
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-2xs'
                    : !notif.read
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 shadow-2xs'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`text-xs leading-snug truncate ${!notif.read ? 'text-neutral-950 dark:text-white font-extrabold' : 'text-neutral-800 dark:text-neutral-200 font-bold'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-neutral-400 shrink-0 font-medium">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-normal line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        )}
                        {notif.isPinned && (
                          <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5 fill-amber-500" /> Pinned
                          </span>
                        )}
                      </div>

                      {onTogglePin && (
                        <button
                          type="button"
                          title={notif.isPinned ? "Unpin" : "Pin to top"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(notif.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                        >
                          <Pin className={`w-3.5 h-3.5 ${notif.isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-center text-[10px] text-neutral-400 font-medium">
          Dormiqa Notification Center
        </div>
      </div>
    </div>
  );
};

