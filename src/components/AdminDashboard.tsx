import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Building2, 
  AlertTriangle, 
  TrendingUp, 
  FileText,
  User as UserIcon
} from 'lucide-react';
import { Listing, Report, User } from '../types';
import { fetchReports, updateReportStatus, updateListingStatus } from '../services/api';
import { AccountManager } from './AccountManager';

interface AdminDashboardProps {
  listings: Listing[];
  onRefresh: () => void;
  accounts: User[];
  activeAccountId: string;
  onSignOut: () => void;
  onDeleteAccount: (accountId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  listings,
  onRefresh,
  accounts,
  activeAccountId,
  onSignOut,
  onDeleteAccount
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<'listings' | 'reports' | 'profile'>('listings');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await fetchReports();
      setReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveListing = async (id: string) => {
    await updateListingStatus(id, 'approved');
    onRefresh();
  };

  const handleRejectListing = async (id: string) => {
    await updateListingStatus(id, 'rejected');
    onRefresh();
  };

  const handleResolveReport = async (id: string) => {
    await updateReportStatus(id, 'resolved');
    loadReports();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Header Banner */}
      <div className="bg-purple-950 text-white p-6 rounded-3xl border border-purple-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Campora Verification Desk</h1>
            <span className="bg-purple-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              ADMIN CONTROL
            </span>
          </div>
          <p className="text-xs text-purple-200 font-medium">
            Platform governance, agent identity validation, and anti-scam report desk.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-purple-900/80 rounded-2xl border border-purple-800 text-center">
            <span className="text-lg font-bold text-white">{listings.length}</span>
            <p className="text-[10px] text-purple-300 font-bold uppercase">Listings</p>
          </div>
          <div className="px-4 py-2 bg-purple-900/80 rounded-2xl border border-purple-800 text-center">
            <span className="text-lg font-bold text-amber-400">{reports.filter(r => r.status === 'open' || r.status === 'investigating').length}</span>
            <p className="text-[10px] text-purple-300 font-bold uppercase">Open Flagged</p>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <button
          onClick={() => setTab('listings')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 ${
            tab === 'listings'
              ? 'border-purple-900 text-purple-950'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-purple-600" />
          Listing Moderation Queue ({listings.length})
        </button>

        <button
          onClick={() => setTab('reports')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 ${
            tab === 'reports'
              ? 'border-purple-900 text-purple-950'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          Scam & Fake Listing Reports ({reports.length})
        </button>

        <button
          onClick={() => setTab('profile')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 px-1 ${
            tab === 'profile'
              ? 'border-purple-900 text-purple-950'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <UserIcon className="w-4 h-4 text-purple-800" />
          Admin Profile & Account Desk
        </button>
      </div>

      {/* Moderation List */}
      {tab === 'listings' && (
        <div className="space-y-3">
          {listings.map((l) => (
            <div
              key={l.id}
              className="bg-white p-4 rounded-2xl border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <img src={l.photos[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-neutral-900 text-sm">{l.title}</h3>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                      l.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 
                      l.status === 'banned' ? 'bg-rose-600 text-white' : 
                      l.status === 'flagged' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {l.status === 'banned' ? 'AI Banned' : l.status}
                    </span>
                    {l.isAiBanned && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-rose-300 border border-slate-700">
                        Auto-Banned by AI
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">{l.address} ({l.universityName})</p>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5">
                    Agent: {l.agent.name} ({l.agent.agencyName}) • Rent: ₦{l.pricePerYear?.toLocaleString() || (l.pricePerWeek * 52)?.toLocaleString()}/yr
                  </p>
                  {l.aiBanReason && (
                    <p className="text-[11px] font-bold text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100 mt-1.5">
                      ⚠️ {l.aiBanReason}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {l.status !== 'approved' && (
                  <button
                    onClick={() => handleApproveListing(l.id)}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                )}
                {l.status !== 'banned' && (
                  <button
                    onClick={() => updateListingStatus(l.id, 'banned').then(onRefresh)}
                    className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Ban Listing
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scam Reports List */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                    {rep.reason.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold text-neutral-900">{rep.listingTitle}</span>
                </div>
                <span className="text-xs font-semibold text-neutral-400">Reporter: {rep.reporterName}</span>
              </div>

              <p className="text-xs text-neutral-700 bg-neutral-50 p-3 rounded-xl border border-neutral-100 font-medium">
                "{rep.details}"
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-neutral-400 font-semibold">Report Date: {rep.createdAt}</span>
                {rep.status !== 'resolved' ? (
                  <button
                    onClick={() => handleResolveReport(rep.id)}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg"
                  >
                    Mark Investigated & Resolved
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-600">✓ Resolved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Profile & Account Management */}
      {tab === 'profile' && (
        <AccountManager
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSignOut={onSignOut}
          onDeleteAccount={onDeleteAccount}
          currentRole="admin"
        />
      )}

    </div>
  );
};
