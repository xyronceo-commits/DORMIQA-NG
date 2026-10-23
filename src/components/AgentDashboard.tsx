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
  ChevronRight,
  MoreVertical,
  Trash2,
  Loader2
} from 'lucide-react';
import { Listing, Inspection, Conversation, User, University } from '../types';
import { updateInspectionStatus, fetchInspections, fetchConversations, updateListingStatusAndSales, deleteListing } from '../services/api';
import { sendNotification } from '../services/notificationService';
import { auth, db } from '../services/firebase';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { EditUnitStatusAndSalesModal } from './EditUnitStatusAndSalesModal';
import { normalizeListing } from '../utils/normalizeListing';
import { AgentProfilePage } from './AgentProfilePage';
import { AgentCalendarPage } from './AgentCalendarPage';
import { AgentBottomNav, AgentNavView } from './AgentBottomNav';
import { ThemeToggle } from './ThemeToggle';

interface AgentDashboardProps {
  listings: Listing[];
  inspections: Inspection[];
  conversations: Conversation[];
  universities?: University[];
  onOpenAddModal: () => void;
  onOpenChat: (conv: Conversation) => void;
  activeTab?: 'availability' | 'schedule' | 'requests' | 'profile';
  onTabChange?: (tab: 'availability' | 'schedule' | 'requests' | 'profile') => void;
  accounts: User[];
  activeAccountId: string;
  onSignOut: () => void;
  onDeleteAccount: (accountId: string) => void;
  onListingUpdate?: (updatedListing: Listing) => void;
  onListingDelete?: (listingId: string) => void;
  onOpenListingDetail?: (listing: Listing) => void;
  onOpenNotificationCenter?: () => void;
  onOpenAdminAccess?: () => void;
  onOpenInfoPage?: (docId: string) => void;
  onProfileUpdated?: (updated: User) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  listings,
  inspections,
  conversations,
  universities = [],
  onOpenAddModal,
  onOpenChat,
  activeTab = 'availability',
  onTabChange,
  accounts,
  activeAccountId,
  onSignOut,
  onDeleteAccount,
  onListingUpdate,
  onListingDelete,
  onOpenListingDetail,
  onOpenNotificationCenter,
  onOpenAdminAccess,
  onOpenInfoPage,
  onProfileUpdated
}) => {
  const [activeNav, setActiveNav] = useState<AgentNavView>('home');
  const [localInspections, setLocalInspections] = useState(inspections);
  const [localConversations, setLocalConversations] = useState(conversations);
  const [selectedListingForEdit, setSelectedListingForEdit] = useState<Listing | null>(null);
  
  // Compact 3-dot overflow menu & delete confirmation states
  const [openMenuListingId, setOpenMenuListingId] = useState<string | null>(null);
  const [confirmDeleteListing, setConfirmDeleteListing] = useState<Listing | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Close overflow menu when clicking outside
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.listing-action-menu-container')) {
        setOpenMenuListingId(null);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const [propertyAvailability, setPropertyAvailability] = useState<Record<string, 'vacant' | 'occupied' | 'under_renovation' | 'remaining'>>(() => {
    const map: Record<string, 'vacant' | 'occupied' | 'under_renovation' | 'remaining'> = {};
    listings.forEach(l => {
      map[l.id] = l.unitStatus || 'vacant';
    });
    return map;
  });

  // Real-time Firestore sync for inspections & conversations
  useEffect(() => {
    if (!activeAccountId) return;

    let unsubInsp = () => {};
    let unsubConv = () => {};

    try {
      const inspQuery = query(collection(db, 'inspections'), where('agentId', '==', activeAccountId));
      unsubInsp = onSnapshot(inspQuery, (snap) => {
        if (!snap.empty) {
          const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() } as Inspection));
          setLocalInspections(fresh);
        }
      }, (err) => console.warn('Inspections snapshot listener error:', err));

      const convQuery = query(collection(db, 'conversations'), where('agentId', '==', activeAccountId));
      unsubConv = onSnapshot(convQuery, (snap) => {
        if (!snap.empty) {
          const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
          setLocalConversations(fresh);
        }
      }, (err) => console.warn('Conversations snapshot listener error:', err));
    } catch (err) {
      console.warn('Real-time listener setup error:', err);
    }

    return () => {
      unsubInsp();
      unsubConv();
    };
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

  const [liveAgentUser, setLiveAgentUser] = useState<User | null>(null);
  const [liveAgentListings, setLiveAgentListings] = useState<Listing[]>([]);

  // Real-time Firestore listener for Agent User verification status & Agent's Listings
  useEffect(() => {
    const targetUid = activeAccountId || auth.currentUser?.uid;
    if (!targetUid) return;

    let unsubUserDoc = () => {};
    let unsubListings = () => {};

    try {
      // 1. Listen to Agent User Document in real-time
      const userRef = doc(db, 'users', targetUid);
      unsubUserDoc = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const uData = docSnap.data();
          setLiveAgentUser({
            id: docSnap.id,
            name: uData.name || uData.displayName || 'Agent',
            email: uData.email || '',
            role: 'agent',
            phone: uData.phone || '',
            avatar: uData.avatar || uData.photoURL || '',
            agencyName: uData.agencyName || uData.businessName || '',
            isVerifiedAgent: uData.isVerifiedAgent || uData.businessVerificationStatus === 'approved',
            businessVerificationStatus: uData.businessVerificationStatus || (uData.isVerifiedAgent ? 'approved' : 'pending'),
            rejectionReason: uData.rejectionReason,
            verificationStatus: uData.verificationStatus || uData.businessVerificationStatus
          } as unknown as User);
        }
      }, (err) => console.warn('Agent user doc snapshot listener error:', err));

      // 2. Listen to Agent's Property Listings in real-time
      const listingsCol = collection(db, 'listings');
      const q = query(listingsCol, where('agentId', '==', targetUid));
      unsubListings = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const freshListings: Listing[] = snap.docs.map(docSnap => {
            return normalizeListing(docSnap.data(), docSnap.id);
          });

          setLiveAgentListings(freshListings);
        }
      }, (err) => console.warn('Agent listings query snapshot listener error:', err));

    } catch (err) {
      console.warn('Real-time agent listeners setup error:', err);
    }

    return () => {
      unsubUserDoc();
      unsubListings();
    };
  }, [activeAccountId]);

  const baseUser = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const activeUser = liveAgentUser ? { ...baseUser, ...liveAgentUser } : baseUser;
  const currentAgentUid = activeAccountId || auth.currentUser?.uid;
  const allListings = liveAgentListings.length > 0 ? liveAgentListings : listings;
  const agentListings = allListings.filter(l => Boolean(currentAgentUid && (l.agentId === currentAgentUid || (l as any).userId === currentAgentUid)));
  const agentInspections = localInspections.filter(i => Boolean(currentAgentUid && i.agentId === currentAgentUid));
  const agentConversations = localConversations.filter(c => Boolean(currentAgentUid && c.agentId === currentAgentUid));

  const handleDeleteListing = async (target: Listing) => {
    if (isDeleting) return;
    if (target.agentId !== currentAgentUid && (target as any).userId !== currentAgentUid) {
      setActionFeedback({ type: 'error', message: 'You can only delete listings that you own.' });
      setConfirmDeleteListing(null);
      return;
    }

    setIsDeleting(true);
    setActionFeedback(null);

    try {
      await deleteListing(target.id);
      setLiveAgentListings(prev => prev.filter(l => l.id !== target.id));
      if (onListingDelete) {
        onListingDelete(target.id);
      }
      setActionFeedback({ type: 'success', message: `Listing "${target.title}" was successfully deleted.` });
      setConfirmDeleteListing(null);
    } catch (err: any) {
      console.error('Failed to delete listing:', err);
      setActionFeedback({ type: 'error', message: err?.message || 'Failed to delete listing. Please try again.' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Statistics calculations
  const totalHostels = agentListings.length;
  const availableRoomsCount = agentListings.reduce((sum, item) => {
    if (item.vacanciesCount !== undefined) return sum + item.vacanciesCount;
    const st = item.unitStatus || propertyAvailability[item.id] || 'vacant';
    return sum + (st === 'vacant' ? 12 : st === 'remaining' ? 4 : 0);
  }, 0);
  const enquiriesCount = agentConversations.length;
  const inspectionsCount = agentInspections.length;

  // Recent Activity Feed derived exclusively from real caretaker activity
  const recentActivities: Array<{ id: string; title: string; desc: string; time: string; type: string }> = [];
  agentInspections.slice(0, 3).forEach(ins => {
    recentActivities.push({
      id: `ins_${ins.id}`,
      title: 'Inspection booking',
      desc: `${ins.studentName || 'Student'} scheduled a tour for ${ins.listingTitle || 'hostel'}`,
      time: ins.date || 'Upcoming',
      type: 'inspection'
    });
  });
  agentListings.slice(0, 3).forEach(l => {
    recentActivities.push({
      id: `lst_${l.id}`,
      title: 'Property listing',
      desc: `${l.title || 'Hostel'} (${l.verificationStatus || l.status || 'active'})`,
      time: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Listed',
      type: 'verification'
    });
  });

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
                  {activeUser?.isVerifiedAgent || activeUser?.businessVerificationStatus === 'approved' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Verified Caretaker
                    </span>
                  ) : activeUser?.businessVerificationStatus === 'rejected' || (activeUser as any)?.verificationStatus === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      Verification Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Verification Pending
                    </span>
                  )}
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

            {/* Verification Alert Banner if Rejected */}
            {(activeUser?.businessVerificationStatus === 'rejected' || (activeUser as any)?.verificationStatus === 'rejected') && (
              <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-3xl p-5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-extrabold text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Agent Verification Rejected</span>
                </div>
                <p className="text-rose-700 dark:text-rose-300 font-medium">
                  <strong>Reason:</strong> {activeUser?.rejectionReason || (activeUser as any)?.rejectionReason || 'Submitted documents or business credentials require update.'}
                </p>
                <button
                  onClick={() => setActiveNav('profile')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer mt-1"
                >
                  Update & Resubmit Verification
                </button>
              </div>
            )}

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
                        {item.photos && item.photos.length > 0 ? (
                          <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center p-3 text-center text-neutral-400">
                            <Building2 className="w-8 h-8 stroke-[1.5]" />
                            <span className="text-xs font-bold text-neutral-500">0 Photos Uploaded</span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 bg-slate-900/90 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                          {item.vacanciesCount} Rooms Available
                        </span>
                        {item.status === 'approved' || item.verificationStatus === 'approved' || item.isVerified ? (
                          <span className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        ) : item.status === 'rejected' || item.verificationStatus === 'rejected' ? (
                          <span className="absolute top-2 right-2 bg-rose-600/90 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : ['draft', 'uploading', 'upload_failed', 'incomplete'].includes(item.status) ? (
                          <span className="absolute top-2 right-2 bg-neutral-600/90 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Upload incomplete
                          </span>
                        ) : (
                          <span className="absolute top-2 right-2 bg-amber-500/90 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Under Review
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-neutral-900 dark:text-white line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-neutral-400" />
                          <span>{item.address || 'Campus Area'}</span>
                        </p>
                        {(item.status === 'rejected' || item.verificationStatus === 'rejected') && item.rejectionReason && (
                          <div className="mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-medium">
                            <strong>Rejection Reason:</strong> {item.rejectionReason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="font-black text-neutral-900 dark:text-white">₦{item.pricePerYear?.toLocaleString()} / yr</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenListingDetail && onOpenListingDetail(item)}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95 border border-neutral-200/80 dark:border-neutral-700 shadow-2xs"
                            title="View Property Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => setSelectedListingForEdit(item)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs border border-emerald-600"
                            title="Edit Property & Pricing"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
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
                {recentActivities.length === 0 ? (
                  <div className="py-6 text-center text-xs text-neutral-400 font-medium">
                    No recent activity recorded yet.
                  </div>
                ) : (
                  recentActivities.map(act => (
                    <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-neutral-900 dark:text-white block">{act.title}</span>
                        <span className="text-neutral-500 block text-[11px]">{act.desc}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-bold">{act.time}</span>
                    </div>
                  ))
                )}
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
                      {item.photos && item.photos.length > 0 ? (
                        <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center p-3 text-center text-neutral-400">
                          <Building2 className="w-8 h-8 stroke-[1.5]" />
                          <span className="text-xs font-bold text-neutral-500">0 Photos Uploaded</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                        {item.vacanciesCount} Rooms Available
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <h3 className="text-base font-black text-neutral-900 dark:text-white truncate" title={item.title}>
                          {item.title}
                        </h3>
                        <p className="text-xs text-neutral-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{item.address}</span>
                        </p>
                      </div>

                      {/* Compact Three-Dot Overflow Menu (⋮) */}
                      <div className="relative listing-action-menu-container shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuListingId(prev => prev === item.id ? null : item.id);
                          }}
                          aria-label="Listing management options"
                          title="Listing options"
                          className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Overflow Dropdown */}
                        {openMenuListingId === item.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuListingId(null);
                                setSelectedListingForEdit(item);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Edit listing</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuListingId(null);
                                setConfirmDeleteListing(item);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete listing</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {(item.status === 'rejected' || item.verificationStatus === 'rejected') && item.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-medium">
                        <strong>Rejection Reason:</strong> {item.rejectionReason}
                      </div>
                    )}

                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Price:</span>
                        <span className="font-black text-neutral-900 dark:text-white">₦{item.pricePerYear?.toLocaleString()} / yr</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Status:</span>
                        <span className={`font-extrabold text-[11px] px-2 py-0.5 rounded-md ${
                          item.status === 'rejected' || item.verificationStatus === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : item.status === 'removed'
                            ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                          {item.status === 'rejected' || item.verificationStatus === 'rejected'
                            ? 'Rejected ✕'
                            : item.status === 'removed'
                            ? 'Removed'
                            : 'Published / Active ✓'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenListingDetail && onOpenListingDetail(item)}
                        className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 border border-neutral-200/80 dark:border-neutral-700 shadow-2xs"
                        title="View Property Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Listing Details</span>
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
            universities={universities}
            hostelsCount={agentListings.length}
            chatsCount={agentConversations.length}
            inspectionsCount={agentInspections.length}
            onNavigateSection={(sec) => {
              if (sec === 'hostels') setActiveNav('hostels');
              if (sec === 'inbox') setActiveNav('inbox');
              if (sec === 'calendar') setActiveNav('calendar');
            }}
            onSignOut={onSignOut}
            onDeleteAccount={() => onDeleteAccount(activeAccountId)}
            onOpenInfoPage={onOpenInfoPage}
            onProfileUpdated={onProfileUpdated}
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

      {/* Listing Delete Confirmation Modal */}
      {confirmDeleteListing && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => !isDeleting && setConfirmDeleteListing(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                  Delete Property Listing?
                </h3>
                <p className="text-xs text-neutral-500">
                  This will remove the listing from public discovery.
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-1 text-xs">
              <p className="font-extrabold text-neutral-900 dark:text-white">{confirmDeleteListing.title}</p>
              <p className="text-neutral-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" /> {confirmDeleteListing.address}
              </p>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to delete this property? Once deleted, students will no longer be able to discover or book tours for this accommodation.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteListing(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteListing(confirmDeleteListing)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Listing'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
          actionFeedback.type === 'success' 
            ? 'bg-neutral-900 text-white border-emerald-500/50' 
            : 'bg-rose-900 text-white border-rose-500/50'
        }`}>
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

    </div>
  );
};
