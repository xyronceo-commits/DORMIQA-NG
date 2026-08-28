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
  Briefcase
} from 'lucide-react';
import { User } from '../types';
import { auth } from '../services/firebase';

interface AgentProfilePageProps {
  user?: Partial<User> | null;
  hostelsCount?: number;
  chatsCount?: number;
  inspectionsCount?: number;
  onNavigateSection: (section: 'hostels' | 'inbox' | 'calendar' | 'verification' | 'business') => void;
  onSignOut: () => void;
}

export const AgentProfilePage: React.FC<AgentProfilePageProps> = ({
  user,
  hostelsCount = 0,
  chatsCount = 0,
  inspectionsCount = 0,
  onNavigateSection,
  onSignOut
}) => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const name = user?.name || auth.currentUser?.displayName || 'Agent Manager';
  const email = user?.email || auth.currentUser?.email || 'agent@dormiqa.ng';
  const agencyName = user?.agencyName || 'Verified Accommodation Management';
  const universityLocation = user?.universityName || 'UNIOSUN / Lagos Campus';
  const isVerified = user?.isVerifiedAgent || user?.businessVerificationStatus === 'approved';
  const avatarUrl = user?.avatarUrl || auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80';

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
            General
          </h3>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                <UserIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">👤 Profile</span>
                <span className="text-[11px] text-neutral-400">Personal contact details</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">🔒 Password & Security</span>
                <span className="text-[11px] text-neutral-400">Update account password</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">🔔 Notifications</span>
                <span className="text-[11px] text-neutral-400">Manage email & push alerts</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">🎨 Appearance</span>
                <span className="text-[11px] text-neutral-400">Switch Theme</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="text-xs font-bold px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-lg cursor-pointer"
            >
              {themeMode === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>

          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">🌐 Language</span>
                <span className="text-[11px] text-neutral-400">English (Nigeria)</span>
              </div>
            </div>
            <span className="text-xs text-neutral-400 font-medium">Default</span>
          </div>
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
            onClick={(e) => { e.preventDefault(); alert('Terms & Conditions: Dormiqa Housing Network'); }}
            className="px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white">📋 Terms & Conditions</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </a>

          <a
            href="#privacy"
            onClick={(e) => { e.preventDefault(); alert('Privacy Policy: Dormiqa Housing Data Security'); }}
            className="px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white">🛡️ Privacy Policy</span>
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

    </div>
  );
};
