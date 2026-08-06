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
import { updateInspectionStatus } from '../services/api';
import { sendNotification } from '../services/notificationService';
import { AccountManager } from './AccountManager';

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
  onDeleteAccount
}) => {
  const [internalTab, setInternalTab] = useState<'schedule' | 'availability' | 'requests' | 'profile'>(activeTab);
  const [localInspections, setLocalInspections] = useState(inspections);
  const [propertyAvailability, setPropertyAvailability] = useState<Record<string, 'available' | 'occupied' | 'maintenance'>>(() => {
    const map: Record<string, 'available' | 'occupied' | 'maintenance'> = {};
    listings.forEach(l => {
      map[l.id] = (l.status as any) || 'available';
    });
    return map;
  });

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

  const handleToggleAvailability = (listingId: string, newStatus: 'available' | 'occupied' | 'maintenance') => {
    setPropertyAvailability(prev => ({
      ...prev,
      [listingId]: newStatus
    }));
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
            {localInspections.map((insp) => (
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

                <div className="flex items-center gap-2">
                  {insp.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleStatusChange(insp.id, 'confirmed')}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                      >
                        Approve Tour
                      </button>
                      <button
                        onClick={() => handleStatusChange(insp.id, 'cancelled')}
                        className="px-3 py-1.5 bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg hover:bg-neutral-300"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs font-bold px-3 py-1 rounded-lg capitalize ${
                      insp.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {insp.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Check / Update Availability */}
      {currentTab === 'availability' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Check & Update Property Availability
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Easily toggle property status so students see real-time availability on their walking map search.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => {
              const status = propertyAvailability[item.id] || 'available';
              return (
                <div key={item.id} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-200">
                    <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                      status === 'available' ? 'bg-emerald-600' : status === 'occupied' ? 'bg-rose-600' : 'bg-amber-600'
                    }`}>
                      {status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-neutral-900 text-xs line-clamp-1">{item.title}</h3>
                    <p className="text-[11px] text-neutral-500">{item.address}</p>
                    <p className="text-xs font-extrabold text-slate-900 mt-1">
                      ₦{(item.pricePerYear || (item.pricePerWeek ? item.pricePerWeek * 52 : 300000)).toLocaleString()}/yr
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase block">Set Live Status:</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => handleToggleAvailability(item.id, 'available')}
                        className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                          status === 'available'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        Available
                      </button>
                      <button
                        onClick={() => handleToggleAvailability(item.id, 'occupied')}
                        className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                          status === 'occupied'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        Occupied
                      </button>
                      <button
                        onClick={() => handleToggleAvailability(item.id, 'maintenance')}
                        className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                          status === 'maintenance'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        Renovation
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Requests & Chats */}
      {currentTab === 'requests' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            Student Requests & Chat Enquiries
          </h2>

          <div className="space-y-3">
            {conversations.map((conv) => (
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

                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 font-semibold block mb-1">{conv.lastMessageTime}</span>
                  <button className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg">
                    Open Chat
                  </button>
                </div>
              </div>
            ))}
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

