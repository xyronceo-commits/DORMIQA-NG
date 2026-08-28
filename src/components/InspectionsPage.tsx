import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, MessageSquare, ExternalLink, Star, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Inspection, Listing } from '../types';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';

interface InspectionsPageProps {
  inspections: Inspection[];
  allListings?: Listing[];
  onOpenListing: (listing: Listing) => void;
  onStartChat: (agentId: string, listingId: string) => void;
  onGoBack: () => void;
}

export const InspectionsPage: React.FC<InspectionsPageProps> = ({
  inspections,
  allListings,
  onOpenListing,
  onStartChat,
  onGoBack
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  const filteredInspections = inspections.filter(insp => {
    if (activeTab === 'all') return true;
    return insp.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Agent Confirmation
          </span>
        );
      case 'completed':
        return (
          <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Inspection Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="bg-neutral-100 text-neutral-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      
      {/* HEADER WITH GO BACK ICON */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onGoBack}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Inspections & Requests</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full">
                  {inspections.length}
                </span>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-slate-400">Track and manage property tour bookings</p>
            </div>
          </div>

        </div>
      </header>

      {/* CONTENT BODY */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-slate-800 scrollbar-none">
          {[
            { id: 'all', label: `All (${inspections.length})` },
            { id: 'upcoming', label: `Upcoming` },
            { id: 'pending', label: `Pending Requests` },
            { id: 'confirmed', label: `Confirmed` },
            { id: 'completed', label: `Completed` },
            { id: 'cancelled', label: `Cancelled` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inspections List */}
        {filteredInspections.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 p-8 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">No inspections found</h2>
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                Book a free physical or virtual property tour by tapping "Book Free Inspection" on any hostel page.
              </p>
            </div>
            <button
              onClick={onGoBack}
              className="px-5 py-2.5 bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              Explore Properties
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInspections.map((insp) => (
              <div
                key={insp.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={insp.listingPhoto}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-neutral-200 dark:border-slate-800"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{insp.listingTitle}</h3>
                        {getStatusBadge(insp.status)}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-slate-400">{insp.listingAddress}</p>
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-800 dark:text-slate-200 flex-wrap">
                        <span>📅 Date: <strong>{insp.date}</strong></span>
                        <span>⏰ Slot: <strong>{insp.timeSlot}</strong></span>
                        <span className="capitalize">Type: <strong>{insp.type.replace('_', ' ')}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:self-center shrink-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Agent: {insp.agentName}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-slate-400">Rent: ₦{(insp.pricePerWeek ? insp.pricePerWeek * 52 : 300000).toLocaleString()}/yr</p>
                  </div>
                </div>

                {/* Calendar Sync & Messaging CTA Bar */}
                <div className="pt-3 border-t border-neutral-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <a
                      href={generateGoogleCalendarUrl({
                        title: insp.listingTitle,
                        description: `Property Tour with Agent ${insp.agentName}`,
                        location: insp.listingAddress,
                        date: insp.date,
                        timeSlot: insp.timeSlot
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Add to Google Calendar
                    </a>

                    <button
                      type="button"
                      onClick={() => downloadIcsFile({
                        title: insp.listingTitle,
                        description: `Property Tour with Agent ${insp.agentName}`,
                        location: insp.listingAddress,
                        date: insp.date,
                        timeSlot: insp.timeSlot
                      })}
                      className="px-2.5 py-1.5 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg border border-neutral-200 dark:border-slate-700 transition-colors"
                    >
                      Download iCal
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onStartChat(insp.agentId || 'agent_1', insp.listingId)}
                      className="px-3.5 py-1.5 bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 text-white dark:text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message Agent
                    </button>

                    <button
                      onClick={() => {
                        const target = allListings?.find(l => l.id === insp.listingId);
                        if (target) onOpenListing(target);
                      }}
                      className="px-3 py-1.5 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1 border border-neutral-200 dark:border-slate-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Hostel Details
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

    </div>
  );
};
