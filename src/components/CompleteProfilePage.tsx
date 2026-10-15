import React, { useState } from 'react';
import { User, University } from '../types';
import { saveUserToFirestore, auth } from '../services/firebase';
import { supabase } from '../services/supabase';
import { GraduationCap, Phone, User as UserIcon, Building2, ArrowRight, Loader2, LogOut } from 'lucide-react';

interface CompleteProfilePageProps {
  user?: Partial<User> | null;
  universities: University[];
  onProfileCompleted: (updatedUser: Partial<User>) => void;
  onSignOut: () => void;
}

export const CompleteProfilePage: React.FC<CompleteProfilePageProps> = ({
  user,
  universities,
  onProfileCompleted,
  onSignOut
}) => {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [universityId, setUniversityId] = useState(user?.universityId || 'uniosun');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUni = universities.find(u => u.id === universityId) || universities[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid Nigerian mobile or WhatsApp phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uid = user?.id || user?.uid || auth.currentUser?.uid;
      if (!uid) {
        throw new Error('No active authenticated session found. Please sign in again.');
      }

      const userEmail = (user?.email || auth.currentUser?.email || '').trim();
      const updatedData: Partial<User> = {
        id: uid,
        uid: uid,
        name: cleanName,
        email: userEmail,
        phone: cleanPhone,
        universityId: selectedUni?.id || 'uniosun',
        universityName: selectedUni?.name || 'Osun State University (UNIOSUN)',
        role: 'student',
        isEmailVerified: true
      };

      // 1. Save to app_documents / firestore
      await saveUserToFirestore(updatedData);

      // 2. Direct Supabase write for session safety
      try {
        await supabase
          .from('app_documents')
          .update({
            data: updatedData
          })
          .eq('collection', 'users')
          .eq('id', uid);
      } catch (_) {}

      // 3. Notify parent app
      onProfileCompleted(updatedData);
    } catch (err: any) {
      console.warn('Profile completion error:', err);
      setError(err?.message || 'Could not complete profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Complete Your Student Profile
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Just one quick step to connect you with verified campus accommodation.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oluwaseun Adeleke"
              required
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>

          {/* Email (Read Only) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || auth.currentUser?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
            />
          </div>

          {/* Phone / WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-neutral-400" />
              <span>WhatsApp / Phone Number</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              required
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            <p className="text-[10px] text-neutral-400">Used by caretakers to confirm physical inspection tours.</p>
          </div>

          {/* Preferred University */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Your University</span>
            </label>
            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
            >
              {universities.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.id === 'uniosun' ? '(Active Launch Campus)' : '(Coming Soon)'}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Complete & Start Exploring</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out and return to home</span>
          </button>
        </div>

      </div>
    </div>
  );
};
