import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Calendar, 
  User as UserIcon, 
  Lock, 
  Bell, 
  Palette, 
  Globe, 
  FileText, 
  ShieldCheck, 
  LogOut, 
  ChevronRight,
  CheckCircle2,
  Save,
  Check,
  X
} from 'lucide-react';
import { User, University } from '../types';
import { auth, saveUserToFirestore, saveStudentProfileToFirestore, validateAndNormalizePhoneNumber } from '../services/firebase';
import { ThemeToggle } from './ThemeToggle';
import { UniversitySelector } from './UniversitySelector';

interface StudentProfilePageProps {
  user?: User;
  universities?: University[];
  savedCount: number;
  chatsCount: number;
  inspectionsCount: number;
  onNavigateView: (view: 'saved' | 'messages' | 'inspections' | 'search') => void;
  onSignOut: () => void;
  onGoBack: () => void;
}

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({
  user,
  universities = [],
  savedCount,
  chatsCount,
  inspectionsCount,
  onNavigateView,
  onSignOut,
  onGoBack
}) => {
  const [activeModal, setActiveModal] = useState<'profile' | 'security' | 'notifications' | 'terms' | 'privacy' | null>(null);

  const [studentName, setStudentName] = useState(user?.name || auth.currentUser?.displayName || 'Student Account');
  const [studentPhone, setStudentPhone] = useState(user?.phone || user?.phoneNumber || '');
  const [studentUniId, setStudentUniId] = useState(user?.universityId || 'uniosun');
  const [studentUniversity, setStudentUniversity] = useState(user?.universityName || 'Osun State University (UNIOSUN)');
  const [profileToast, setProfileToast] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const photo = user?.avatarUrl || auth.currentUser?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80";
  const name = studentName;
  const university = studentUniversity;
  const email = user?.email || auth.currentUser?.email || '';

  const handleSaveStudentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUid = auth.currentUser?.uid || user?.id;
    if (!currentUid) {
      setProfileToast('Error: Authentication required.');
      return;
    }

    const phoneVal = validateAndNormalizePhoneNumber(studentPhone);
    if (!phoneVal.isValid) {
      setProfileToast(phoneVal.error || 'Please enter a valid phone number.');
      return;
    }

    setIsSaving(true);
    try {
      await saveStudentProfileToFirestore({
        uid: currentUid,
        name: studentName,
        email: email,
        photoURL: photo,
        phoneNumber: phoneVal.normalized,
        universityId: studentUniId,
        universityName: studentUniversity,
        profileCompleted: true
      });

      setProfileToast('Profile details updated & saved to Firebase!');
      setTimeout(() => setProfileToast(''), 3000);
      setTimeout(() => setActiveModal(null), 1200);
    } catch (err: any) {
      setProfileToast('Save failed: ' + (err?.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      
      {/* HEADER WITH GO BACK ICON */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onGoBack}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Profile</h1>
          </div>

        </div>
      </header>

      {/* MAIN PROFILE BODY */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* PROFILE HEADER CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 p-6 flex flex-col items-center text-center space-y-3 shadow-2xs">
          <div className="relative">
            <img
              src={photo}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
            />
            <span className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-slate-900">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{name}</h2>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Student ✓
            </div>
            <p className="text-xs text-neutral-600 dark:text-slate-300 font-medium pt-1">{university}</p>
            <p className="text-xs text-neutral-400 dark:text-slate-500">{email}</p>
          </div>
        </div>

        {/* SECTION 1: MY DORMIQA */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-neutral-400 dark:text-slate-500 tracking-wider uppercase px-2">
            MY DORMIQA
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 divide-y divide-neutral-100 dark:divide-slate-800 shadow-2xs overflow-hidden">
            
            <button
              onClick={() => onNavigateView('saved')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-500 rounded-xl">
                  <Heart className="w-4 h-4 fill-rose-500" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Saved</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400 dark:text-slate-500">
                <span className="text-xs font-extrabold bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                  {savedCount}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              onClick={() => onNavigateView('messages')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-500 rounded-xl">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Chats</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400 dark:text-slate-500">
                <span className="text-xs font-extrabold bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                  {chatsCount}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              onClick={() => onNavigateView('inspections')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Inspections & Requests</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400 dark:text-slate-500">
                <span className="text-xs font-extrabold bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                  {inspectionsCount}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

          </div>
        </div>

        {/* SECTION 2: GENERAL */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-neutral-400 dark:text-slate-500 tracking-wider uppercase px-2">
            GENERAL
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 divide-y divide-neutral-100 dark:divide-slate-800 shadow-2xs overflow-hidden">
            
            <button
              onClick={() => setActiveModal('profile')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 rounded-xl">
                  <UserIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Profile Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            <button
              onClick={() => setActiveModal('security')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 rounded-xl">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Password & Security</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            <button
              onClick={() => setActiveModal('notifications')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 rounded-xl">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            <div className="p-4 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 rounded-xl">
                  <Palette className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Appearance</span>
              </div>
              <ThemeToggle />
            </div>

            <div className="p-4 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 rounded-xl">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Language</span>
              </div>
              <span className="text-xs font-semibold text-neutral-500 dark:text-slate-400">English (NG)</span>
            </div>

          </div>
        </div>

        {/* SECTION 3: OTHER */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-neutral-400 dark:text-slate-500 tracking-wider uppercase px-2">
            OTHER
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 divide-y divide-neutral-100 dark:divide-slate-800 shadow-2xs overflow-hidden">
            
            <button
              onClick={() => setActiveModal('terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 rounded-xl">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Terms & Conditions</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            <button
              onClick={() => setActiveModal('privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

          </div>
        </div>

        {/* SIGN OUT BUTTON */}
        <button
          onClick={onSignOut}
          className="w-full p-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

      </main>

      {/* INFORMATION MODAL DIALOGS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full space-y-4 border border-neutral-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white capitalize">
                {activeModal.replace('_', ' ')}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-xs font-bold px-2.5 py-1 bg-neutral-100 dark:bg-slate-800 rounded-lg text-neutral-600 dark:text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="text-xs text-neutral-600 dark:text-slate-300 space-y-4 leading-relaxed">
              {activeModal === 'profile' && (
                <form onSubmit={handleSaveStudentProfile} className="space-y-3 text-left">
                  {profileToast && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{profileToast}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-extrabold uppercase text-neutral-500 dark:text-slate-400 block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold uppercase text-neutral-500 dark:text-slate-400 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-800/60 text-neutral-500 dark:text-slate-400 text-xs font-semibold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold uppercase text-neutral-500 dark:text-slate-400 block mb-1">
                      Phone / WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      placeholder="e.g. 08123456789"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                    />
                  </div>

                  <UniversitySelector
                    universities={universities}
                    selectedUniversityId={studentUniId}
                    onSelectUniversity={(uni) => {
                      setStudentUniId(uni.id);
                      setStudentUniversity(uni.name);
                    }}
                    label="University / Institution"
                    required
                  />

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-800 text-neutral-600 dark:text-slate-400 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              )}
              {activeModal === 'security' && (
                <p>Your password & authentication token are managed securely via Firebase Auth. To reset your password, check your email inbox for password recovery instructions.</p>
              )}
              {activeModal === 'notifications' && (
                <p>Notifications for new agent responses, tour reminders, and price drop alerts are active on your account.</p>
              )}
              {activeModal === 'terms' && (
                <p>Dormiqa provides verified student housing discovery. All listed hostels are checked by verified caretakers and campus ambassadors.</p>
              )}
              {activeModal === 'privacy' && (
                <p>Your data is processed strictly for accommodation matching and direct agent tour bookings. We never share student phone numbers without booking consent.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
