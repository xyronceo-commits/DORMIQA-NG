import { normalizeListing } from '../utils/normalizeListing';
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
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  Download,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Listing, User, AuthorizedAdmin, AdminRole } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { 
  fetchAdminStats, 
  fetchAdminAgents, 
  updateAdminAgentStatus, 
  fetchAdminProperties, 
  updateAdminPropertyStatus, 
  fetchStudentOverview, 
  fetchAdminAnalytics,
  fetchAdministrators,
  addAdministrator,
  removeAdministrator,
  updateAdministratorRole,
  adminLogout 
} from '../services/api';
import { updateAgentVerificationInFirestore, updatePropertyVerificationInFirestore, db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface AdminDashboardProps {
  currentAdminEmail?: string;
  currentAdminRole?: AdminRole;
  onRefresh: () => void;
  onAdminLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentAdminEmail = 'buildsafe247@gmail.com',
  currentAdminRole = 'SUPER_ADMIN',
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
  
  // Admin Access Administrators State
  const [administrators, setAdministrators] = useState<AuthorizedAdmin[]>([]);
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [newAdminRoleInput, setNewAdminRoleInput] = useState<AdminRole>('ADMIN');
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
    mode?: 'reject' | 'changes';
  } | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Confirmation modal for destructive removal
  const [confirmRemoveModal, setConfirmRemoveModal] = useState<{
    type: 'agent' | 'property';
    item: any;
  } | null>(null);
  const [removeReasonText, setRemoveReasonText] = useState('');

  // Lightbox Media Viewer State
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    title?: string;
    type?: 'image' | 'document';
    docType?: string;
    submittedAt?: string;
    status?: string;
    items?: Array<{
      url: string;
      title: string;
      type?: string;
      submittedAt?: string;
      status?: string;
    }>;
    currentIndex?: number;
    parentType?: 'agent' | 'property';
    parentId?: string;
  } | null>(null);

  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotation, setLightboxRotation] = useState(0);
  const [lightboxFit, setLightboxFit] = useState<'contain' | 'cover'>('contain');

  // Keyboard navigation shortcuts for full-screen document lightbox viewer
  useEffect(() => {
    if (!lightboxMedia) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxMedia(null);
      } else if (e.key === 'ArrowLeft') {
        handleLightboxPrev();
      } else if (e.key === 'ArrowRight') {
        handleLightboxNext();
      } else if (e.key === '+' || e.key === '=') {
        setLightboxZoom(prev => Math.min(prev + 0.25, 3.5));
      } else if (e.key === '-' || e.key === '_') {
        setLightboxZoom(prev => Math.max(prev - 0.25, 0.5));
      } else if (e.key === 'r' || e.key === 'R') {
        setLightboxRotation(prev => (prev + 90) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxMedia]);

  const handleLightboxPrev = () => {
    if (!lightboxMedia || !lightboxMedia.items || lightboxMedia.items.length <= 1) return;
    const currentIdx = lightboxMedia.currentIndex ?? 0;
    const newIdx = (currentIdx - 1 + lightboxMedia.items.length) % lightboxMedia.items.length;
    const item = lightboxMedia.items[newIdx];
    setLightboxMedia(prev => prev ? {
      ...prev,
      url: item.url,
      title: item.title,
      docType: item.type,
      submittedAt: item.submittedAt,
      status: item.status,
      currentIndex: newIdx
    } : null);
    setLightboxZoom(1);
    setLightboxRotation(0);
  };

  const handleLightboxNext = () => {
    if (!lightboxMedia || !lightboxMedia.items || lightboxMedia.items.length <= 1) return;
    const currentIdx = lightboxMedia.currentIndex ?? 0;
    const newIdx = (currentIdx + 1) % lightboxMedia.items.length;
    const item = lightboxMedia.items[newIdx];
    setLightboxMedia(prev => prev ? {
      ...prev,
      url: item.url,
      title: item.title,
      docType: item.type,
      submittedAt: item.submittedAt,
      status: item.status,
      currentIndex: newIdx
    } : null);
    setLightboxZoom(1);
    setLightboxRotation(0);
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Real-time Firestore synchronization for Agents & Properties in Admin Dashboard
  useEffect(() => {
    let unsubUsers = () => {};
    let unsubListings = () => {};

    try {
      // 1. Real-time Users / Agents listener
      const usersCol = collection(db, 'users');
      unsubUsers = onSnapshot(usersCol, (snapshot) => {
        if (!snapshot.empty) {
          const firestoreUsers = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
          const agentUsers = firestoreUsers.filter((u: any) => u.role === 'agent');

          if (agentUsers.length > 0) {
            setAgents(prevAgents => {
              const fsMap = new Map<string, any>(agentUsers.map((a: any) => [a.id, a]));
              const updated = prevAgents.map(prevA => {
                if (fsMap.has(prevA.id)) {
                  const fsA = fsMap.get(prevA.id)!;
                  const isApproved = fsA.businessVerificationStatus === 'approved' || fsA.isVerifiedAgent === true;
                  return {
                    ...prevA,
                    ...fsA,
                    isVerifiedAgent: isApproved,
                    status: fsA.status || (isApproved ? 'verified' : fsA.businessVerificationStatus === 'rejected' ? 'rejected' : 'pending'),
                    businessVerificationStatus: fsA.businessVerificationStatus || (isApproved ? 'approved' : 'pending'),
                    rejectionReason: fsA.rejectionReason || prevA.rejectionReason
                  };
                }
                return prevA;
              });

              const existingIds = new Set(prevAgents.map(a => a.id));
              const brandNew = agentUsers.filter((a: any) => !existingIds.has(a.id)).map((a: any) => {
                const isApproved = a.businessVerificationStatus === 'approved' || a.isVerifiedAgent === true;
                return {
                  ...a,
                  propertiesCount: 0,
                  proofType: a.licenseNumber ? 'CAC Registration Proof' : 'Business Verification Proof',
                  isVerifiedAgent: isApproved,
                  status: a.status || (isApproved ? 'verified' : a.businessVerificationStatus === 'rejected' ? 'rejected' : 'pending'),
                  businessVerificationStatus: a.businessVerificationStatus || (isApproved ? 'approved' : 'pending')
                };
              });

              return [...updated, ...brandNew];
            });
          }
        }
      }, (err) => console.warn('Admin users snapshot listener error:', err));

      // 2. Real-time Properties / Listings listener
      const listingsCol = collection(db, 'listings');
      unsubListings = onSnapshot(listingsCol, (snapshot) => {
        if (!snapshot.empty) {
          const liveProps: Listing[] = snapshot.docs
            .map(docSnap => {
              try {
                return normalizeListing(docSnap.data(), docSnap.id);
              } catch (e) {
                return null;
              }
            })
            .filter((p): p is Listing => p !== null);

          setProperties(liveProps);
        }
      }, (err) => console.warn('Admin listings snapshot listener error:', err));
    } catch (err) {
      console.warn('Real-time admin listeners setup error:', err);
    }

    return () => {
      unsubUsers();
      unsubListings();
    };
  }, []);

  // Dynamically recalculate admin statistics whenever agents or properties change
  useEffect(() => {
    if (agents.length === 0 && properties.length === 0) return;

    const verifiedA = agents.filter(a => a.isVerifiedAgent || a.businessVerificationStatus === 'approved').length;
    const pendingA = agents.filter(a => !a.isVerifiedAgent && a.status !== 'rejected' && a.businessVerificationStatus !== 'rejected').length;
    const approvedL = properties.filter(p => p.status === 'approved' || p.verificationStatus === 'approved').length;
    const pendingL = properties.filter(p => p.status === 'pending' || p.verificationStatus === 'pending').length;

    setStats(prev => ({
      ...prev,
      verifiedAgents: verifiedA,
      pendingAgents: pendingA,
      totalListings: properties.length,
      approvedListings: approvedL,
      pendingListings: pendingL,
      pendingReviews: pendingA + pendingL
    }));
  }, [agents, properties]);

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, agentsRes, propsRes, studentsRes, analyticsRes, adminsRes] = await Promise.allSettled([
        fetchAdminStats(),
        fetchAdminAgents(),
        fetchAdminProperties(),
        fetchStudentOverview(),
        fetchAdminAnalytics(),
        fetchAdministrators()
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (agentsRes.status === 'fulfilled' && Array.isArray(agentsRes.value)) setAgents(agentsRes.value);
      if (propsRes.status === 'fulfilled' && Array.isArray(propsRes.value)) setProperties(propsRes.value);
      if (studentsRes.status === 'fulfilled') setStudentData(studentsRes.value);
      if (analyticsRes.status === 'fulfilled') setAnalyticsData(analyticsRes.value);
      if (adminsRes.status === 'fulfilled' && Array.isArray(adminsRes.value)) setAdministrators(adminsRes.value);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdministrator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmailInput.trim()) return;
    setIsAddingEmail(true);
    setEmailNotice(null);
    try {
      const updated = await addAdministrator(newAdminEmailInput.trim(), newAdminRoleInput);
      setAdministrators(updated);
      setEmailNotice({ 
        type: 'success', 
        msg: `Administrator '${newAdminEmailInput.trim()}' granted ${newAdminRoleInput} access and saved in Firestore.` 
      });
      setNewAdminEmailInput('');
      setNewAdminRoleInput('ADMIN');
    } catch (err: any) {
      setEmailNotice({ type: 'error', msg: err.message || 'Failed to authorize administrator.' });
    } finally {
      setIsAddingEmail(false);
    }
  };

  const handleRemoveAdministrator = async (emailToRemove: string) => {
    if (emailToRemove === 'buildsafe247@gmail.com') {
      setEmailNotice({ type: 'error', msg: 'The initial Super Admin (buildsafe247@gmail.com) cannot be removed.' });
      return;
    }
    if (!confirm(`Are you sure you want to revoke administrator access for ${emailToRemove}?`)) return;
    setEmailNotice(null);
    try {
      const updated = await removeAdministrator(emailToRemove);
      setAdministrators(updated);
      setEmailNotice({ type: 'success', msg: `Administrator '${emailToRemove}' access revoked.` });
    } catch (err: any) {
      setEmailNotice({ type: 'error', msg: err.message || 'Failed to revoke administrator access.' });
    }
  };

  const handleToggleRole = async (adminToToggle: AuthorizedAdmin) => {
    const targetEmail = adminToToggle.email;
    const newRole: AdminRole = adminToToggle.role === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN';

    if (targetEmail === 'buildsafe247@gmail.com' && newRole !== 'SUPER_ADMIN') {
      setEmailNotice({ type: 'error', msg: 'The initial Super Admin must maintain the SUPER_ADMIN role.' });
      return;
    }

    setEmailNotice(null);
    try {
      const updated = await updateAdministratorRole(targetEmail, newRole);
      setAdministrators(updated);
      setEmailNotice({ type: 'success', msg: `Administrator '${targetEmail}' role changed to ${newRole}.` });
    } catch (err: any) {
      setEmailNotice({ type: 'error', msg: err.message || 'Failed to update administrator role.' });
    }
  };

  const handleVerifyAgent = async (agentId: string) => {
    try {
      const adminEmail = currentAdminEmail || 'buildsafe247@gmail.com';
      await updateAgentVerificationInFirestore(agentId, 'approved', adminEmail);
      await updateAdminAgentStatus(agentId, 'verified');
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isVerifiedAgent: true, status: 'approved', businessVerificationStatus: 'approved' } : a));
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
      const adminEmail = currentAdminEmail || 'buildsafe247@gmail.com';
      await updateAgentVerificationInFirestore(agentId, 'rejected', adminEmail, reason);
      await updateAdminAgentStatus(agentId, 'rejected', reason);
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isVerifiedAgent: false, status: 'rejected', businessVerificationStatus: 'rejected', rejectionReason: reason } : a));
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

  const handleRemoveAgent = async (agentId: string, reason?: string) => {
    try {
      const adminEmail = currentAdminEmail || 'buildsafe247@gmail.com';
      const cleanReason = reason || 'Agent status revoked by administrator.';
      await updateAgentVerificationInFirestore(agentId, 'removed', adminEmail, cleanReason);
      await updateAdminAgentStatus(agentId, 'rejected', cleanReason);
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isVerifiedAgent: false, status: 'removed', businessVerificationStatus: 'removed', rejectionReason: cleanReason } : a));
      setConfirmRemoveModal(null);
      setRemoveReasonText('');
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to remove agent.');
    }
  };

  const handleApproveProperty = async (propertyId: string) => {
    try {
      const adminEmail = currentAdminEmail || 'buildsafe247@gmail.com';
      const targetListing = properties.find(p => p.id === propertyId);
      await updatePropertyVerificationInFirestore(propertyId, 'approved', adminEmail, undefined, targetListing?.agentId);
      await updateAdminPropertyStatus(propertyId, 'approved');
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'approved', isVerified: true } : p));
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
      const adminEmail = currentAdminEmail || 'buildsafe247@gmail.com';
      const targetListing = properties.find(p => p.id === propertyId);
      await updatePropertyVerificationInFirestore(propertyId, status, adminEmail, reason, targetListing?.agentId);
      await updateAdminPropertyStatus(propertyId, status, reason);
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: status, rejectionReason: reason, aiBanReason: reason, isVerified: false } : p));
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

  const handleRemoveProperty = async (propertyId: string, reason?: string) => {
    try {
      const adminEmail = currentAdminEmail || 'buildsafe247@gmail.com';
      const targetListing = properties.find(p => p.id === propertyId);
      const cleanReason = reason || 'Listing removed from platform by administrator.';
      await updatePropertyVerificationInFirestore(propertyId, 'removed', adminEmail, cleanReason, targetListing?.agentId);
      await updateAdminPropertyStatus(propertyId, 'banned', cleanReason);
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'removed', isVerified: false, rejectionReason: cleanReason } : p));
      setConfirmRemoveModal(null);
      setRemoveReasonText('');
      if (selectedProperty && selectedProperty.id === propertyId) {
        setSelectedProperty(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to remove property listing.');
    }
  };

  const handleLogoutClick = async () => {
    await adminLogout();
    onAdminLogout();
  };

  // Helper getters for Verification Proof & History
  const getAgentDocuments = (agent: any) => {
    const docs = [];
    const bvd = agent.businessVerificationDetails || {};
    
    docs.push({
      title: bvd.documentName || agent.proofType || 'Government Issued Identification / CAC Registration',
      type: 'CAC Certificate / ID',
      url: bvd.documentUrl || agent.documentUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      submittedAt: bvd.submittedAt || agent.createdAt || new Date().toISOString(),
      status: agent.isVerifiedAgent ? 'Verified Document' : agent.status === 'rejected' ? 'Rejected' : agent.status === 'removed' ? 'Revoked' : 'Pending Verification'
    });

    docs.push({
      title: 'Proof of Property Management & Office Location',
      type: 'Business License',
      url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      submittedAt: bvd.submittedAt || agent.createdAt || new Date().toISOString(),
      status: agent.isVerifiedAgent ? 'Verified Document' : agent.status === 'rejected' ? 'Rejected' : agent.status === 'removed' ? 'Revoked' : 'Pending Verification'
    });

    if (bvd.portraitPhotoUrl || agent.verificationPhotoUrl || agent.avatarUrl) {
      docs.push({
        title: 'Agent Identity Photo & Live Face Verification',
        type: 'Portrait Photo',
        url: bvd.portraitPhotoUrl || agent.verificationPhotoUrl || agent.avatarUrl,
        submittedAt: bvd.submittedAt || agent.createdAt || new Date().toISOString(),
        status: 'Identity Matched'
      });
    }

    return docs;
  };

  const getPropertyVerificationProof = (property: Listing) => {
    const docs = [];
    docs.push({
      title: property.verificationProofName || 'Hostel Ownership / Caretaker Authorization Deed',
      type: 'Title / Deed Proof',
      url: property.verificationProofUrl || property.photos?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
      submittedAt: property.createdAt || new Date().toISOString(),
      status: property.status === 'approved' ? 'Verified Deed' : property.status === 'changes_requested' ? 'Action Required' : property.status === 'rejected' ? 'Rejected' : property.status === 'removed' ? 'Removed' : 'Pending Inspection'
    });

    docs.push({
      title: 'Physical Campus Field Inspection & Safety Verification Log',
      type: 'Inspection Report',
      url: property.photos?.[1] || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=600&q=80',
      submittedAt: property.createdAt || new Date().toISOString(),
      status: 'Field Verified'
    });

    return docs;
  };

  const getVerificationHistory = (item: any, type: 'agent' | 'property') => {
    if (item.verificationHistory && Array.isArray(item.verificationHistory) && item.verificationHistory.length > 0) {
      return item.verificationHistory;
    }
    const history = [
      {
        id: `hist_init_${item.id}`,
        action: type === 'agent' ? 'Application Submitted' : 'Listing Submitted',
        status: 'pending',
        timestamp: item.createdAt || new Date().toISOString(),
        adminEmail: item.email || item.agent?.email || 'System Log',
        reason: null
      }
    ];

    if (item.isVerifiedAgent || item.status === 'approved' || item.status === 'verified') {
      history.push({
        id: `hist_approved_${item.id}`,
        action: type === 'agent' ? 'Agent Verified' : 'Listing Approved',
        status: type === 'agent' ? 'verified' : 'approved',
        timestamp: item.verifiedAt || item.verificationUpdatedAt || new Date().toISOString(),
        adminEmail: item.verifiedBy || 'buildsafe247@gmail.com',
        reason: null
      });
    }

    if (item.status === 'changes_requested') {
      history.push({
        id: `hist_changes_${item.id}`,
        action: 'Changes Requested',
        status: 'changes_requested',
        timestamp: item.verificationUpdatedAt || new Date().toISOString(),
        adminEmail: item.rejectedBy || 'buildsafe247@gmail.com',
        reason: item.rejectionReason || 'Please update property details as requested.'
      });
    }

    if (item.status === 'rejected') {
      history.push({
        id: `hist_rejected_${item.id}`,
        action: type === 'agent' ? 'Agent Rejected' : 'Listing Rejected',
        status: 'rejected',
        timestamp: item.rejectedAt || item.verificationUpdatedAt || new Date().toISOString(),
        adminEmail: item.rejectedBy || 'buildsafe247@gmail.com',
        reason: item.rejectionReason || 'Details do not meet verification guidelines.'
      });
    }

    if (item.status === 'removed') {
      history.push({
        id: `hist_removed_${item.id}`,
        action: type === 'agent' ? 'Agent Status Revoked' : 'Listing Removed',
        status: 'removed',
        timestamp: item.removedAt || item.verificationUpdatedAt || new Date().toISOString(),
        adminEmail: item.removedBy || 'buildsafe247@gmail.com',
        reason: item.removalReason || item.rejectionReason || null
      });
    }

    return history;
  };

  // Filter agents by status and search
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      !searchTerm.trim() ||
      agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agencyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return (!agent.isVerifiedAgent && agent.status !== 'rejected' && agent.status !== 'removed') || agent.status === 'pending';
    if (statusFilter === 'verified') return agent.isVerifiedAgent || agent.status === 'verified' || agent.status === 'approved';
    if (statusFilter === 'rejected') return agent.status === 'rejected';
    if (statusFilter === 'removed') return agent.status === 'removed';
    return true;
  });

  // Filter properties by status and search
  const filteredProperties = properties.filter(prop => {
    const matchesSearch = 
      !searchTerm.trim() ||
      prop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.universityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.agent?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') {
      return prop.status === 'pending' || prop.verificationStatus === 'pending' || (!prop.isVerified && prop.status !== 'approved' && prop.status !== 'rejected' && prop.status !== 'banned' && prop.status !== 'removed' && prop.status !== 'changes_requested');
    }
    if (statusFilter === 'approved' || statusFilter === 'verified') return prop.status === 'approved' || prop.isVerified;
    if (statusFilter === 'changes_requested') return prop.status === 'changes_requested';
    if (statusFilter === 'rejected') return prop.status === 'rejected' || prop.status === 'banned';
    if (statusFilter === 'removed') return prop.status === 'removed';
    return true;
  });

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-16">
      
      {/* Top Admin Header Bar */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-30 shadow-2xs">
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
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Verified Admin
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Secure internal dashboard for agent verification, property moderation, and growth analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <ThemeToggle variant="dropdown" />

            <button
              onClick={loadAllAdminData}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
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
                    Pending ({agents.filter(a => (!a.isVerifiedAgent && a.status !== 'rejected' && a.status !== 'removed') || a.status === 'pending').length})
                  </button>

                  <button
                    onClick={() => setStatusFilter('verified')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'verified'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Verified ({agents.filter(a => a.isVerifiedAgent || a.status === 'verified' || a.status === 'approved').length})
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
                    onClick={() => setStatusFilter('removed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'removed'
                        ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Removed ({agents.filter(a => a.status === 'removed').length})
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
                      statusFilter === 'approved' || statusFilter === 'verified'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Approved ({properties.filter(p => p.status === 'approved' || p.isVerified).length})
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
                    onClick={() => setStatusFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'rejected'
                        ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Rejected ({properties.filter(p => p.status === 'rejected' || p.status === 'banned').length})
                  </button>

                  <button
                    onClick={() => setStatusFilter('removed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'removed'
                        ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    Removed ({properties.filter(p => p.status === 'removed').length})
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

                          {agent.isVerifiedAgent || agent.status === 'verified' || agent.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3" />
                              Verified Agent
                            </span>
                          ) : agent.status === 'removed' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                              <XCircle className="w-3 h-3 text-neutral-500" />
                              Status Revoked / Removed
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
                          <span>Submitted: {new Date(agent.createdAt || Date.now()).toLocaleDateString()}</span>
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

                      {!agent.isVerifiedAgent && agent.status !== 'rejected' && agent.status !== 'removed' && (
                        <>
                          <button
                            onClick={() => handleVerifyAgent(agent.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Verify Agent</span>
                          </button>

                          <button
                            onClick={() => setRejectionReasonModal({ type: 'agent', id: agent.id, title: agent.name, mode: 'reject' })}
                            className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {(agent.isVerifiedAgent || agent.status === 'verified' || agent.status === 'approved') && (
                        <button
                          onClick={() => setConfirmRemoveModal({ type: 'agent', item: agent })}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Remove as Agent</span>
                        </button>
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
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>{statusFilter === 'pending' ? 'Pending Accommodation Listings' : statusFilter === 'approved' ? 'Approved & Verified Listings' : statusFilter === 'rejected' ? 'Rejected Listings' : 'Accommodation Listings'}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    statusFilter === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  }`}>
                    {filteredProperties.length} {filteredProperties.length === 1 ? 'Listing' : 'Listings'}
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                  {statusFilter === 'pending'
                    ? 'Listings submitted by agents awaiting administrator verification and approval before appearing on Student Discovery.'
                    : 'Manage listing verification status, inspect property details, or approve/reject submissions.'}
                </p>
              </div>
            </div>

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
                            prop.status === 'approved' || prop.isVerified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' :
                            prop.status === 'changes_requested' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300' :
                            prop.status === 'removed' ? 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-400' :
                            prop.status === 'rejected' || prop.status === 'banned' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          }`}>
                            {prop.status === 'changes_requested' ? 'Changes Requested' : prop.status === 'approved' || prop.isVerified ? 'Approved Listing' : prop.status}
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

                      {prop.status !== 'approved' && !prop.isVerified && prop.status !== 'removed' && (
                        <button
                          onClick={() => handleApproveProperty(prop.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                      )}

                      {prop.status !== 'changes_requested' && prop.status !== 'removed' && (
                        <button
                          type="button"
                          onClick={() => setRejectionReasonModal({ type: 'property', id: prop.id, title: prop.title, mode: 'changes' })}
                          className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>Request Changes</span>
                        </button>
                      )}

                      {prop.status !== 'rejected' && prop.status !== 'banned' && prop.status !== 'removed' && (
                        <button
                          type="button"
                          onClick={() => setRejectionReasonModal({ type: 'property', id: prop.id, title: prop.title, mode: 'reject' })}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}

                      {(prop.status === 'approved' || prop.isVerified) && (
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveModal({ type: 'property', item: prop })}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Remove Listing</span>
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
                <p className="text-[11px] font-semibold text-neutral-500 mt-1">Monthly onboarding intake</p>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                      Admin Role-Based Access Control (RBAC)
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium">
                      Authorized email accounts stored in Firestore collection <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-600 dark:text-emerald-400">authorized_admins</code>.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-400 block">Your Role</span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${
                    currentAdminRole === 'SUPER_ADMIN' 
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {currentAdminRole}
                  </span>
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

            {/* Add New Administrator Form Card (SUPER_ADMIN ONLY) */}
            {currentAdminRole === 'SUPER_ADMIN' ? (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xs space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Authorize New Administrator Account
                </h4>
                <form onSubmit={handleAddAdministrator} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={newAdminEmailInput}
                      onChange={(e) => setNewAdminEmailInput(e.target.value)}
                      placeholder="Enter administrator email (e.g. admin@gmail.com)"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-500"
                    />
                  </div>
                  <select
                    value={newAdminRoleInput}
                    onChange={(e) => setNewAdminRoleInput(e.target.value as AdminRole)}
                    className="py-3 px-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-bold focus:outline-none"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isAddingEmail || !newAdminEmailInput.trim()}
                    className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Grant Access</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Super Admin privileges are required to add or modify administrator accounts.</span>
              </div>
            )}

            {/* List of Authorized Administrators */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Authorized Administrators ({administrators.length})
                </h4>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Firebase Auth + Firestore Sync
                </span>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {administrators.map((admin) => (
                  <div key={admin.email} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        admin.role === 'SUPER_ADMIN' 
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400' 
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-neutral-900 dark:text-white font-mono">
                            {admin.email}
                          </p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            admin.role === 'SUPER_ADMIN' 
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {admin.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium flex items-center gap-1 mt-0.5">
                          Added by {admin.addedBy} • Active
                        </p>
                      </div>
                    </div>

                    {currentAdminRole === 'SUPER_ADMIN' && admin.email !== 'buildsafe247@gmail.com' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleRole(admin)}
                          className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-extrabold text-[11px] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          Switch to {admin.role === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdministrator(admin.email)}
                          title="Revoke access"
                          className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedAgent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                  alt={selectedAgent.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-700" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">{selectedAgent.name}</h3>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      selectedAgent.isVerifiedAgent || selectedAgent.status === 'verified' || selectedAgent.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' :
                      selectedAgent.status === 'removed' ? 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-400' :
                      selectedAgent.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                    }`}>
                      {selectedAgent.isVerifiedAgent || selectedAgent.status === 'verified' ? 'Verified Agent' : selectedAgent.status}
                    </span>
                  </div>
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

            {/* Agent Information Grid */}
            <div className="space-y-2">
              <h4 className="font-extrabold uppercase text-[11px] tracking-wider text-neutral-400">Agent Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                  <p className="font-extrabold uppercase text-[10px] text-neutral-400">Full Name</p>
                  <p className="font-bold text-neutral-900 dark:text-white">{selectedAgent.name}</p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                  <p className="font-extrabold uppercase text-[10px] text-neutral-400">Email Address</p>
                  <p className="font-bold text-neutral-900 dark:text-white">{selectedAgent.email || 'N/A'}</p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                  <p className="font-extrabold uppercase text-[10px] text-neutral-400">Phone Number</p>
                  <p className="font-bold text-neutral-900 dark:text-white">{selectedAgent.phone || 'N/A'}</p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                  <p className="font-extrabold uppercase text-[10px] text-neutral-400">Date Joined</p>
                  <p className="font-bold text-neutral-900 dark:text-white">
                    {new Date(selectedAgent.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                  <p className="font-extrabold uppercase text-[10px] text-neutral-400">Submitted Properties</p>
                  <p className="font-bold text-neutral-900 dark:text-white">{selectedAgent.propertiesCount || selectedAgent.totalProperties || 0} Accommodation Listings</p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                  <p className="font-extrabold uppercase text-[10px] text-neutral-400">License / Proof Type</p>
                  <p className="font-bold text-neutral-900 dark:text-white">{selectedAgent.proofType || selectedAgent.licenseNumber || 'CAC Registration Certificate'}</p>
                </div>
              </div>
            </div>

            {selectedAgent.bio && (
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Business Overview & Bio</p>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">{selectedAgent.bio}</p>
              </div>
            )}

            {/* Dedicated Verification Proof Section */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-extrabold uppercase text-[11px] tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Verification Proof Documents
                </p>
                <span className="text-[10px] font-bold text-neutral-400">
                  {getAgentDocuments(selectedAgent).length} Files Attached
                </span>
              </div>

              <div className="space-y-2">
                {getAgentDocuments(selectedAgent).map((doc, i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        onClick={() => {
                          const agentDocs = getAgentDocuments(selectedAgent);
                          setLightboxMedia({ 
                            url: doc.url, 
                            title: doc.title, 
                            type: doc.type.includes('Image') ? 'image' : 'document',
                            docType: doc.type,
                            submittedAt: doc.submittedAt,
                            status: doc.status,
                            items: agentDocs,
                            currentIndex: i,
                            parentType: 'agent',
                            parentId: selectedAgent.id
                          });
                          setLightboxZoom(1);
                          setLightboxRotation(0);
                        }}
                        className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 cursor-pointer group relative border border-neutral-300 dark:border-neutral-600"
                      >
                        <img src={doc.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-neutral-900 dark:text-white truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>Submitted: {new Date(doc.submittedAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          const agentDocs = getAgentDocuments(selectedAgent);
                          setLightboxMedia({ 
                            url: doc.url, 
                            title: doc.title, 
                            type: doc.type.includes('Image') ? 'image' : 'document',
                            docType: doc.type,
                            submittedAt: doc.submittedAt,
                            status: doc.status,
                            items: agentDocs,
                            currentIndex: i,
                            parentType: 'agent',
                            parentId: selectedAgent.id
                          });
                          setLightboxZoom(1);
                          setLightboxRotation(0);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification History Timeline Section */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h4 className="font-extrabold uppercase text-[11px] tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                Verification History Log
              </h4>

              <div className="space-y-3 pl-2 border-l-2 border-neutral-200 dark:border-neutral-800">
                {getVerificationHistory(selectedAgent, 'agent').map((h: any, i: number) => (
                  <div key={h.id || i} className="relative pl-4 space-y-0.5">
                    <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-neutral-900" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-neutral-900 dark:text-white">{h.action}</span>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {h.timestamp ? new Date(h.timestamp).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Processed by: <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{h.adminEmail || 'Admin'}</strong>
                    </p>
                    {h.reason && (
                      <p className="text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-2 rounded-xl mt-1 border border-rose-200 dark:border-rose-900/50">
                        <strong>Reason/Note:</strong> "{h.reason}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Close Review
              </button>

              <div className="flex items-center gap-2">
                {!selectedAgent.isVerifiedAgent && selectedAgent.status !== 'rejected' && selectedAgent.status !== 'removed' && (
                  <>
                    <button
                      onClick={() => setRejectionReasonModal({ type: 'agent', id: selectedAgent.id, title: selectedAgent.name, mode: 'reject' })}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-all cursor-pointer"
                    >
                      Reject Application
                    </button>

                    <button
                      onClick={() => handleVerifyAgent(selectedAgent.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Verify & Approve Agent
                    </button>
                  </>
                )}

                {(selectedAgent.isVerifiedAgent || selectedAgent.status === 'verified' || selectedAgent.status === 'approved') && (
                  <button
                    onClick={() => {
                      const agentToMove = selectedAgent;
                      setSelectedAgent(null);
                      setConfirmRemoveModal({ type: 'agent', item: agentToMove });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Remove as Agent</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: Inspect Property */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white">{selectedProperty.title}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    selectedProperty.status === 'approved' || selectedProperty.isVerified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' :
                    selectedProperty.status === 'changes_requested' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300' :
                    selectedProperty.status === 'removed' ? 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-400' :
                    selectedProperty.status === 'rejected' || selectedProperty.status === 'banned' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                  }`}>
                    {selectedProperty.status === 'changes_requested' ? 'Changes Requested' : selectedProperty.status === 'approved' || selectedProperty.isVerified ? 'Approved Listing' : selectedProperty.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-neutral-500">{selectedProperty.address} ({selectedProperty.universityName})</p>
              </div>
              <button 
                onClick={() => setSelectedProperty(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Property Media Gallery */}
            <div className="space-y-2">
              <h4 className="font-extrabold uppercase text-[11px] tracking-wider text-neutral-400">Property Media Gallery</h4>
              {selectedProperty.photos && selectedProperty.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedProperty.photos.map((photo, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        const photoItems = selectedProperty.photos.map((p: string, idx: number) => ({
                          url: p,
                          title: `${selectedProperty.title} - Photo ${idx + 1}`,
                          type: 'Property Photo',
                          submittedAt: selectedProperty.createdAt,
                          status: selectedProperty.status
                        }));
                        setLightboxMedia({
                          url: photo,
                          title: `${selectedProperty.title} - Photo ${i + 1}`,
                          type: 'image',
                          docType: 'Property Photo',
                          items: photoItems,
                          currentIndex: i,
                          parentType: 'property',
                          parentId: selectedProperty.id
                        });
                        setLightboxZoom(1);
                        setLightboxRotation(0);
                      }}
                      className="group relative h-28 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                    >
                      <img 
                        src={photo} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic">No media photos attached.</p>
              )}
            </div>

            {/* Property Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-0.5">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Annual Rent</p>
                <p className="font-black text-base text-emerald-600">
                  ₦{selectedProperty.pricePerYear?.toLocaleString() || (selectedProperty.pricePerWeek ? selectedProperty.pricePerWeek * 52 : 350000).toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-0.5">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Walking Distance</p>
                <p className="font-black text-base text-neutral-900 dark:text-white">
                  {selectedProperty.walkingDistanceMinutes || 5} mins to Campus Gate
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-0.5">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Submitting Agent</p>
                <p className="font-bold text-neutral-900 dark:text-white">{selectedProperty.agent?.name || 'Verified Agent'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-0.5">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">University Campus</p>
                <p className="font-bold text-neutral-900 dark:text-white">{selectedProperty.universityName}</p>
              </div>
            </div>

            {selectedProperty.description && (
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                <p className="font-extrabold uppercase text-[10px] text-neutral-400">Property Description</p>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">{selectedProperty.description}</p>
              </div>
            )}

            {/* Dedicated Listing Verification Proof Section */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-extrabold uppercase text-[11px] tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Listing Verification Proof
                </p>
                <span className="text-[10px] font-bold text-neutral-400">
                  {getPropertyVerificationProof(selectedProperty).length} Files Attached
                </span>
              </div>

              <div className="space-y-2">
                {getPropertyVerificationProof(selectedProperty).map((doc, i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        onClick={() => {
                          const propDocs = getPropertyVerificationProof(selectedProperty);
                          setLightboxMedia({ 
                            url: doc.url, 
                            title: doc.title, 
                            type: 'document',
                            docType: doc.type,
                            status: doc.status,
                            items: propDocs,
                            currentIndex: i,
                            parentType: 'property',
                            parentId: selectedProperty.id
                          });
                          setLightboxZoom(1);
                          setLightboxRotation(0);
                        }}
                        className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 cursor-pointer group relative border border-neutral-300 dark:border-neutral-600"
                      >
                        <img src={doc.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-neutral-900 dark:text-white truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>{doc.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          const propDocs = getPropertyVerificationProof(selectedProperty);
                          setLightboxMedia({ 
                            url: doc.url, 
                            title: doc.title, 
                            type: 'document',
                            docType: doc.type,
                            status: doc.status,
                            items: propDocs,
                            currentIndex: i,
                            parentType: 'property',
                            parentId: selectedProperty.id
                          });
                          setLightboxZoom(1);
                          setLightboxRotation(0);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Listing Verification History Timeline */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h4 className="font-extrabold uppercase text-[11px] tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                Listing Moderation & Verification History
              </h4>

              <div className="space-y-3 pl-2 border-l-2 border-neutral-200 dark:border-neutral-800">
                {getVerificationHistory(selectedProperty, 'property').map((h: any, i: number) => (
                  <div key={h.id || i} className="relative pl-4 space-y-0.5">
                    <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-neutral-900" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-neutral-900 dark:text-white">{h.action}</span>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {h.timestamp ? new Date(h.timestamp).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Processed by: <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{h.adminEmail || 'Admin'}</strong>
                    </p>
                    {h.reason && (
                      <p className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-2 rounded-xl mt-1 border border-amber-200 dark:border-amber-900/50">
                        <strong>Action Notes:</strong> "{h.reason}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setSelectedProperty(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Close Inspect
              </button>

              <div className="flex items-center gap-2">
                {selectedProperty.status !== 'approved' && !selectedProperty.isVerified && selectedProperty.status !== 'removed' && (
                  <>
                    <button
                      onClick={() => setRejectionReasonModal({ type: 'property', id: selectedProperty.id, title: selectedProperty.title, mode: 'changes' })}
                      className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-bold text-xs transition-all cursor-pointer"
                    >
                      Request Changes
                    </button>

                    <button
                      onClick={() => setRejectionReasonModal({ type: 'property', id: selectedProperty.id, title: selectedProperty.title, mode: 'reject' })}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-all cursor-pointer"
                    >
                      Reject Listing
                    </button>

                    <button
                      onClick={() => handleApproveProperty(selectedProperty.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Property</span>
                    </button>
                  </>
                )}

                {(selectedProperty.status === 'approved' || selectedProperty.isVerified) && (
                  <button
                    onClick={() => {
                      const propToMove = selectedProperty;
                      setSelectedProperty(null);
                      setConfirmRemoveModal({ type: 'property', item: propToMove });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Remove Listing</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rejection or Request Changes Reason */}
      {rejectionReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
              {rejectionReasonModal.mode === 'changes' ? 'Request Changes for ' : 'Specify Rejection Reason for '} {rejectionReasonModal.title}
            </h3>

            <textarea
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              placeholder={rejectionReasonModal.mode === 'changes' ? "Explain required changes (e.g. 'Upload clearer room photos' or 'Update rent terms')..." : "Specify rejection reason..."}
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
                    const statusType = rejectionReasonModal.mode === 'changes' ? 'changes_requested' : 'rejected';
                    handleRejectProperty(rejectionReasonModal.id, statusType, rejectionReasonText || (statusType === 'changes_requested' ? 'Please update property details.' : 'Listing rejected by admin.'));
                  }
                }}
                className={`px-4 py-2 rounded-xl text-white font-extrabold text-xs shadow-xs ${
                  rejectionReasonModal.mode === 'changes' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Submit Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Destructive Remove Agent or Property */}
      {confirmRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-rose-200 dark:border-rose-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                  Remove {confirmRemoveModal.type === 'agent' ? 'Agent Access' : 'Listing'}?
                </h3>
                <p className="text-xs text-neutral-500">
                  {confirmRemoveModal.type === 'agent' 
                    ? `Revoke agent verification status for ${confirmRemoveModal.item.name}.`
                    : `Remove listing "${confirmRemoveModal.item.title}" from Dormiqa platform.`}
                </p>
              </div>
            </div>

            {confirmRemoveModal.type === 'agent' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs font-bold text-amber-900 dark:text-amber-300">
                ⚠️ Warning: This agent currently has {
                  properties.filter(p => p.agentId === confirmRemoveModal.item.id || p.agent?.name === confirmRemoveModal.item.name).length
                } active accommodation listing(s). Revoking status will lock agent privileges.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-neutral-400">Reason for Removal (Optional)</label>
              <textarea
                value={removeReasonText}
                onChange={(e) => setRemoveReasonText(e.target.value)}
                placeholder="Specify administrative reason for removal..."
                rows={3}
                className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setConfirmRemoveModal(null);
                  setRemoveReasonText('');
                }}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmRemoveModal.type === 'agent') {
                    handleRemoveAgent(confirmRemoveModal.item.id, removeReasonText);
                  } else {
                    handleRemoveProperty(confirmRemoveModal.item.id, removeReasonText);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FULL-SCREEN DOCUMENT & MEDIA VIEWER */}
      {lightboxMedia && (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200 overflow-hidden">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-neutral-900/90 border-b border-neutral-800 backdrop-blur-md z-20 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white truncate">
                    {lightboxMedia.title || 'Document Preview'}
                  </h3>
                  {lightboxMedia.docType && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {lightboxMedia.docType}
                    </span>
                  )}
                  {lightboxMedia.items && lightboxMedia.items.length > 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {(lightboxMedia.currentIndex ?? 0) + 1} of {lightboxMedia.items.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 truncate">
                  {lightboxMedia.submittedAt ? `Submitted: ${new Date(lightboxMedia.submittedAt).toLocaleDateString()}` : 'Verification Proof Document'}
                </p>
              </div>
            </div>

            {/* Lightbox Controls Toolbar */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setLightboxZoom(prev => Math.max(prev - 0.25, 0.5))}
                className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setLightboxZoom(1);
                  setLightboxRotation(0);
                }}
                className="px-2.5 py-1 text-xs font-mono font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                title="Reset Zoom (100%)"
              >
                {Math.round(lightboxZoom * 100)}%
              </button>

              <button
                type="button"
                onClick={() => setLightboxZoom(prev => Math.min(prev + 0.25, 3.5))}
                className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-neutral-800 mx-1" />

              <button
                type="button"
                onClick={() => setLightboxRotation(prev => (prev + 90) % 360)}
                className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Rotate 90° Clockwise (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setLightboxFit(prev => prev === 'contain' ? 'cover' : 'contain')}
                className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Toggle Fit Mode"
              >
                {lightboxFit === 'contain' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              <a
                href={lightboxMedia.url}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-xl text-neutral-300 hover:text-emerald-400 hover:bg-neutral-800 transition-colors"
                title="Download / Open Original Document"
              >
                <Download className="w-4 h-4" />
              </a>

              <div className="w-px h-5 bg-neutral-800 mx-1" />

              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-rose-950/60 transition-colors cursor-pointer"
                title="Close Lightbox (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Stage Canvas */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto z-10">
            {/* Prev Navigation Button */}
            {lightboxMedia.items && lightboxMedia.items.length > 1 && (
              <button
                type="button"
                onClick={handleLightboxPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700/60 shadow-2xl transition-all hover:scale-105 z-30 cursor-pointer"
                title="Previous Document (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Document Image Display with Transform */}
            <div className="flex items-center justify-center w-full h-full max-h-[78vh] transition-transform duration-150 ease-out">
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title || 'Document preview'}
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                  objectFit: lightboxFit,
                }}
                className="max-h-[75vh] max-w-[90vw] w-auto h-auto rounded-xl shadow-2xl transition-transform duration-200 cursor-grab active:cursor-grabbing border border-neutral-800/80"
              />
            </div>

            {/* Next Navigation Button */}
            {lightboxMedia.items && lightboxMedia.items.length > 1 && (
              <button
                type="button"
                onClick={handleLightboxNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700/60 shadow-2xl transition-all hover:scale-105 z-30 cursor-pointer"
                title="Next Document (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Toolbar & Thumbnail Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 bg-neutral-900/90 border-t border-neutral-800 backdrop-blur-md z-20 shrink-0">
            {/* Document Shortcuts Info */}
            <div className="flex items-center gap-3 text-[11px] text-neutral-400">
              <span className="hidden md:inline font-mono text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-300 border border-neutral-700">
                Shortcuts: [←/→] Nav • [+/ -] Zoom • [R] Rotate • [ESC] Close
              </span>
            </div>

            {/* Thumbnail Carousel Strip */}
            {lightboxMedia.items && lightboxMedia.items.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-md py-1 px-2 bg-neutral-950/60 rounded-xl border border-neutral-800">
                {lightboxMedia.items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setLightboxMedia({
                        ...lightboxMedia,
                        url: item.url,
                        title: item.title,
                        docType: item.type,
                        submittedAt: item.submittedAt,
                        status: item.status,
                        currentIndex: idx
                      });
                      setLightboxZoom(1);
                      setLightboxRotation(0);
                    }}
                    className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      idx === lightboxMedia.currentIndex
                        ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/20'
                        : 'border-neutral-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Quick Actions inside Lightbox */}
            <div className="flex items-center gap-2">
              {lightboxMedia.parentType === 'agent' && selectedAgent && !selectedAgent.isVerifiedAgent && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const agentId = selectedAgent.id;
                      setLightboxMedia(null);
                      setRejectionReasonModal({ type: 'agent', id: agentId, title: selectedAgent.name, mode: 'reject' });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Reject Agent
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const agentId = selectedAgent.id;
                      setLightboxMedia(null);
                      handleVerifyAgent(agentId);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve Agent</span>
                  </button>
                </>
              )}

              {lightboxMedia.parentType === 'property' && selectedProperty && selectedProperty.status !== 'approved' && !selectedProperty.isVerified && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const propId = selectedProperty.id;
                      const propTitle = selectedProperty.title;
                      setLightboxMedia(null);
                      setRejectionReasonModal({ type: 'property', id: propId, title: propTitle, mode: 'changes' });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900 border border-blue-800 text-blue-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Request Changes
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const propId = selectedProperty.id;
                      setLightboxMedia(null);
                      handleApproveProperty(propId);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Property</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
