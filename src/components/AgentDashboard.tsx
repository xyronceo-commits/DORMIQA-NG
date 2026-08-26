import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ShieldCheck, 
  Calendar, 
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
  Edit3
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
  activeTab?: 'availability' | 'schedule' | 'requests' | 'profile';
  onTabChange?: (tab: 'availability' | 'schedule' | 'requests' | 'profile') => void;
  accounts: User[];
  activeAccountId: string;
  onSignOut: () => void;
  onDeleteAccount: (accountId: string) => void;
  onListingUpdate?: (updatedListing: Listing) => void;
  onOpenListingDetail?: (listing: Listing) => void;
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
  onOpenListingDetail
}) => {
  const [internalTab, setInternalTab] = useState<'availability' | 'schedule' | 'requests' | 'profile'>(activeTab);
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

  const currentTab = activeTab || internalTab;

  const setTab = (t: 'availability' | 'schedule' | 'requests' | 'profile') => {
    setInternalTab(t);
    if (onTabChange) onTabChange(t);
  };

  const handleStatusChange = async (inspId: string, status: string) => {
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
      console.error('Failed to update status:', err);
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
  const pendingVerificationCount = agentListings.filter(l => l.status === 'pending' || l.status === 'in_review').length;
  const studentEnquiriesCount = agentConversations.length;

  // Mock Recent Activity Feed
  const recentActivities = [
    { id: '1', title: 'Hostel information updated', desc: 'Peace Haven Hostel price & vacancy details modified', time: '10 mins ago', type: 'update' },
    { id: '2', title: 'New student enquiry received', desc: 'Direct chat opened for UNIOSUN Osogbo campus accommodation', time: '1 hour ago', type: 'enquiry' },
    { id: '3', title: 'Hostel submitted for verification', desc: 'Documents and property details pending coordinator check', time: '3 hours ago', type: 'verification' },
    { id: '4', title: 'Inspection booking confirmed', desc: 'Student tour confirmed for tomorrow at 2:00 PM', time: 'Yesterday', type: 'inspection' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      
      {/* ==========================================
          HEADER: WELCOME & PRIMARY ACTIONS
         ========================================== */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Welcome back, {activeUser?.name || auth.currentUser?.displayName || 'Agent'}
            </h1>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Manage your student accommodation listings and keep your properties up to date.
          </p>
        </div>

        {/* Primary CTA & Secondary Action */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenAddModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 font-bold" />
            <span>Add Hostel</span>
          </button>
          
          <button
            onClick={() => setTab('availability')}
            className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
          >
            <span>View Listings</span>
          </button>
        </div>
      </div>

      {/* ==========================================
          OVERVIEW: STATISTICS CARDS
         ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: My Hostels */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block">
            My Hostels
          </span>
          <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            {totalHostels}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Active properties listed
          </p>
        </div>

        {/* Card 2: Available Rooms */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block">
            Available Rooms
          </span>
          <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            {availableRoomsCount}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Vacant & ready for move-in
          </p>
        </div>

        {/* Card 3: Pending Verification */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block">
            Pending Verification
          </span>
          <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            {pendingVerificationCount}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Awaiting campus review
          </p>
        </div>

        {/* Card 4: Student Enquiries */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block">
            Student Enquiries
          </span>
          <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            {studentEnquiriesCount}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Active conversations
          </p>
        </div>
      </div>

      {/* ==========================================
          PORTAL NAVIGATION TABS
         ========================================== */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        <button
          onClick={() => setTab('availability')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 px-3 whitespace-nowrap cursor-pointer ${
            currentTab === 'availability'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>My Hostels ({agentListings.length})</span>
        </button>

        <button
          onClick={() => setTab('schedule')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 px-3 whitespace-nowrap cursor-pointer ${
            currentTab === 'schedule'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendar & Tours ({agentInspections.length})</span>
        </button>

        <button
          onClick={() => setTab('requests')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 px-3 whitespace-nowrap cursor-pointer ${
            currentTab === 'requests'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Student Messages ({agentConversations.length})</span>
        </button>

        <button
          onClick={() => setTab('profile')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 px-3 whitespace-nowrap cursor-pointer ${
            currentTab === 'profile'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Agent Profile</span>
        </button>
      </div>

      {/* ==========================================
          SECTION: MY HOSTELS LIST & MANAGEMENT
         ========================================== */}
      {currentTab === 'availability' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                My Hostels
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Manage property details, room availability, and student rental pricing.
              </p>
            </div>
            
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hostel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentListings.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs col-span-full space-y-3">
                <Building2 className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto" />
                <p className="font-bold text-neutral-900 dark:text-white text-base">No hostels listed yet.</p>
                <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  Add your student hostel properties to start receiving inspection bookings and direct enquiries.
                </p>
                <button 
                  onClick={onOpenAddModal} 
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  + Add Hostel
                </button>
              </div>
            ) : (
              agentListings.map((item) => {
                const status = item.unitStatus || propertyAvailability[item.id] || 'vacant';
                const isApproved = item.status === 'approved' || item.status === 'verified';
                const isPending = item.status === 'pending' || item.status === 'in_review';

                return (
                  <div key={item.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col justify-between shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                    <div>
                      {/* Property Image & Status Indicators */}
                      <div className="relative aspect-16/9 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <img 
                          src={item.photos[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'} 
                          alt={item.title} 
                          className="w-full h-full object-cover" 
                        />
                        
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
                          {/* Conventional Verification Status Indicator */}
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md text-white backdrop-blur-md shadow-xs flex items-center gap-1.5 ${
                            isApproved 
                              ? 'bg-emerald-700/90' 
                              : isPending 
                              ? 'bg-amber-600/90' 
                              : 'bg-rose-600/90'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            {isApproved ? 'Verified' : isPending ? 'Pending Verification' : 'Needs Review'}
                          </span>

                          {/* Availability Indicator */}
                          <span className={`text-[11px] font-medium px-2 py-1 rounded-md text-white backdrop-blur-md shadow-xs ${
                            status === 'vacant' ? 'bg-slate-900/80' :
                            status === 'remaining' ? 'bg-amber-900/80' :
                            status === 'under_renovation' ? 'bg-orange-900/80' : 'bg-rose-900/80'
                          }`}>
                            {status === 'vacant' ? 'Vacant' :
                             status === 'remaining' ? 'Partially Vacant' :
                             status === 'under_renovation' ? 'Renovation' : 'Occupied'}
                          </span>
                        </div>
                      </div>

                      {/* Hostel Info */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div>
                          <h3 className="font-bold text-neutral-900 dark:text-white text-base line-clamp-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span className="line-clamp-1">
                              {item.city || 'Osogbo'} • {item.distanceKm ? `${item.distanceKm} km` : item.walkingDistanceMinutes ? `${item.walkingDistanceMinutes} mins` : '1.4 km'} from {item.universityName || 'Campus'}
                            </span>
                          </p>
                        </div>

                        {/* Available Rooms & Price Range */}
                        <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl space-y-1.5 border border-neutral-100 dark:border-neutral-700/50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-500 dark:text-neutral-400">Available Rooms:</span>
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {item.vacanciesCount !== undefined ? `${item.vacanciesCount} rooms available` : status === 'vacant' ? '12 rooms available' : status === 'occupied' ? '0 rooms available' : '4 rooms available'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
                            <span className="text-neutral-500 dark:text-neutral-400">Price Range:</span>
                            <span className="font-extrabold text-neutral-900 dark:text-white">
                              ₦{(item.pricePerYear || 250000).toLocaleString()} – ₦{((item.pricePerYear || 250000) * 1.3).toLocaleString()} <span className="text-[11px] font-normal text-neutral-500">/ yr</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 sm:p-5 pt-0 flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (onOpenListingDetail) {
                            onOpenListingDetail(item);
                          }
                        }}
                        className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => setSelectedListingForEdit(item)}
                        className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          SECTION: RECENT ACTIVITY
         ========================================== */}
      {currentTab === 'availability' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Recent Activity
            </h3>
            <span className="text-xs text-neutral-400 font-medium">Real-time property log</span>
          </div>

          <div className="space-y-3">
            {recentActivities.map((act) => (
              <div 
                key={act.id}
                className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                    {act.type === 'update' && <Building2 className="w-4 h-4 text-blue-600" />}
                    {act.type === 'enquiry' && <MessageSquare className="w-4 h-4 text-purple-600" />}
                    {act.type === 'verification' && <ShieldCheck className="w-4 h-4 text-amber-600" />}
                    {act.type === 'inspection' && <Calendar className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">{act.title}</h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{act.desc}</p>
                  </div>
                </div>
                <span className="text-[11px] text-neutral-400 font-medium whitespace-nowrap shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          SECTION: CALENDAR & TOURS
         ========================================== */}
      {currentTab === 'schedule' && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Inspection Schedule & Tour Bookings
            </h2>
          </div>

          <div className="space-y-3">
            {agentInspections.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 text-xs">
                No inspection bookings scheduled yet.
              </div>
            ) : (
              agentInspections.map((insp) => (
                <div
                  key={insp.id}
                  className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img src={insp.listingPhoto} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white">{insp.studentName}</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">{insp.listingTitle}</p>
                      <p className="text-[11px] text-neutral-400">
                        Date: {insp.date} ({insp.timeSlot}) • {insp.studentPhone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {insp.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleStatusChange(insp.id, 'confirmed')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Approve Tour
                        </button>
                        <button
                          onClick={() => handleStatusChange(insp.id, 'cancelled')}
                          className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg hover:bg-neutral-300 transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 capitalize">
                        {insp.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          SECTION: STUDENT MESSAGES
         ========================================== */}
      {currentTab === 'requests' && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Student Messages & Enquiries
            </h2>
          </div>

          <div className="space-y-3">
            {agentConversations.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 text-xs">
                No active student conversations yet.
              </div>
            ) : (
              agentConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onOpenChat(conv)}
                  className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                      {conv.studentName ? conv.studentName.charAt(0) : 'S'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-neutral-900 dark:text-white text-sm truncate">{conv.studentName || 'Student'}</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">{conv.listingTitle}</p>
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 italic mt-0.5 line-clamp-1">"{conv.lastMessage}"</p>
                    </div>
                  </div>

                  <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shrink-0">
                    Reply
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          SECTION: AGENT PROFILE
         ========================================== */}
      {currentTab === 'profile' && (
        <AccountManager
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSignOut={onSignOut}
          onDeleteAccount={onDeleteAccount}
          currentRole="agent"
        />
      )}

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
