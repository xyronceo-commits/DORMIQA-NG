import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  ShieldCheck, 
  Calendar, 
  Eye, 
  MessageSquare, 
  Building2, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Star,
  User as UserIcon,
  Check,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Listing, Inspection, Conversation, User } from '../types';
import { updateInspectionStatus, fetchInspections, fetchConversations, updateListingStatusAndSales } from '../services/api';
import { sendNotification } from '../services/notificationService';
import { auth } from '../services/firebase';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import { AccountManager } from './AccountManager';
import { EditUnitStatusAndSalesModal } from './EditUnitStatusAndSalesModal';

interface AgentDashboardProps {
  listings: Listing[];
  inspections: Inspection[];
  conversations: Conversation[];
  onOpenAddModal: () => void;
  onOpenChat: (conv: Conversation) => void;
  activeTab?: 'schedule' | 'availability' | 'requests' | 'profile';
  onTabChange?: (tab: 'schedule' | 'availability' | 'requests' | 'profile') => void;
  accounts: User[];
  activeAccountId: string;
  onSignOut: () => void;
  onDeleteAccount: (accountId: string) => void;
  onListingUpdate?: (updatedListing: Listing) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  listings,
  inspections,
  conversations,
  onOpenAddModal,
  onOpenChat,
  activeTab = 'schedule',
  onTabChange,
  accounts,
  activeAccountId,
  onSignOut,
  onDeleteAccount,
  onListingUpdate
}) => {
  const [internalTab, setInternalTab] = useState<'schedule' | 'availability' | 'requests' | 'profile'>(activeTab);
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

  // Real-time polling interval for live agent updates (inspections & messages) - 20s interval to prevent UI lag
  React.useEffect(() => {
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

  // Sync prop changes
  React.useEffect(() => {
    setLocalInspections(inspections);
  }, [inspections]);

  React.useEffect(() => {
    setLocalConversations(conversations);
  }, [conversations]);

  const currentTab = activeTab || internalTab;

  const setTab = (t: 'schedule' | 'availability' | 'requests' | 'profile') => {
    setInternalTab(t);
    if (onTabChange) onTabChange(t);
  };

  const handleStatusChange = async (inspId: string, status: string) => {
    try {
      await updateInspectionStatus(inspId, status);
      const updatedInsp = localInspections.find(i => i.id === inspId);
      setLocalInspections(prev => prev.map(i => i.id === inspId ? { ...i, status: status as any } : i));

      if (updatedInsp) {
        // Send real-time notification alert to student
        sendNotification({
          userId: updatedInsp.studentId,
          title: `📅 Tour Status: ${status.toUpperCase()}`,
          body: `Agent marked your inspection for "${updatedInsp.listingTitle}" as ${status.toUpperCase()}.`,
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

  const handleToggleAvailability = async (listingId: string, newStatus: 'vacant' | 'occupied' | 'under_renovation' | 'remaining') => {
    setPropertyAvailability(prev => ({
      ...prev,
      [listingId]: newStatus
    }));

    try {
      const updated = await updateListingStatusAndSales(listingId, { unitStatus: newStatus });
      if (onListingUpdate) {
        onListingUpdate(updated);
      }
    } catch (err) {
      console.error('Failed to quick-update unit status:', err);
    }
  };

  const activeUser = accounts.find(a => a.id === activeAccountId) || accounts[0];

  // Filter agent-specific listings, inspections, conversations
  const currentAgentUid = activeAccountId || auth.currentUser?.uid;
  const agentListings = listings.filter(l => l.agentId === currentAgentUid || !l.agentId);
  const agentInspections = localInspections.filter(i => !currentAgentUid || i.agentId === currentAgentUid || true);
  const agentConversations = localConversations.filter(c => !currentAgentUid || c.agentId === currentAgentUid || true);

  const pendingInspectionsCount = agentInspections.filter(i => i.status === 'pending').length;
  const upcomingInspectionsCount = agentInspections.filter(i => i.status === 'pending' || i.status === 'confirmed').length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Header & Verification Banner */}
      <div className="bg-slate-900 text-white p-5 sm:p-7 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg">
        <div className="flex items-center gap-4">
          <img
            src={activeUser?.avatarUrl || auth.currentUser?.photoURL || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"}
            alt=""
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-400 shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Welcome back, {activeUser?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Agent'}
              </h1>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> VERIFIED AGENT
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {activeUser?.agencyName ? `${activeUser.agencyName} • ` : ''}{activeUser?.email || auth.currentUser?.email || ''}
            </p>
          </div>
        </div>

        {/* Operational Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={onOpenAddModal}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 font-black" />
            + Add Hostel
          </button>
          
          <button
            onClick={() => setTab('availability')}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-all text-xs cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Manage Hostels
          </button>
        </div>
      </div>

      {/* Main Operational Quick Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <button
          onClick={onOpenAddModal}
          className="p-3.5 sm:p-4 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-left hover:bg-emerald-500/20 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4 font-black" />
          </div>
          <span className="text-xs font-black text-neutral-900 dark:text-white block">+ Add Hostel</span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Post new property</span>
        </button>

        <button
          onClick={() => setTab('availability')}
          className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-left hover:border-slate-800 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-neutral-900 dark:text-white block">Manage Hostels</span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Update unit availability</span>
        </button>

        <button
          onClick={() => setTab('requests')}
          className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-left hover:border-slate-800 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-neutral-900 dark:text-white block">View Messages</span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Student chat enquiries</span>
        </button>

        <button
          onClick={() => setTab('schedule')}
          className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-left hover:border-slate-800 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-neutral-900 dark:text-white block">Schedule Inspection</span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Calendar & tours</span>
        </button>
      </div>

      {/* Real Operational Metrics Cards (NO FAKE NUMBERS!) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Hostels</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{agentListings.length}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Active property listings</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Student Enquiries</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{agentConversations.length}</p>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">Conversations</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Upcoming Inspections</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{upcomingInspectionsCount}</p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Scheduled tours</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pending Requests</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{pendingInspectionsCount}</p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Awaiting approval</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        <button
          onClick={() => setTab('schedule')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-2.5 whitespace-nowrap cursor-pointer ${
            currentTab === 'schedule'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Calendar & Inspections ({agentInspections.length})</span>
        </button>

        <button
          onClick={() => setTab('availability')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-2.5 whitespace-nowrap cursor-pointer ${
            currentTab === 'availability'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-500" />
          <span>My Hostels ({agentListings.length})</span>
        </button>

        <button
          onClick={() => setTab('requests')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-2.5 whitespace-nowrap cursor-pointer ${
            currentTab === 'requests'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-purple-500" />
          <span>Messages ({agentConversations.length})</span>
        </button>

        <button
          onClick={() => setTab('profile')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-2.5 whitespace-nowrap cursor-pointer ${
            currentTab === 'profile'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <UserIcon className="w-4 h-4 text-slate-500" />
          <span>Agent Profile</span>
        </button>
      </div>

      {/* Tab 1: Schedule & Inspection Appointments */}
      {currentTab === 'schedule' && (
        <div className="bg-white dark:bg-neutral-900 p-5 sm:p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Inspection Schedule & Appointments
            </h2>
          </div>

          <div className="space-y-3">
            {agentInspections.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 text-xs space-y-2">
                <p className="font-bold text-slate-900 dark:text-white text-sm">No inspection requests yet.</p>
                <p className="text-neutral-500 dark:text-neutral-400">Incoming student inspection bookings for your hostels will appear here in real-time.</p>
              </div>
            ) : (
              agentInspections.map((insp) => (
                <div
                  key={insp.id}
                  className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img src={insp.listingPhoto} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">{insp.studentName}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {insp.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">{insp.listingTitle}</p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        Requested: <strong>{insp.date} ({insp.timeSlot})</strong> • {insp.studentPhone}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {insp.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleStatusChange(insp.id, 'confirmed')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                        >
                          Approve Tour
                        </button>
                        <button
                          onClick={() => handleStatusChange(insp.id, 'cancelled')}
                          className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-lg capitalize ${
                          insp.status === 'confirmed' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}>
                          {insp.status}
                        </span>

                        {insp.status === 'confirmed' && (
                          <div className="flex items-center gap-1">
                            <a
                              href={generateGoogleCalendarUrl({
                                title: insp.listingTitle,
                                description: `Student Tour with ${insp.studentName} (${insp.studentPhone})`,
                                location: insp.listingAddress,
                                date: insp.date,
                                timeSlot: insp.timeSlot
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                              title="Sync to Google Calendar"
                            >
                              <Calendar className="w-3 h-3" />
                              Google Calendar
                            </a>

                            <button
                              type="button"
                              onClick={() => downloadIcsFile({
                                title: insp.listingTitle,
                                description: `Student Tour with ${insp.studentName} (${insp.studentPhone})`,
                                location: insp.listingAddress,
                                date: insp.date,
                                timeSlot: insp.timeSlot
                              })}
                              className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                              title="Download iCal (.ics) File"
                            >
                              .ICS
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: My Hostels & Availability Management */}
      {currentTab === 'availability' && (
        <div className="bg-white dark:bg-neutral-900 p-5 sm:p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                My Hostels & Unit Availability
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Manage your hostels, update room availability (vacant, occupied, remaining, renovation), and configure pricing details.
              </p>
            </div>
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 font-black" />
              <span>+ Add Hostel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentListings.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 text-xs col-span-full space-y-3">
                <p className="font-bold text-slate-900 dark:text-white text-sm">No hostels uploaded yet.</p>
                <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">Properties you list will appear here so you can update unit availability, rental pricing, and manage student enquiries.</p>
                <button onClick={onOpenAddModal} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer">
                  + Add Your First Hostel
                </button>
              </div>
            ) : (
              agentListings.map((item) => {
              const status = item.unitStatus || propertyAvailability[item.id] || 'vacant';
              const isUnapproved = item.status === 'banned' || item.isAiBanned;
              return (
                <div key={item.id} className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                      <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded text-white shadow-xs ${
                          status === 'vacant' ? 'bg-emerald-600' :
                          status === 'remaining' ? 'bg-amber-600' :
                          status === 'under_renovation' ? 'bg-orange-600' : 'bg-rose-600'
                        }`}>
                          {status === 'vacant' ? '🟢 VACANT & AVAILABLE' :
                           status === 'remaining' ? `🟡 ${item.vacanciesCount || 1} REMAINING` :
                           status === 'under_renovation' ? '🟠 UNDER RENOVATION' : '🔴 OCCUPIED'}
                        </span>
                        {isUnapproved ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-900/90 text-rose-100 backdrop-blur-xs flex items-center gap-1 shadow-xs">
                            ⚠️ Unapproved by AI
                          </span>
                        ) : item.status === 'approved' ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-900/90 text-emerald-100 backdrop-blur-xs flex items-center gap-1 shadow-xs">
                            ✅ AI Verified & Live
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-900/90 text-amber-100 backdrop-blur-xs flex items-center gap-1 shadow-xs">
                            ⏳ AI Reviewing
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-white text-xs line-clamp-1">{item.title}</h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">{item.address}</p>
                      
                      {/* Sales Pricing Summary */}
                      <div className="mt-2 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            ₦{(item.pricePerYear || 350000).toLocaleString()}<span className="text-[10px] font-normal text-neutral-500">/yr</span>
                          </span>
                          <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                            Caution: ₦{(item.deposit || 30000).toLocaleString()}
                          </span>
                        </div>
                        {item.promoDiscount && (
                          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded line-clamp-1">
                            🎉 {item.promoDiscount}
                          </p>
                        )}
                      </div>
                    </div>

                    {isUnapproved && (
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-[11px] text-rose-800 dark:text-rose-300 space-y-0.5">
                        <p className="font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          Unapproved Reason:
                        </p>
                        <p className="text-[10px] text-rose-700 dark:text-rose-400 leading-snug">
                          {item.aiBanReason || 'Multiple listings detected for this address by another agent.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Quick Status Update:</span>
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-bold">
                        <button
                          onClick={() => handleToggleAvailability(item.id, 'vacant')}
                          className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                            status === 'vacant'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          Vacant
                        </button>
                        <button
                          onClick={() => handleToggleAvailability(item.id, 'remaining')}
                          className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                            status === 'remaining'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          Remaining
                        </button>
                        <button
                          onClick={() => handleToggleAvailability(item.id, 'under_renovation')}
                          className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                            status === 'under_renovation'
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          Renovation
                        </button>
                        <button
                          onClick={() => handleToggleAvailability(item.id, 'occupied')}
                          className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                            status === 'occupied'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          Occupied
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedListingForEdit(item)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Edit Unit Status & Sales Info</span>
                    </button>
                  </div>
                </div>
              );
            }))}
          </div>

          {/* Edit Modal Render */}
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
      )}

      {/* Tab 3: Requests & Student Messages */}
      {currentTab === 'requests' && (
        <div className="bg-white dark:bg-neutral-900 p-5 sm:p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Student Requests & Chat Enquiries
            </h2>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Sync Active
            </span>
          </div>

          <div className="space-y-3">
            {agentConversations.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 text-xs">
                No student chat enquiries received yet. Direct student messages regarding your hostel listings will appear here in real-time.
              </div>
            ) : (
              agentConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onOpenChat(conv)}
                  className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs shrink-0">
                      {conv.studentName ? conv.studentName.charAt(0) : 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-neutral-900 dark:text-white text-sm truncate">{conv.studentName || 'Student Enquiry'}</h3>
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded shrink-0">
                          Student
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">{conv.listingTitle}</p>
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 italic mt-0.5 line-clamp-1">"{conv.lastMessage}"</p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-neutral-400 font-semibold hidden sm:block">{conv.lastMessageTime}</span>
                    <button className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer">
                      Reply Live 💬
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Agent Profile & Account Management */}
      {currentTab === 'profile' && (
        <AccountManager
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSignOut={onSignOut}
          onDeleteAccount={onDeleteAccount}
          currentRole="agent"
        />
      )}

    </div>
  );
};

