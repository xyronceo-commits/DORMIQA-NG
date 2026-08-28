import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User as UserIcon, 
  Building2, 
  Phone, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Inspection, Listing } from '../types';

interface AgentCalendarPageProps {
  inspections: Inspection[];
  listings: Listing[];
  onUpdateInspectionStatus?: (inspectionId: string, status: 'confirmed' | 'cancelled' | 'completed') => void;
}

export const AgentCalendarPage: React.FC<AgentCalendarPageProps> = ({
  inspections,
  listings,
  onUpdateInspectionStatus
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filter inspections
  const filteredInspections = inspections.filter(item => {
    if (activeTab === 'all') return true;
    return item.status === activeTab;
  });

  const getListingForInspection = (listingId: string) => {
    return listings.find(l => l.id === listingId);
  };

  const pendingCount = inspections.filter(i => i.status === 'pending').length;
  const confirmedCount = inspections.filter(i => i.status === 'confirmed').length;
  const completedCount = inspections.filter(i => i.status === 'completed').length;
  const cancelledCount = inspections.filter(i => i.status === 'cancelled').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Page Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            Calendar & Inspections
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Manage student tour requests, schedule property inspections, and confirm bookings.
          </p>
        </div>

        {/* Status Count Badges */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 text-amber-800 dark:text-amber-300 rounded-xl">
            Pending: {pendingCount}
          </span>
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl">
            Confirmed: {confirmedCount}
          </span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-neutral-200 dark:border-neutral-800">
        {[
          { id: 'all', label: `All (${inspections.length})` },
          { id: 'pending', label: `Pending Requests (${pendingCount})` },
          { id: 'confirmed', label: `Confirmed (${confirmedCount})` },
          { id: 'completed', label: `Completed (${completedCount})` },
          { id: 'cancelled', label: `Cancelled (${cancelledCount})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inspections List */}
      {filteredInspections.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center space-y-3">
          <CalendarIcon className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            No inspection requests found
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Student tour requests for your hostels will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInspections.map(item => {
            const hostel = getListingForInspection(item.listingId);
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-xs space-y-4 hover:border-neutral-300 transition-all"
              >
                {/* Header: Hostel & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={hostel?.photos?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=200&q=80'}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-black text-neutral-900 dark:text-white line-clamp-1">
                        {item.listingTitle || hostel?.title || 'Student Hostel'}
                      </h4>
                      <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-neutral-400" />
                        <span>{hostel?.address || 'Campus Area'}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shrink-0 border ${
                    item.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : item.status === 'completed'
                      ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300'
                      : item.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300'
                  }`}>
                    {item.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl text-xs space-y-1.5 border border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                      Student:
                    </span>
                    <span className="font-semibold">{item.studentName || 'Student Visitor'}</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      Date & Time:
                    </span>
                    <span className="font-extrabold text-neutral-900 dark:text-white">
                      {item.date} at {item.timeSlot}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      Contact Phone:
                    </span>
                    <span className="font-semibold">{item.studentPhone || 'N/A'}</span>
                  </div>
                </div>

                {/* Actions */}
                {onUpdateInspectionStatus && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onUpdateInspectionStatus(item.id, 'confirmed')}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm</span>
                        </button>
                        <button
                          onClick={() => onUpdateInspectionStatus(item.id, 'cancelled')}
                          className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </>
                    )}

                    {item.status === 'confirmed' && (
                      <button
                        onClick={() => onUpdateInspectionStatus(item.id, 'completed')}
                        className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
