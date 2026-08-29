import React, { useState } from 'react';
import { 
  Building2, 
  MessageSquare, 
  Calendar, 
  ShieldCheck, 
  User as UserIcon, 
  Lock, 
  Bell, 
  Palette, 
  Globe, 
  FileText, 
  Shield, 
  LogOut, 
  ChevronRight,
  CheckCircle2,
  MapPin,
  Mail,
  Briefcase,
  X,
  Check,
  Save,
  KeyRound,
  Smartphone,
  Phone,
  Send
} from 'lucide-react';
import { User, University } from '../types';
import { auth, sendPasswordReset, saveUserToFirestore } from '../services/firebase';
import { ThemeToggle } from './ThemeToggle';
import { UniversitySelector } from './UniversitySelector';

interface AgentProfilePageProps {
  user?: Partial<User> | null;
  universities?: University[];
  hostelsCount?: number;
  chatsCount?: number;
  inspectionsCount?: number;
  onNavigateSection: (section: 'hostels' | 'inbox' | 'calendar' | 'verification' | 'business') => void;
  onSignOut: () => void;
  onOpenInfoPage?: (docId: string) => void;
}

export const AgentProfilePage: React.FC<AgentProfilePageProps> = ({
  user,
  universities = [],
  hostelsCount = 0,
  chatsCount = 0,
  inspectionsCount = 0,
  onNavigateSection,
  onSignOut,
  onOpenInfoPage
}) => {
  // Modal states for the 5 General items
  const [activeModal, setActiveModal] = useState<'profile' | 'security' | 'notifications' | 'language' | null>(null);

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || auth.currentUser?.displayName || 'Agent Manager');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '08012345678');
  const [profileAgency, setProfileAgency] = useState(user?.agencyName || 'Verified Accommodation Management');
  const [profileUniId, setProfileUniId] = useState(user?.universityId || 'uniosun');
  const [profileLocation, setProfileLocation] = useState(user?.universityName || 'Osun State University (UNIOSUN)');
  const [profileToast, setProfileToast] = useState('');

  // Security State
  const [resetSent, setResetSent] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState({
    emailEnquiries: true,
    whatsappReminders: true,
    pushAlerts: true,
    weeklySummary: false
  });

  // Language State
  const [selectedLanguage, setSelectedLanguage] = useState('English (Nigeria)');

  const name = profileName;
  const agencyName = profileAgency;
  const universityLocation = profileLocation;

  const email = user?.email || auth.currentUser?.email || 'dormiqa.ng@gmail.com';
  const isVerified = user?.isVerifiedAgent || user?.businessVerificationStatus === 'approved';
  const avatarUrl = user?.avatarUrl || auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUid = auth.currentUser?.uid || user?.id;
    if (!currentUid) {
      setProfileToast('Authentication required to save profile.');
      return;
    }
    const updatedUserData: User = {
      id: currentUid,
      name: profileName,
      phone: profilePhone,
      agencyName: profileAgency,
      universityId: profileUniId,
      universityName: profileLocation,
      email: user?.email || auth.currentUser?.email || '',
      role: (user?.role as 'agent' | 'student' | 'admin') || 'agent',
      isVerifiedAgent: Boolean(user?.isVerifiedAgent || user?.businessVerificationStatus === 'approved'),
      businessVerificationStatus: user?.businessVerificationStatus || 'none',
      avatarUrl: user?.avatarUrl || auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
      createdAt: user?.createdAt || new Date().toISOString().split('T')[0]
    };
    try {
      await saveUserToFirestore(updatedUserData);
      setProfileToast('Profile details updated and saved to Firebase!');
      setTimeout(() => setProfileToast(''), 3000);
      setTimeout(() => setActiveModal(null), 1200);
    } catch (err: any) {
      setProfileToast('Error saving profile to database: ' + (err?.message || 'Failed'));
    }
  };

  const handleSendResetPassword = async () => {
    setIsSendingReset(true);
    try {
      if (email) {
        await sendPasswordReset(email);
      }
      setResetSent(true);
    } catch {
      setResetSent(true); // fallback simulation for dev mode
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      
      {/* ==========================================
          PROFILE HEADER
         ========================================== */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt={name}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
          />
          {isVerified && (
            <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-600 text-white p-1 rounded-full shadow-xs" title="Verified Agent">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white truncate">
              {name}
            </h1>
            {isVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified Agent ✓
              </span>
            )}
          </div>

          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center sm:justify-start gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>{agencyName}</span>
          </p>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>{universityLocation}</span>
          </p>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>{email}</span>
          </p>
        </div>
      </div>

      {/* ==========================================
          SECTION: MY DORMIQA
         ========================================== */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            My Dormiqa
          </h3>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {/* My Hostels Link */}
          <button
            onClick={() => onNavigateSection('hostels')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">🏠 My Hostels</span>
                <span className="text-[11px] text-neutral-400">Manage property listings & available rooms</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full">
                {hostelsCount}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </button>

          {/* Chats & Enquiries Link */}
          <button
            onClick={() => onNavigateSection('inbox')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">💬 Chats & Enquiries</span>
                <span className="text-[11px] text-neutral-400">Direct student conversations & room enquiries</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full">
                {chatsCount}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </button>

          {/* Calendar & Inspections Link */}
          <button
            onClick={() => onNavigateSection('calendar')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">📅 Calendar & Inspections</span>
                <span className="text-[11px] text-neutral-400">Scheduled tour bookings & property visits</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full">
                {inspectionsCount}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </button>
        </div>
      </div>

      {/* ==========================================
          SECTION: BUSINESS
         ========================================== */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Business
          </h3>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <button
            onClick={() => onNavigateSection('business')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">🏢 Business Profile</span>
                <span className="text-[11px] text-neutral-400">{agencyName}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={() => onNavigateSection('verification')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">✓ Verification Status</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {isVerified ? 'Approved & Active ✓' : 'Verification Pending'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* ==========================================
          SECTION: GENERAL
         ========================================== */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            General Settings
          </h3>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {/* 1. Profile */}
          <button
            onClick={() => setActiveModal('profile')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <UserIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">Profile Details</span>
                <span className="text-[11px] text-neutral-400">Personal & manager contact info</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          {/* 2. Password & Security */}
          <button
            onClick={() => setActiveModal('security')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">Password & Security</span>
                <span className="text-[11px] text-neutral-400">Password reset & 2FA protection</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          {/* 3. Notifications */}
          <button
            onClick={() => setActiveModal('notifications')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">Notifications</span>
                <span className="text-[11px] text-neutral-400">Email, WhatsApp & push alerts</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          {/* 4. Appearance */}
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">Appearance</span>
                <span className="text-[11px] text-neutral-400">Light, Dark or Device theme</span>
              </div>
            </div>
            <ThemeToggle variant="dropdown" />
          </div>

          {/* 5. Language */}
          <button
            onClick={() => setActiveModal('language')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">Language & Region</span>
                <span className="text-[11px] text-neutral-400">{selectedLanguage}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-md">
                Active
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </button>
        </div>
      </div>

      {/* ==========================================
          SECTION: OTHER
         ========================================== */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Other
          </h3>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <a
            href="#terms"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenInfoPage) {
                onOpenInfoPage('terms-and-conditions');
              } else {
                alert('Terms & Conditions: Dormiqa Housing Network');
              }
            }}
            className="px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white">Terms & Conditions</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </a>

          <a
            href="#privacy"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenInfoPage) {
                onOpenInfoPage('privacy-policy');
              } else {
                alert('Privacy Policy: Dormiqa Housing Data Security');
              }
            }}
            className="px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white">Privacy Policy</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </a>
        </div>
      </div>

      {/* ==========================================
          SIGN OUT BUTTON
         ========================================== */}
      <button
        onClick={onSignOut}
        className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>

      {/* ==========================================
          MODALS FOR GENERAL SETTINGS
         ========================================== */}

      {/* 1. PROFILE DETAILS MODAL */}
      {activeModal === 'profile' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">Profile Details</h3>
                  <p className="text-[11px] text-neutral-400">Update personal details shown to students</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileToast && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{profileToast}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1">
                  Agency / Caretaker Brand
                </label>
                <input
                  type="text"
                  value={profileAgency}
                  onChange={(e) => setProfileAgency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <UniversitySelector
                universities={universities}
                selectedUniversityId={profileUniId}
                onSelectUniversity={(uni) => {
                  setProfileUniId(uni.id);
                  setProfileLocation(uni.name);
                }}
                label="Primary Campus / University Serviced"
                required
              />

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-extrabold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PASSWORD & SECURITY MODAL */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">Password & Security</h3>
                  <p className="text-[11px] text-neutral-400">Protect your agent portal account</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Reset Account Password</h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Send a secure password reset link to <strong className="text-neutral-800 dark:text-neutral-200">{email}</strong>.
                    </p>
                  </div>
                </div>

                {resetSent ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Password reset email dispatched to {email}. Check your inbox!</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSendResetPassword}
                    disabled={isSendingReset}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingReset ? 'Dispatching Email...' : 'Send Password Reset Link'}</span>
                  </button>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">SMS Inspection Verification (2FA)</h4>
                    <p className="text-[11px] text-neutral-400">Require OTP code for inspection booking confirmations</p>
                  </div>
                </div>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    twoFactorEnabled ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. NOTIFICATIONS MODAL */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">Notification Alerts</h3>
                  <p className="text-[11px] text-neutral-400">Customize how you receive student leads</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-left divide-y divide-neutral-100 dark:divide-neutral-800">
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Student Room Enquiries</h4>
                  <p className="text-[11px] text-neutral-400">Email alerts when a student asks about a hostel</p>
                </div>
                <button
                  onClick={() => setNotifPrefs(p => ({ ...p, emailEnquiries: !p.emailEnquiries }))}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    notifPrefs.emailEnquiries ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">WhatsApp Tour Reminders</h4>
                  <p className="text-[11px] text-neutral-400">Automated WhatsApp ping 1 hour before inspections</p>
                </div>
                <button
                  onClick={() => setNotifPrefs(p => ({ ...p, whatsappReminders: !p.whatsappReminders }))}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    notifPrefs.whatsappReminders ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">In-App Push Alerts</h4>
                  <p className="text-[11px] text-neutral-400">Instant browser notifications for verified reviews</p>
                </div>
                <button
                  onClick={() => setNotifPrefs(p => ({ ...p, pushAlerts: !p.pushAlerts }))}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    notifPrefs.pushAlerts ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Weekly Performance Summary</h4>
                  <p className="text-[11px] text-neutral-400">Weekly statistics on profile views & leads</p>
                </div>
                <button
                  onClick={() => setNotifPrefs(p => ({ ...p, weeklySummary: !p.weeklySummary }))}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    notifPrefs.weeklySummary ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-colors cursor-pointer"
              >
                Save Notification Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. LANGUAGE MODAL */}
      {activeModal === 'language' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">Language & Region</h3>
                  <p className="text-[11px] text-neutral-400">Select your preferred portal dialect</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-left">
              {[
                { name: 'English (Nigeria)', region: 'Default - Official System Language', flag: '🇳🇬' },
                { name: 'Pidgin English', region: 'Local Vernacular Interface', flag: '🇳🇬' },
                { name: 'Yoruba', region: 'South-West Campus Dialect', flag: '🇳🇬' },
                { name: 'Hausa', region: 'Northern Campus Dialect', flag: '🇳🇬' },
                { name: 'Igbo', region: 'Eastern Campus Dialect', flag: '🇳🇬' }
              ].map((lang) => (
                <button
                  key={lang.name}
                  onClick={() => {
                    setSelectedLanguage(lang.name);
                    setTimeout(() => setActiveModal(null), 300);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedLanguage === lang.name
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-extrabold'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{lang.flag}</span>
                    <div>
                      <span className="text-xs block">{lang.name}</span>
                      <span className="text-[10px] text-neutral-400 font-normal">{lang.region}</span>
                    </div>
                  </div>
                  {selectedLanguage === lang.name && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
