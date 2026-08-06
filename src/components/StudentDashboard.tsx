import React, { useState } from 'react';
import { 
  Heart, 
  Calendar, 
  MessageSquare, 
  User as UserIcon, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Star
} from 'lucide-react';
import { Listing, Inspection, Conversation, User } from '../types';
import { AccountManager } from './AccountManager';

interface StudentDashboardProps {
  savedListings: Listing[];
  inspections: Inspection[];
  conversations: Conversation[];
  allListings?: Listing[];
  onOpenListing: (listing: Listing) => void;
  onOpenChat: (conversation: Conversation) => void;
  onRemoveSaved: (listingId: string) => void;
  activeTab?: 'inspections' | 'saved' | 'chats' | 'profile';
  onTabChange?: (tab: 'inspections' | 'saved' | 'chats' | 'profile') => void;
  accounts: User[];
  activeAccountId: string;
  onSignOut: () => void;
  onDeleteAccount: (accountId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  savedListings,
  inspections,
  conversations,
  allListings,
  onOpenListing,
  onOpenChat,
  onRemoveSaved,
  activeTab = 'inspections',
  onTabChange,
  accounts,
  activeAccountId,
  onSignOut,
  onDeleteAccount
}) => {
  const [internalTab, setInternalTab] = useState<'inspections' | 'saved' | 'chats' | 'profile'>(activeTab);

  const currentTab = activeTab || internalTab;

  const setTab = (t: 'inspections' | 'saved' | 'chats' | 'profile') => {
    setInternalTab(t);
    if (onTabChange) onTabChange(t);
  };

  const activeUser = accounts.find(a => a.id === activeAccountId) || accounts[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Student Profile Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={activeUser?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
            alt=""
            className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white">{activeUser?.name || 'Student Account'}</h1>
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                VERIFIED STUDENT
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {activeUser?.universityName || 'University of Lagos (UNILAG)'} • Student Account
            </p>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-center">
            <span className="text-lg font-bold text-white">{inspections.length}</span>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Tours Booked</p>
          </div>
          <div className="px-4 py-2 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-center">
            <span className="text-lg font-bold text-emerald-400">{savedListings.length}</span>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Saved</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 overflow-x-auto">
        <button
          onClick={() => setTab('inspections')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 whitespace-nowrap ${
            currentTab === 'inspections'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-600" />
          Requests & Inspections ({inspections.length})
        </button>

        <button
          onClick={() => setTab('saved')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 whitespace-nowrap ${
            currentTab === 'saved'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Heart className="w-4 h-4 text-rose-500" />
          Saved ({savedListings.length})
        </button>

        <button
          onClick={() => setTab('chats')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 whitespace-nowrap ${
            currentTab === 'chats'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Chats ({conversations.length})
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
          Profile
        </button>
      </div>

      {/* Tab 1: Inspections / Requests */}
      {currentTab === 'inspections' && (
        <div className="space-y-4">
          {inspections.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
              No inspections booked yet. Browse housing and click "Book Free Inspection".
            </div>
          ) : (
            inspections.map((insp) => (
              <div
                key={insp.id}
                className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <img src={insp.listingPhoto} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900 text-sm">{insp.listingTitle}</h3>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                        insp.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {insp.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">{insp.listingAddress}</p>
                    <p className="text-xs font-semibold text-slate-900 flex items-center gap-3">
                      <span>📅 Date: <strong>{insp.date}</strong></span>
                      <span>⏰ Slot: <strong>{insp.timeSlot}</strong></span>
                      <span>Type: <strong className="capitalize">{insp.type.replace('_', ' ')}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 flex flex-col items-end">
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Agent: {insp.agentName}</p>
                    <p className="text-[11px] text-neutral-500">Rent: ₦{(insp.pricePerWeek ? insp.pricePerWeek * 52 : 350000).toLocaleString()}/yr</p>
                  </div>
                  <button
                    onClick={() => {
                      const target = allListings?.find(l => l.id === insp.listingId);
                      if (target) {
                        onOpenListing(target);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    Rate & Review Property
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Saved Wishlist */}
      {currentTab === 'saved' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedListings.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
              Your wishlist is empty. Save properties by clicking the heart icon on search listings.
            </div>
          ) : (
            savedListings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3 relative">
                <img src={listing.photos[0]} alt="" className="w-full h-40 object-cover rounded-xl" />
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm line-clamp-1">{listing.title}</h3>
                  <p className="text-xs text-neutral-500">{listing.address}</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-1">₦{(listing.pricePerYear || (listing.pricePerWeek ? listing.pricePerWeek * 52 : 350000)).toLocaleString()} <span className="text-xs font-normal text-neutral-500">/ yr</span></p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenListing(listing)}
                    className="flex-1 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => onRemoveSaved(listing.id)}
                    className="px-3 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Agent Messages */}
      {currentTab === 'chats' && (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onOpenChat(conv)}
              className="bg-white p-4 rounded-2xl border border-neutral-200 hover:border-neutral-300 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <img src={conv.agentAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-neutral-900 text-sm">{conv.agentName}</h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      {conv.agencyName}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 font-medium">{conv.listingTitle}</p>
                  <p className="text-xs text-neutral-700 italic mt-0.5 line-clamp-1">"{conv.lastMessage}"</p>
                </div>
              </div>

              <div className="text-right text-[10px] text-neutral-400 font-semibold">
                {conv.lastMessageTime}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Student Profile & Account Management */}
      {currentTab === 'profile' && (
        <AccountManager
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSignOut={onSignOut}
          onDeleteAccount={onDeleteAccount}
          currentRole="student"
        />
      )}

    </div>
  );
};
