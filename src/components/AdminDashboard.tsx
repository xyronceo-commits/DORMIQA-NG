import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Building2, 
  AlertTriangle, 
  TrendingUp, 
  FileText,
  User as UserIcon,
  LogOut,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Clock,
  ArrowUpRight,
  Check,
  X,
  FileCheck,
  BarChart2,
  GraduationCap,
  UserPlus,
  Trash2,
  Key,
  AlertCircle
} from 'lucide-react';
import { Listing, User } from '../types';
import { 
  fetchAdminStats, 
  fetchAdminAgents, 
  updateAdminAgentStatus, 
  fetchAdminProperties, 
  updateAdminPropertyStatus, 
  fetchStudentOverview, 
  fetchAdminAnalytics,
  fetchAdminEmails,
  addAdminEmail,
  removeAdminEmail,
  adminLogout 
} from '../services/api';

interface AdminDashboardProps {
  onRefresh: () => void;
  onAdminLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onRefresh,
  onAdminLogout
}) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'properties' | 'students' | 'analytics' | 'access'>('agents');
  
  // Data state
  const [stats, setStats] = useState<{
    totalStudents: number;
    verifiedAgents: number;
    pendingAgents: number;
    totalListings: number;
    approvedListings: number;
    pendingListings: number;
    pendingReviews: number;
  }>({
    totalStudents: 0,
    verifiedAgents: 0,
    pendingAgents: 0,
    totalListings: 0,
    approvedListings: 0,
    pendingListings: 0,
    pendingReviews: 0
  });

  const [agents, setAgents] = useState<any[]>([]);
  const [properties, setProperties] = useState<Listing[]>([]);
  const [studentData, setStudentData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  
  // Admin Access Emails State
  const [adminEmails, setAdminEmails] = useState<string[]>(['buildsafe247@gmail.com']);
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  
  // Modal for reviewing agent or property
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Listing | null>(null);
  const [rejectionReasonModal, setRejectionReasonModal] = useState<{
    type: 'agent' | 'property';
    id: string;
    title: string;
  } | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, agentsRes, propsRes, studentsRes, analyticsRes, emailsRes] = await Promise.allSettled([
        fetchAdminStats(),
        fetchAdminAgents(),
        fetchAdminProperties(),
        fetchStudentOverview(),
        fetchAdminAnalytics(),
        fetchAdminEmails()
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (agentsRes.status === 'fulfilled' && Array.isArray(agentsRes.value)) setAgents(agentsRes.value);
      if (propsRes.status === 'fulfilled' && Array.isArray(propsRes.value)) setProperties(propsRes.value);
      if (studentsRes.status === 'fulfilled') setStudentData(studentsRes.value);
      if (analyticsRes.status === 'fulfilled') setAnalyticsData(analyticsRes.value);
      if (emailsRes.status === 'fulfilled' && Array.isArray(emailsRes.value)) setAdminEmails(emailsRes.value);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmailInput.trim()) return;
    setIsAddingEmail(true);
    setEmailNotice(null);
    try {
      const updated = await addAdminEmail(newAdminEmailInput.trim());
      setAdminEmails(updated);
      setNewAdminEmailInput('');
      setEmailNotice({ type: 'success', msg: `Admin email '${newAdminEmailInput.trim()}' authorized and saved securely to Firestore collection.` });
    } catch (err: any) {
      setEmailNotice({ type: 'error', msg: err.message || 'Failed to add admin email.' });
    } finally {
      setIsAddingEmail(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    if (!confirm(`Are you sure you want to revoke admin access for ${emailToRemove}?`)) return;
    setEmailNotice(null);
    try {
      const updated = await removeAdminEmail(emailToRemove);
      setAdminEmails(updated);
      setEmailNotice({ type: 'success', msg: `Admin email '${emailToRemove}' removed.` });
    } catch (err: any) {
      setEmailNotice({ type: 'error', msg: err.message || 'Failed to remove admin email.' });
    }
  };

  const handleVerifyAgent = async (agentId: string) => {
    try {
      await updateAdminAgentStatus(agentId, 'verified');
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isVerifiedAgent: true, status: 'verified' } : a));
      setStats(prev => ({
        ...prev,
        verifiedAgents: prev.verifiedAgents + 1,
        pendingAgents: Math.max(0, prev.pendingAgents - 1),
        pendingReviews: Math.max(0, prev.pendingReviews - 1)
      }));
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to verify agent.');
    }
  };

  const handleRejectAgent = async (agentId: string, reason: string) => {
    try {
      await updateAdminAgentStatus(agentId, 'rejected', reason);
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isVerifiedAgent: false, status: 'rejected', rejectionReason: reason } : a));
      setRejectionReasonModal(null);
      setRejectionReasonText('');
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reject agent application.');
    }
  };

  const handleApproveProperty = async (propertyId: string) => {
    try {
      await updateAdminPropertyStatus(propertyId, 'approved');
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'approved' } : p));
      setStats(prev => ({
        ...prev,
        approvedListings: prev.approvedListings + 1,
        pendingListings: Math.max(0, prev.pendingListings - 1),
        pendingReviews: Math.max(0, prev.pendingReviews - 1)
      }));
      if (selectedProperty && selectedProperty.id === propertyId) {
        setSelectedProperty(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to approve property.');
    }
  };

  const handleRejectProperty = async (propertyId: string, status: 'rejected' | 'changes_requested', reason: string) => {
    try {
      await updateAdminPropertyStatus(propertyId, status, reason);
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: status as any, aiBanReason: reason } : p));
      setRejectionReasonModal(null);
      setRejectionReasonText('');
      if (selectedProperty && selectedProperty.id === propertyId) {
        setSelectedProperty(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update property status.');
    }
  };

  const handleLogoutClick = async () => {
    await adminLogout();
    onAdminLogout();
  };

  // Filter agents by status and search
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agencyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending') return matchesSearch && (!agent.isVerifiedAgent && agent.status !== 'rejected');
    if (statusFilter === 'verified') return matchesSearch && agent.isVerifiedAgent;
    if (statusFilter === 'rejected') return matchesSearch && agent.status === 'rejected';
    return matchesSearch;
  });

  // Filter properties by status and search
  const filteredProperties = properties.filter(prop => {
    const matchesSearch = 
      prop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.universityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.agent?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending') return matchesSearch && prop.status === 'pending';
    if (statusFilter === 'approved') return matchesSearch && prop.status === 'approved';
    if (statusFilter === 'changes_requested') return matchesSearch && prop.status === 'changes_requested';
    if (statusFilter === 'rejected') return matchesSearch && (prop.status === 'rejected' || prop.status === 'banned');
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-16">
      
      {/* Top Admin Header Bar */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                  Dormiqa Admin
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Internal Ops
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Secure internal dashboard for agent verification, property moderation, and growth analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={loadAllAdminData}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleLogoutClick}
              className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Top Summary Statistics Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 border-t border-neutral-100 dark:border-neutral-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total Students</p>
              <p className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">{stats.totalStudents.toLocaleString()}</p>
            </div>
            <Users className="w-5 h-5 text-blue-500 opacity-80" />
          </div>

          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Verified Agents</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.verifiedAgents}</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-500 opacity-80" />
          </div>

          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Listings</p>
              <p className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">{stats.totalListings}</p>
            </div>
            <Building2 className="w-5 h-5 text-indigo-500 opacity-80" />
          </div>

          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Pending Reviews</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.pendingReviews}</p>
            </div>
            <Clock className="w-5 h-5 text-amber-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* Main Container & Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* Tab Selection Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto pb-0">
          <button
            onClick={() => { setActiveTab('agents'); setStatusFilter('pending'); }}
            className={`py-3 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'agents'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Agent Verification</span>
            {stats.pendingAgents > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-amber-500 text-white font-black">
                {stats.pendingAgents}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('properties'); setStatusFilter('pending'); }}
            className={`py-3 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'properties'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Business & Property Verification</span>
            {stats.pendingListings > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-amber-500 text-white font-black">
                {stats.pendingListings}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'students'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('access')}
            className={`py-3 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'access'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Key className="w-4 h-4 text-amber-500" />
            <span>Admin Access Control</span>
          </button>
        </div>

        {/* Search & Filter Controls for Lists */}
        {(activeTab === 'agents' || activeTab === 'properties') && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'agents' ? "Search agent by name, agency, phone or email..." : "Search property by name, university, agent..."}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">Filter:</span>
              
              {activeTab === 'agents' ? (
                <>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Pending ({agents.filter(a => !a.isVerifiedAgent && a.status !== 'rejected').length})
                  </button>

                  <button
                    onClick={() => setStatusFilter('verified')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'verified'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Verified ({agents.filter(a => a.isVerifiedAgent).length})
                  </button>

                  <button
                    onClick={() => setStatusFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'rejected'
                        ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Rejected ({agents.filter(a => a.status === 'rejected').length})
                  </button>

                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    All ({agents.length})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Pending ({properties.filter(p => p.status === 'pending').length})
                  </button>

                  <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'approved'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Approved ({properties.filter(p => p.status === 'approved').length})
                  </button>

                  <button
                    onClick={() => setStatusFilter('changes_requested')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'changes_requested'
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Changes Requested ({properties.filter(p => p.status === 'changes_requested').length})
                  </button>

                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    All ({properties.length})
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* SECTION 1: AGENT VERIFICATION TAB */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            {filteredAgents.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                <ShieldCheck className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">No agent applications found</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  {statusFilter === 'pending' ? 'No pending agent verification requests at this time. All submissions have been processed.' : 'Try adjusting your search query or filter settings.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredAgents.map((agent) => (
                  <div 
                    key={agent.id}
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-2xs hover:border-neutral-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                  >
                    {/* Agent Identity & Business info */}
                    <div className="flex items-start gap-4">
                      <img 
                        src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                        alt={agent.name}
                        className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-neutral-200 dark:border-neutral-700" 
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                            {agent.name}
                          </h3>

                          {agent.isVerifiedAgent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3" />
                              Verified Agent
                            </span>
                          ) : agent.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <XCircle className="w-3 h-3" />
                              Application Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              Pending Review
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {agent.agencyName || 'Independent Real Estate Practitioner'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {agent.phone || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {agent.email || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-indigo-500" /> {agent.propertiesCount || agent.totalProperties || 0} Submitted Properties
                          </span>
                        </div>

                        {agent.bio && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-1 italic mt-1 bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded-xl">
                            "{agent.bio}"
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-neutral-400 pt-1">
                          <span>Proof: <strong className="text-neutral-700 dark:text-neutral-200">{agent.proofType || agent.licenseNumber || 'CAC Registration & Office Proof'}</strong></span>
                          <span>Submitted: {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : 'Aug 5, 2026'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => setSelectedAgent(agent)}
                        className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review Details</span>
                      </button>

                      {!agent.isVerifiedAgent && agent.status !== 'rejected' && (
                        <>
                          <button
                            onClick={() => handleVerifyAgent(agent.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Verify Agent</span>
                          </button>

                          <button
                            onClick={() => setRejectionReasonModal({ type: 'agent', id: agent.id, title: agent.name })}
                            className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: BUSINESS & PROPERTY VERIFICATION TAB */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {filteredProperties.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                <Building2 className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">No property submissions found</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  {statusFilter === 'pending' ? 'All pending accommodation listings have been reviewed.' : 'Try adjusting your search query or status filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredProperties.map((prop) => (
                  <div 
                    key={prop.id}
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-2xs hover:border-neutral-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                  >
                    {/* Thumbnail & Property Info */}
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <img 
                          src={prop.photos?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=300&q=80'} 
                          alt={prop.title}
                          className="w-20 h-20 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-700"
                        />
                        {prop.videoUrl && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-slate-900/80 text-white text-[9px] font-black">
                            Video
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm sm:text-base text-neutral-900 dark:text-white">
                            {prop.title}
                          </h3>

                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            prop.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' :
                            prop.status === 'changes_requested' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300' :
                            prop.status === 'rejected' || prop.status === 'banned' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          }`}>
                            {prop.status === 'changes_requested' ? 'Changes Requested' : prop.status}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{prop.address} ({prop.universityName})</span>
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="font-black text-slate-900 dark:text-white">
                            ₦{prop.pricePerYear?.toLocaleString() || (prop.pricePerWeek ? prop.pricePerWeek * 52 : 350000).toLocaleString()}/yr
                          </span>
                          <span className="text-neutral-400">•</span>
                          <span className="text-neutral-600 dark:text-neutral-400">
                            Agent: <strong>{prop.agent?.name || 'Verified Agent'}</strong> ({prop.agent?.agencyName || 'Agency'})
                          </span>
                        </div>

                        {/* Facilities tags */}
                        {prop.facilities && prop.facilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {prop.facilities.slice(0, 4).map((fac, i) => (
                              <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                {fac}
                              </span>
                            ))}
                            {prop.facilities.length > 4 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 text-neutral-400">
                                +{prop.facilities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => setSelectedProperty(prop)}
                        className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      {prop.status !== 'approved' && (
                        <button
                          onClick={() => handleApproveProperty(prop.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                      )}

                      {prop.status !== 'changes_requested' && (
                        <button
                          onClick={() => setRejectionReasonModal({ type: 'property', id: prop.id, title: prop.title })}
                          className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>Request Changes</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: STUDENT OVERVIEW TAB */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            {/* Student Onboarding Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                <p className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider">Total Onboarded Students</p>
                <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1">
                  {studentData?.totalStudents || stats.totalStudents.toLocaleString()}
                </p>
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +14.2% month-over-month
                </p>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                <p className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider">New Students Today</p>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {studentData?.newToday ?? 0}
                </p>
                <p className="text-[11px] font-semibold text-neutral-500 mt-1">Verified university emails</p>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                <p className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider">New Students This Week</p>
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {studentData?.newThisWeek ?? 0}
                </p>
                <p className="text-[11px] font-semibold text-neutral-500 mt-1">Active house searches</p>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                <p className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider">New Students This Month</p>
                <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1">
                  {studentData?.newThisMonth ?? 0}
                </p>
                <p className="text-[11px] font-semibold text-neutral-500 mt-1">August onboarding intake</p>
              </div>
            </div>

            {/* University Distribution Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Students Onboarded by University
                  </h3>
                  <p className="text-xs text-neutral-500">Distribution across verified tertiary institutions in Nigeria</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300">
                  12 Active Campuses
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-extrabold uppercase tracking-wider">
                      <th className="py-3 px-3">University</th>
                      <th className="py-3 px-3">Code</th>
                      <th className="py-3 px-3">Onboarded Students</th>
                      <th className="py-3 px-3">Distribution Share</th>
                      <th className="py-3 px-3">Growth Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                    {(!studentData?.studentsByUniversity || studentData.studentsByUniversity.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-neutral-400 font-medium">
                          No onboarded students recorded yet.
                        </td>
                      </tr>
                    ) : (
                      studentData.studentsByUniversity.map((uni: any) => (
                        <tr key={uni.code || uni.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="py-3.5 px-3 font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{uni.name}</span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-neutral-500 font-bold">{uni.code}</td>
                          <td className="py-3.5 px-3 font-black text-neutral-900 dark:text-white">{uni.count.toLocaleString()} students</td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden max-w-[120px]">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full" 
                                  style={{ width: `${uni.percent}%` }}
                                />
                              </div>
                              <span className="font-extrabold text-neutral-700 dark:text-neutral-300">{uni.percent}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                            {uni.count} Total
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Visual Charts & Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Student Signups Trend Chart */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      Student Signups Over Time
                    </h3>
                    <p className="text-xs text-neutral-500">Monthly student acquisition trajectory across Dormiqa</p>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                    Real-time Growth
                  </span>
                </div>

                {/* Simple Clean Bar Chart Visualizer */}
                {(!analyticsData?.studentSignupsOverTime || analyticsData.studentSignupsOverTime.length === 0) ? (
                  <div className="pt-12 pb-12 flex items-center justify-center text-xs text-neutral-400 font-medium border-b border-neutral-100 dark:border-neutral-800">
                    No student signups recorded yet.
                  </div>
                ) : (
                  <div className="pt-4 pb-2 flex items-end gap-3 h-48 border-b border-neutral-100 dark:border-neutral-800">
                    {analyticsData.studentSignupsOverTime.map((item: any) => (
                      <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                        <span className="text-[10px] font-extrabold text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.count}
                        </span>
                        <div 
                          className="w-full bg-emerald-500/20 group-hover:bg-emerald-500 rounded-t-lg transition-all"
                          style={{ height: item.height || '20%' }}
                        />
                        <span className="text-[11px] font-bold text-neutral-500">{item.month}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Property Demand Breakdown */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      Student Accommodation Demand
                    </h3>
                    <p className="text-xs text-neutral-500">Most requested housing categories among student inquiries</p>
                  </div>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>

                <div className="space-y-3 pt-2">
                  {(!analyticsData?.accommodationDemand || analyticsData.accommodationDemand.length === 0) ? (
                    <div className="py-8 text-center text-xs text-neutral-400 font-medium">
                      No accommodation listings or demand data recorded yet.
                    </div>
                  ) : (
                    analyticsData.accommodationDemand.map((cat: any) => (
                      <div key={cat.type} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-neutral-800 dark:text-neutral-200">{cat.type}</span>
                          <span className="text-neutral-500">{cat.percent}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div className={`h-full bg-emerald-500 rounded-full`} style={{ width: `${cat.percent}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Platform Operational Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <h4 className="text-xs font-extrabold uppercase text-neutral-400">Agent Applications</h4>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs font-bold"><span>Total Applications:</span><span>{analyticsData?.agentApplications?.total ?? stats.verifiedAgents + stats.pendingAgents}</span></div>
                  <div className="flex justify-between text-xs font-bold text-emerald-600"><span>Verified:</span><span>{analyticsData?.agentApplications?.verified ?? stats.verifiedAgents}</span></div>
                  <div className="flex justify-between text-xs font-bold text-amber-600"><span>Pending:</span><span>{analyticsData?.agentApplications?.pending ?? stats.pendingAgents}</span></div>
                  <div className="flex justify-between text-xs font-bold text-rose-600"><span>Rejected:</span><span>{analyticsData?.agentApplications?.rejected ?? 0}</span></div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <h4 className="text-xs font-extrabold uppercase text-neutral-400">Listings Overview</h4>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs font-bold"><span>Total Listings:</span><span>{analyticsData?.listingsStats?.total ?? stats.totalListings}</span></div>
                  <div className="flex justify-between text-xs font-bold text-emerald-600"><span>Approved/Verified:</span><span>{analyticsData?.listingsStats?.approved ?? stats.approvedListings}</span></div>
                  <div className="flex justify-between text-xs font-bold text-amber-600"><span>Pending Review:</span><span>{analyticsData?.listingsStats?.pending ?? stats.pendingListings}</span></div>
                  <div className="flex justify-between text-xs font-bold text-rose-600"><span>Banned/Flagged:</span><span>{analyticsData?.listingsStats?.banned ?? 0}</span></div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <h4 className="text-xs font-extrabold uppercase text-neutral-400">Campus Distribution</h4>
                <div className="mt-2 space-y-1 text-xs font-bold">
                  {(!studentData?.studentsByUniversity || studentData.studentsByUniversity.length === 0) ? (
                    <div className="text-neutral-400 font-normal pt-1">No campus activity recorded yet.</div>
                  ) : (
                    studentData.studentsByUniversity.slice(0, 4).map((uni: any, idx: number) => (
                      <div key={uni.code || uni.id} className="flex justify-between">
                        <span>{idx + 1}. {uni.name}</span>
                        <span className="text-emerald-600">{uni.count} students</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: ADMIN ACCESS CONTROL TAB */}
        {activeTab === 'access' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header / Explanation Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                    Admin Access Management
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">
                    Authorized email addresses stored in Firestore collection <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-600 dark:text-emerald-400">authorized_admins</code> permitted to authenticate via server-validated credentials or passcode.
                  </p>
                </div>
              </div>
            </div>

            {/* Notice / Feedback Banner */}
            {emailNotice && (
              <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold ${
                emailNotice.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
              }`}>
                {emailNotice.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <span>{emailNotice.msg}</span>
              </div>
            )}

            {/* Add New Admin Email Form Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xs space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">
                Authorize New Admin Email Address
              </h4>
              <form onSubmit={handleAddEmail} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={newAdminEmailInput}
                    onChange={(e) => setNewAdminEmailInput(e.target.value)}
                    placeholder="Enter email address (e.g. buildsafe247@gmail.com)"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAddingEmail || !newAdminEmailInput.trim()}
                  className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Grant Admin Access</span>
                </button>
              </form>
            </div>

            {/* List of Authorized Admin Emails */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Currently Authorized Admin Emails ({adminEmails.length})
                </h4>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secure Server Authorization
                </span>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {adminEmails.map((email) => (
                  <div key={email} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-neutral-900 dark:text-white font-mono">
                          {email}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <Check className="w-3 h-3" /> Approved Administrator Account
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      disabled={adminEmails.length <= 1}
                      title={adminEmails.length <= 1 ? "Cannot remove the only remaining admin email" : "Revoke access"}
                      className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL: Review Agent Application */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedAgent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                  alt={selectedAgent.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-700" 
                />
                <div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white">{selectedAgent.name}</h3>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{selectedAgent.agencyName || 'Independent Agent'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Phone</p>
                <p className="font-bold text-neutral-900 dark:text-white">{selectedAgent.phone || '+234 803 123 4567'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Email</p>
                <p className="font-bold text-neutral-900 dark:text-white">{selectedAgent.email || 'dormiqa@gmail.com'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">License / Proof Type</p>
                <p className="font-bold text-neutral-900 dark:text-white">{selectedAgent.proofType || 'CAC Business Registration Certificate'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Submitted Properties</p>
                <p className="font-bold text-neutral-900 dark:text-white">{selectedAgent.propertiesCount || 2} Listings</p>
              </div>
            </div>

            {selectedAgent.bio && (
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Business Bio & Operation Overview</p>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">{selectedAgent.bio}</p>
              </div>
            )}

            {/* Document Verification Proof */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <p className="font-extrabold uppercase text-[10px] text-neutral-400">Submitted Verification Proof</p>
              <div className="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <FileCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">CAC-Registration-Proof-2026.pdf</p>
                  <p className="text-[10px] text-neutral-400">Verified document timestamp: Aug 5, 2026</p>
                </div>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                  Valid
                </span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              {!selectedAgent.isVerifiedAgent && (
                <>
                  <button
                    onClick={() => setRejectionReasonModal({ type: 'agent', id: selectedAgent.id, title: selectedAgent.name })}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 dark:text-rose-300 font-bold text-xs cursor-pointer"
                  >
                    Reject Application
                  </button>

                  <button
                    onClick={() => handleVerifyAgent(selectedAgent.id)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md cursor-pointer"
                  >
                    Verify & Approve Agent
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: Inspect Property */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">{selectedProperty.title}</h3>
                <p className="text-xs font-bold text-neutral-500">{selectedProperty.address} ({selectedProperty.universityName})</p>
              </div>
              <button 
                onClick={() => setSelectedProperty(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Gallery Thumbnails */}
            {selectedProperty.photos && selectedProperty.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {selectedProperty.photos.slice(0, 3).map((photo, i) => (
                  <img 
                    key={i} 
                    src={photo} 
                    alt="" 
                    className="w-full h-32 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700" 
                  />
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Annual Rent</p>
                <p className="font-black text-base text-emerald-600">
                  ₦{selectedProperty.pricePerYear?.toLocaleString() || (selectedProperty.pricePerWeek ? selectedProperty.pricePerWeek * 52 : 350000).toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Walking Distance</p>
                <p className="font-black text-base text-neutral-900 dark:text-white">
                  {selectedProperty.walkingDistanceMinutes || 5} mins to Campus Gate
                </p>
              </div>
            </div>

            {selectedProperty.description && (
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Property Description</p>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">{selectedProperty.description}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              {selectedProperty.status !== 'approved' && (
                <button
                  onClick={() => handleApproveProperty(selectedProperty.id)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Approve Property
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rejection or Request Changes Reason */}
      {rejectionReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
              Specify Action Notes for {rejectionReasonModal.title}
            </h3>

            <textarea
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              placeholder="Provide specific notes/reason (e.g., 'Upload clearer document copy' or 'Incomplete property details')..."
              rows={4}
              className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectionReasonModal(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectionReasonModal.type === 'agent') {
                    handleRejectAgent(rejectionReasonModal.id, rejectionReasonText || 'Information does not satisfy verification policy.');
                  } else {
                    handleRejectProperty(rejectionReasonModal.id, 'changes_requested', rejectionReasonText || 'Please update property details as requested.');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-extrabold text-xs shadow-xs"
              >
                Submit Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
