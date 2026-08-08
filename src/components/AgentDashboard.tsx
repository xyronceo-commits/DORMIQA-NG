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

  // Real-time polling interval for live agent updates (inspections & messages)
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
    }, 3000);

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
          userId: updatedInsp.studentId || 'usr_student_1',
          title: `📅 Tour Status: ${status.toUpperCase()}`,
          body: `Agent Tunde marked your inspection for "${updatedInsp.listingTitle}" as ${status.toUpperCase()}.`,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Verification Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={activeUser?.avatarUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"}
            alt=""
            className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white">{activeUser?.name || 'Chief Tunde Adebayo'}</h1>
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> VERIFIED CARETAKER & AGENT
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {activeUser?.agencyName || 'Yaba & Akoka Student Housing Ltd'} • {activeUser?.email || 'tunde.adebayo@yabahousing.ng'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddModal}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl flex items-center gap-2 shadow-sm transition-all active:scale-95 text-xs"
        >
          <Plus className="w-4 h-4" />
          Add New Listing
        </button>
      </div>

      {/* KPI Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Active Properties</span>
          <p className="text-2xl font-black text-slate-900">{listings.length}</p>
          <p className="text-[11px] text-emerald-700 font-semibold">100% Verified status</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Total Student Views</span>
          <p className="text-2xl font-black text-slate-900">3,480</p>
          <p className="text-[11px] text-emerald-700 font-semibold">+18% this month</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Pending Inspections</span>
          <p className="text-2xl font-black text-slate-900">{localInspections.filter(i => i.status === 'pending').length}</p>
          <p className="text-[11px] text-amber-600 font-semibold">Action required</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Response Rate</span>
          <p className="text-2xl font-black text-slate-900">99%</p>
          <p className="text-[11px] text-emerald-700 font-semibold">Avg: &lt;15 minutes</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 overflow-x-auto">
        <button
          onClick={() => setTab('schedule')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 whitespace-nowrap ${
            currentTab === 'schedule'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-600" />
          Schedule ({localInspections.length})
        </button>

        <button
          onClick={() => setTab('availability')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 whitespace-nowrap ${
            currentTab === 'availability'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          Check / Update Availability ({listings.length})
        </button>

        <button
          onClick={() => setTab('requests')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 whitespace-nowrap ${
            currentTab === 'requests'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-purple-600" />
          Student Requests & Chats ({conversations.length})
        </button>

        <button
          onClick={() => setTab('profile')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 whitespace-nowrap ${
            currentTab === 'profile'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <UserIcon className="w-4 h-4 text-neutral-700" />
          Agent Profile
        </button>
      </div>

      {/* Tab 1: Schedule */}
      {currentTab === 'schedule' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Inspection Schedule & Appointments
            </h2>
          </div>

          <div className="space-y-3">
            {localInspections.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
                No inspection requests received yet. Incoming student inspection bookings will appear here in real-time.
              </div>
            ) : (
              localInspections.map((insp) => (
                <div
                  key={insp.id}
                  className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img src={insp.listingPhoto} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-neutral-900">{insp.studentName}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {insp.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 font-medium">{insp.listingTitle}</p>
                      <p className="text-[11px] text-neutral-400">
                        Requested: <strong>{insp.date} ({insp.timeSlot})</strong> • {insp.studentPhone}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {insp.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleStatusChange(insp.id, 'confirmed')}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                          Approve Tour
                        </button>
                        <button
                          onClick={() => handleStatusChange(insp.id, 'cancelled')}
                          className="px-3 py-1.5 bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg hover:bg-neutral-300 transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-lg capitalize ${
                          insp.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
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
                              className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[11px] font-bold rounded-lg transition-colors"
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

      {/* Tab 2: Check / Update Availability */}
      {currentTab === 'availability' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Manage Unit Posted Status & Sales Info
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Access and update unit room availability (vacant, occupied, remaining, renovation) and manage rental sales details in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-500 text-xs col-span-full space-y-3">
                <p className="font-bold text-slate-900">You have not uploaded any properties yet.</p>
                <p className="text-neutral-500">Properties you list will appear here so you can update their status and sales information.</p>
                <button onClick={onOpenAddModal} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
                  List Your First Property
                </button>
              </div>
            ) : (
              listings.map((item) => {
              const status = item.unitStatus || propertyAvailability[item.id] || 'vacant';
              const isUnapproved = item.status === 'banned' || item.isAiBanned;
              return (
                <div key={item.id} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-200">
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
                      <h3 className="font-bold text-neutral-900 text-xs line-clamp-1">{item.title}</h3>
                      <p className="text-[11px] text-neutral-500 line-clamp-1">{item.address}</p>
                      
                      {/* Sales Pricing Summary */}
                      <div className="mt-2 p-2.5 bg-white border border-neutral-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900">
                            ₦{(item.pricePerYear || 350000).toLocaleString()}<span className="text-[10px] font-normal text-neutral-500">/yr</span>
                          </span>
                          <span className="text-[10px] font-semibold text-neutral-500">
                            Caution: ₦{(item.deposit || 30000).toLocaleString()}
                          </span>
                        </div>
                        {item.promoDiscount && (
                          <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded line-clamp-1">
                            🎉 {item.promoDiscount}
                          </p>
                        )}
                        {item.agencyFeeNote && (
                          <p className="text-[10px] font-medium text-neutral-600 line-clamp-1">
                            📋 {item.agencyFeeNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {isUnapproved && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-0.5">
                        <p className="font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          Unapproved Reason:
                        </p>
                        <p className="text-[10px] text-rose-700 leading-snug">
                          {item.aiBanReason || 'Multiple listings detected for this address by another agent.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-neutral-200 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Quick Status Update:</span>
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-bold">
                        <button
                          onClick={() => handleToggleAvailability(item.id, 'vacant')}
                          className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                            status === 'vacant'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          Vacant
                        </button>
                        <button
                          onClick={() => handleToggleAvailability(item.id, 'remaining')}
                          className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                            status === 'remaining'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          Remaining
                        </button>
                        <button
                          onClick={() => handleToggleAvailability(item.id, 'under_renovation')}
                          className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                            status === 'under_renovation'
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          Renovation
                        </button>
                        <button
                          onClick={() => handleToggleAvailability(item.id, 'occupied')}
                          className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                            status === 'occupied'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
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

      {/* Tab 3: Requests & Chats */}
      {currentTab === 'requests' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Student Requests & Chat Enquiries
            </h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Real-time Sync Active
            </span>
          </div>

          <div className="space-y-3">
            {localConversations.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
                No student chat enquiries received yet. Direct student messages regarding your listings will appear here in real-time.
              </div>
            ) : (
              localConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onOpenChat(conv)}
                  className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 hover:border-neutral-300 transition-colors cursor-pointer flex items-center justify-between"
                >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                    {conv.studentName ? conv.studentName.charAt(0) : 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900 text-sm">{conv.studentName || 'Student Enquiry'}</h3>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                        UNILAG Student
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 font-medium">{conv.listingTitle}</p>
                    <p className="text-xs text-neutral-700 italic mt-0.5 line-clamp-1">"{conv.lastMessage}"</p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 font-semibold hidden sm:block">{conv.lastMessageTime}</span>
                  <button className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs">
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

