import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ShieldCheck, 
  Calendar as CalendarIcon, 
  Eye, 
  MessageSquare, 
  Building2, 
  CheckCircle2, 
  Clock, 
  User as UserIcon,
  AlertCircle,
  Activity,
  MapPin,
  Check,
  Edit3,
  Bell,
  Menu,
  Shield,
  Search,
  ChevronRight
} from 'lucide-react';
import { Listing, Inspection, Conversation, User } from '../types';
import { updateInspectionStatus, fetchInspections, fetchConversations, updateListingStatusAndSales } from '../services/api';
import { sendNotification } from '../services/notificationService';
import { auth } from '../services/firebase';
import { EditUnitStatusAndSalesModal } from './EditUnitStatusAndSalesModal';
import { AgentProfilePage } from './AgentProfilePage';
import { AgentCalendarPage } from './AgentCalendarPage';
import { AgentBottomNav, AgentNavView } from './AgentBottomNav';
import { ThemeToggle } from './ThemeToggle';

interface AgentDashboardProps {
  listings: Listing[];
  inspections: Inspection[];
  conversations: Conversation[];
  onOpenAddModal: () => void;
  onOpenChat: (conv: Conversation) => void;
  activeTab?: 'availability' | 'schedule' | 'requests' | 'profile';
  onTabChange?: (tab: 'availability' | 'schedule' | 'requests' | 'profile') => void;
  accounts: User[];
  activeAccountId: string;
  onSignOut: () => void;
  onDeleteAccount: (accountId: string) => void;
  onListingUpdate?: (updatedListing: Listing) => void;
  onOpenListingDetail?: (listing: Listing) => void;
  onOpenNotificationCenter?: () => void;
  onOpenAdminAccess?: () => void;
  onOpenInfoPage?: (docId: string) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  listings,
  inspections,
  conversations,
  onOpenAddModal,
  onOpenChat,
  activeTab = 'availability',
  onTabChange,
  accounts,
  activeAccountId,
  onSignOut,
  onDeleteAccount,
  onListingUpdate,
  onOpenListingDetail,
  onOpenNotificationCenter,
  onOpenAdminAccess,
  onOpenInfoPage
}) => {
  const [activeNav, setActiveNav] = useState<AgentNavView>('home');
  const [localInspections, setLocalInspections] = useState(inspections);
  const [localConversations, setLocalConversations] = useState(conversations);
  const [selectedListingForEdit, setSelectedListingForEdit] = useState<Listing | null>(null);

  const [propertyAvailability, setPropertyAvailability] = useState<Record<string, 'vacant' | 'occupied' | 'under_renovation' | 'remaining'>>(() => {
    const map: Record<string, 'vacant' | 'occupied' | 'under_renovation' | 'remaining'> = {};
    listings.forEach(l => {
      map[l.id] = l.unitStatus || 'vacant';
    });
    return map;
  });

  // Real-time sync for inspections & messages
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [freshInsps, freshConvs] = await Promise.all([
          fetchInspections({ agentId: activeAccountId }),
          fetchConversations(activeAccountId)
        ]);
        setLocalInspections(freshInsps);
        setLocalConversations(freshConvs);
      } catch (err) {
        console.error('Real-time agent sync error:', err);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [activeAccountId]);

  useEffect(() => {
    setLocalInspections(inspections);
  }, [inspections]);

  useEffect(() => {
    setLocalConversations(conversations);
  }, [conversations]);

  const handleInspectionStatusUpdate = async (inspId: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      await updateInspectionStatus(inspId, status);
      const updatedInsp = localInspections.find(i => i.id === inspId);
      setLocalInspections(prev => prev.map(i => i.id === inspId ? { ...i, status: status as any } : i));

      if (updatedInsp) {
        sendNotification({
          userId: updatedInsp.studentId,
          title: `Inspection Status: ${status.toUpperCase()}`,
          body: `Agent marked your tour for "${updatedInsp.listingTitle}" as ${status.toUpperCase()}.`,
          type: 'inspection',
          metadata: {
            inspectionId: inspId,
            listingId: updatedInsp.listingId
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeUser = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const currentAgentUid = activeAccountId || auth.currentUser?.uid;
  const agentListings = listings.filter(l => Boolean(currentAgentUid && l.agentId === currentAgentUid));
  const agentInspections = localInspections.filter(i => Boolean(currentAgentUid && i.agentId === currentAgentUid));
  const agentConversations = localConversations.filter(c => Boolean(currentAgentUid && c.agentId === currentAgentUid));

  // Statistics calculations
  const totalHostels = agentListings.length;
  const availableRoomsCount = agentListings.reduce((sum, item) => {
    if (item.vacanciesCount !== undefined) return sum + item.vacanciesCount;
    const st = item.unitStatus || propertyAvailability[item.id] || 'vacant';
    return sum + (st === 'vacant' ? 12 : st === 'remaining' ? 4 : 0);
  }, 0);
  const enquiriesCount = agentConversations.length;
  const inspectionsCount = agentInspections.length;

  // Recent Activity Feed
  const recentActivities = [
    { id: '1', title: 'Hostel information updated', desc: 'Price & vacancy details modified', time: '10 mins ago', type: 'update' },
    { id: '2', title: 'New student enquiry received', desc: 'Direct chat opened for campus accommodation', time: '1 hour ago', type: 'enquiry' },
    { id: '3', title: 'Hostel submitted for verification', desc: 'Property details under review by coordinator', time: '3 hours ago', type: 'verification' },
    { id: '4', title: 'Inspection booking confirmed', desc: 'Student tour confirmed for tomorrow', time: 'Yesterday', type: 'inspection' }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20 md:pb-8 text-neutral-900 dark:text-neutral-100">
      
      {/* ==========================================
          HEADER: LOGO & CONTROLS
         ========================================== */}
      <header className="sticky top-0 z-30 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Dormiqa" className="h-7 sm:h-8 w-auto object-contain" />
            <span className="font-extrabold text-xl tracking-tight text-neutral-900 dark:text-white">
              DORMIQA
            </span>
            <span className="hidden sm:inline-block text-[11px] font-bold text-neutral-500 border-l border-neutral-200 dark:border-neutral-800 pl-3">
              Agent Workspace
            </span>
          </div>

          {/* Navigation Items (Desktop) */}
          <div className="hidden md:flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
            {[
              { id: 'home', label: 'Home' },
              { id: 'hostels', label: `My Hostels (${agentListings.length})` },
              { id: 'inbox', label: `Inbox (${agentConversations.length})` },
              { id: 'calendar', label: `Calendar (${agentInspections.length})` },
              { id: 'profile', label: 'Profile' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveNav(tab.id as AgentNavView)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === tab.id
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle variant="dropdown" />

            {onOpenAdminAccess && (
              <button
                onClick={onOpenAdminAccess}
                className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                title="Admin Security Access"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onOpenNotificationCenter}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================
          MAIN CONTAINER
         ========================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* 1. HOME VIEW */}
        {activeNav === 'home' && (
          <div className="space-y-6">
            
            {/* Welcome Banner */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                    Welcome back, {activeUser?.name || auth.currentUser?.displayName || 'Agent'}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Verified Caretaker
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                  Manage your hostels and accommodation listings.
                </p>
              </div>

              <button
                onClick={onOpenAddModal}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Hostel</span>
              </button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => setActiveNav('hostels')}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-1 shadow-2xs cursor-pointer hover:border-neutral-300 transition-all"
              >
                <span className="text-xs font-bold text-neutral-500 block">My Hostels</span>
                <p className="text-3xl font-black text-neutral-900 dark:text-white">{totalHostels}</p>
                <p className="text-[11px] text-neutral-400">Active listings</p>
              </div>

              <div 
                onClick={() => setActiveNav('hostels')}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-1 shadow-2xs cursor-pointer hover:border-neutral-300 transition-all"
              >
                <span className="text-xs font-bold text-neutral-500 block">Available Rooms</span>
                <p className="text-3xl font-black text-neutral-900 dark:text-white">{availableRoomsCount}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Ready for move-in</p>
              </div>

              <div 
                onClick={() => setActiveNav('inbox')}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-1 shadow-2xs cursor-pointer hover:border-neutral-300 transition-all"
              >
                <span className="text-xs font-bold text-neutral-500 block">Enquiries</span>
                <p className="text-3xl font-black text-neutral-900 dark:text-white">{enquiriesCount}</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">Student chats</p>
              </div>

              <div 
                onClick={() => setActiveNav('calendar')}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-1 shadow-2xs cursor-pointer hover:border-neutral-300 transition-all"
              >
                <span className="text-xs font-bold text-neutral-500 block">Inspections</span>
                <p className="text-3xl font-black text-neutral-900 dark:text-white">{inspectionsCount}</p>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">Tour bookings</p>
              </div>
            </div>

            {/* My Hostels Recent Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-neutral-900 dark:text-white">
                  My Hostels
                </h2>
                <button
                  onClick={() => setActiveNav('hostels')}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Hostels ({agentListings.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {agentListings.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs space-y-3">
                  <Building2 className="w-10 h-10 text-neutral-300 mx-auto" />
                  <p className="font-bold text-neutral-900 dark:text-white text-sm">No hostels listed yet.</p>
                  <button 
                    onClick={onOpenAddModal} 
                    className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                  >
                    + Add Hostel
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agentListings.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-2xs space-y-3 hover:border-neutral-300 transition-all"
                    >
                      <div className="aspect-video rounded-2xl overflow-hidden relative">
                        <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 bg-slate-900/90 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                          {item.vacanciesCount} Rooms Available
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-neutral-900 dark:text-white line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-neutral-400" />
                          <span>{item.address || 'Campus Area'}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="font-black text-neutral-900 dark:text-white">₦{item.pricePerYear?.toLocaleString()} / yr</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenListingDetail && onOpenListingDetail(item)}
                            className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-[11px] font-bold rounded-lg cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setSelectedListingForEdit(item)}
                            className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Log */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xs">
              <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Recent Activity
              </h3>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {recentActivities.map(act => (
                  <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-neutral-900 dark:text-white block">{act.title}</span>
                      <span className="text-neutral-500 block text-[11px]">{act.desc}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-bold">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 2. MY HOSTELS VIEW */}
        {activeNav === 'hostels' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-neutral-900 dark:text-white">My Hostels</h1>
                <p className="text-xs text-neutral-500">Manage property listings, room availability & pricing.</p>
              </div>

              <button
                onClick={onOpenAddModal}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Hostel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agentListings.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs col-span-full space-y-3">
                  <Building2 className="w-10 h-10 text-neutral-300 mx-auto" />
                  <p className="font-bold text-neutral-900 dark:text-white text-base">No hostels listed yet.</p>
                  <button 
                    onClick={onOpenAddModal} 
                    className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    + Add Hostel
                  </button>
                </div>
              ) : (
                agentListings.map(item => (
                  <div key={item.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-2xs space-y-4">
                    <div className="aspect-video rounded-2xl overflow-hidden relative">
                      <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                        {item.vacanciesCount} Rooms Available
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-neutral-900 dark:text-white">{item.title}</h3>
                      <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{item.address}</span>
                      </p>
                    </div>

                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Price:</span>
                        <span className="font-black text-neutral-900 dark:text-white">₦{item.pricePerYear?.toLocaleString()} / yr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Status:</span>
                        <span className="font-bold text-emerald-600">Active Listing ✓</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onOpenListingDetail && onOpenListingDetail(item)}
                        className="flex-1 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setSelectedListingForEdit(item)}
                        className="flex-1 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. INBOX VIEW */}
        {activeNav === 'inbox' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Chats & Enquiries</h1>

            {agentConversations.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-neutral-400 text-xs space-y-2">
                <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="font-bold text-neutral-800 dark:text-neutral-200">No student enquiries yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agentConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => onOpenChat(conv)}
                    className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs">
                        {conv.studentName ? conv.studentName.charAt(0) : 'S'}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-neutral-900 dark:text-white">{conv.studentName || 'Student'}</h4>
                        <p className="text-[11px] text-neutral-500 font-medium">{conv.listingTitle}</p>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 italic mt-0.5">"{conv.lastMessage}"</p>
                      </div>
                    </div>

                    <button className="px-3.5 py-1.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl">
                      Reply
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. CALENDAR VIEW */}
        {activeNav === 'calendar' && (
          <AgentCalendarPage
            inspections={agentInspections}
            listings={agentListings}
            onUpdateInspectionStatus={handleInspectionStatusUpdate}
          />
        )}

        {/* 5. PROFILE VIEW */}
        {activeNav === 'profile' && (
          <AgentProfilePage
            user={activeUser}
            hostelsCount={agentListings.length}
            chatsCount={agentConversations.length}
            inspectionsCount={agentInspections.length}
            onNavigateSection={(sec) => {
              if (sec === 'hostels') setActiveNav('hostels');
              if (sec === 'inbox') setActiveNav('inbox');
              if (sec === 'calendar') setActiveNav('calendar');
            }}
            onSignOut={onSignOut}
            onOpenInfoPage={onOpenInfoPage}
          />
        )}

      </main>

      {/* ==========================================
          MOBILE BOTTOM NAVIGATION BAR
         ========================================== */}
      <AgentBottomNav
        activeNav={activeNav}
        onNavigate={(view) => setActiveNav(view)}
        unreadInboxCount={agentConversations.length}
        pendingInspectionCount={agentInspections.filter(i => i.status === 'pending').length}
      />

      {/* Edit Listing Modal */}
      {selectedListingForEdit && (
        <EditUnitStatusAndSalesModal
          listing={selectedListingForEdit}
          isOpen={!!selectedListingForEdit}
          onClose={() => setSelectedListingForEdit(null)}
          onListingUpdated={(updated) => {
            if (onListingUpdate) {
              onListingUpdate(updated);
            }
          }}
        />
      )}

    </div>
  );
};
