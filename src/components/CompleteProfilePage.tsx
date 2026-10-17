import React, { useState } from 'react';
import { User, University } from '../types';
import { saveUserToFirestore, auth } from '../services/firebase';
import { supabase } from '../services/supabase';
import { UniversitySelector } from './UniversitySelector';
import { Loader2, AlertCircle } from 'lucide-react';

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
        throw new Error('No active session found. Please sign in again.');
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

      await saveUserToFirestore(updatedData);

      try {
        await supabase
          .from('app_documents')
          .update({
            data: updatedData
          })
          .eq('collection', 'users')
          .eq('id', uid);
      } catch (_) {}

      onProfileCompleted(updatedData);
    } catch (err: any) {
      console.warn('Profile completion error:', err);
      setError(err?.message || 'Could not complete profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="w-full max-w-xl mx-auto px-6 py-4 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold tracking-tight text-neutral-900">DORMIQA</span>
          <span className="text-neutral-300 font-light text-xs">/</span>
          <span className="text-xs text-neutral-500 font-medium">Profile Setup</span>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 py-1.5 px-3 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto px-6 py-8 flex flex-col justify-center flex-1">
        <div className="space-y-1.5 mb-6">
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Complete student profile
          </h1>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Enter your details so verified caretakers can coordinate your lodge inspections.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-snug font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Full Name <span className="text-emerald-700">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Babatunde Adeyemi"
              className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              WhatsApp or Mobile Phone <span className="text-emerald-700">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Used strictly for caretaker inspection appointment confirmations.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              University Campus <span className="text-emerald-700">*</span>
            </label>
            <UniversitySelector
              universities={universities}
              selectedUniversityId={universityId}
              onSelectUniversity={(uni) => setUniversityId(uni.id)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving profile...</span>
              </>
            ) : (
              <span>Continue to Accommodation Search</span>
            )}
          </button>
        </form>
      </main>

      <footer className="w-full max-w-xl mx-auto px-6 py-4 text-center border-t border-neutral-100 text-xs text-neutral-400">
        DORMIQA Nigeria • Osun State University Launch Campus
      </footer>
    </div>
  );
};
