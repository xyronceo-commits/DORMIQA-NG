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
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [fcmEnabled, setFcmEnabled] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [isEnablingFcm, setIsEnablingFcm] = useState(false);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;
  const pinnedCount = notifications.filter(n => n.isPinned).length;

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(n => {
      // Filter by Category Type
      if (activeTab !== 'all' && n.type !== activeTab) return false;
      // Filter by Read / Unread status
      if (readFilter === 'unread' && n.read) return false;
      if (readFilter === 'read' && !n.read) return false;
      return true;
    })
    .sort((a, b) => {
      // Pinned items stay at the top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then sort by newest date
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
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'inspection':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'listing':
        return <Building2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-amber-600" />;
    }
  };

  const getNotificationBadgeColor = (type: NotificationType) => {
    switch (type) {
      case 'message':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'inspection':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'listing':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Slide-over Notification Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-neutral-200 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-emerald-500 text-neutral-950 font-black text-[10px] px-2 py-0.5 rounded-md">
                    {unreadCount} UNREAD
                  </span>
                )}
                {pinnedCount > 0 && (
                  <span className="bg-amber-400 text-neutral-950 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-0.5">
                    <Pin className="w-2.5 h-2.5 fill-neutral-950" /> {pinnedCount} PINNED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium">Real-time alerts for chats, tours & listings</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Push Permission Alert Banner */}
        {!fcmEnabled && (
          <div className="p-3.5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white border-b border-emerald-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block text-emerald-300">Enable Push Alerts</span>
                <span className="text-[10px] text-neutral-300 leading-tight">Get instant popups for agent replies & new lodges</span>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={isEnablingFcm}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold rounded-lg text-[11px] shrink-0 transition-all shadow-xs"
            >
              {isEnablingFcm ? 'Enabling...' : 'Allow Push'}
            </button>
          </div>
        )}

        {/* Status Filter Sub-Bar (Unread vs Read) */}
        <div className="px-4 py-2 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3 text-emerald-400" /> Read Status:
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setReadFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                readFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-2xs'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setReadFilter('unread')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                readFilter === 'unread'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <CircleDot className="w-3 h-3 text-amber-500" />
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setReadFilter('read')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                readFilter === 'read'
                  ? 'bg-slate-200 text-slate-900 shadow-2xs'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Read ({readCount})
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-xs overflow-x-auto shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                activeTab === 'all'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setActiveTab('message')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                activeTab === 'message'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => setActiveTab('inspection')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                activeTab === 'inspection'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              Tours
            </button>
            <button
              onClick={() => setActiveTab('listing')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                activeTab === 'listing'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              Listings
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 py-2 border-b border-neutral-100 bg-white flex items-center justify-between text-[11px] shrink-0">
          <span className="text-neutral-500 font-semibold">
            Showing {filteredNotifications.length} of {notifications.length}
          </span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-emerald-700 hover:text-emerald-900 font-extrabold flex items-center gap-1 hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Notification Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-12 h-12 bg-neutral-100 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-neutral-800">No Notifications Match</h4>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                {readFilter !== 'all' || activeTab !== 'all' 
                  ? 'No notifications match your active filters. Try switching tabs or clearing filters.'
                  : 'You will receive real-time notifications here when agents message you, inspection statuses update, or new lodges are listed near campus.'}
              </p>
              {(readFilter !== 'all' || activeTab !== 'all') && (
                <button
                  onClick={() => {
                    setReadFilter('all');
                    setActiveTab('all');
                  }}
                  className="px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-black"
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
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30 shadow-xs'
                    : !notif.read
                    ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400 shadow-2xs'
                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                {/* Top badges bar */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {notif.isPinned && (
                      <span className="bg-amber-400 text-neutral-950 font-black text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider">
                        <Pin className="w-2.5 h-2.5 fill-neutral-950" /> Pinned
                      </span>
                    )}
                    {!notif.read && (
                      <span className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                        <CircleDot className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" /> Unread
                      </span>
                    )}
                  </div>

                  {/* Pin toggle button */}
                  {onTogglePin && (
                    <button
                      type="button"
                      title={notif.isPinned ? "Unpin notification" : "Pin to top of list"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(notif.id);
                      }}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        notif.isPinned
                          ? 'bg-amber-400 text-neutral-950 hover:bg-amber-500 shadow-2xs'
                          : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/70'
                      }`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${notif.isPinned ? 'fill-neutral-950 text-neutral-950' : ''}`} />
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl border shrink-0 ${getNotificationBadgeColor(notif.type)}`}>
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 pr-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <h4 className={`text-xs font-bold leading-snug ${!notif.read ? 'text-neutral-950 font-black' : 'text-neutral-800'}`}>
                      {notif.title}
                    </h4>

                    <p className="text-[11px] text-neutral-600 font-medium line-clamp-2 mt-1 leading-relaxed">
                      {notif.body}
                    </p>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800 group-hover:text-emerald-950">
                      <span>View details</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-center text-[10px] text-neutral-500 font-medium">
          Dormiqa FCM Real-time Notification Engine • Firebase Cloud Sync
        </div>
      </div>
    </div>
  );
};

