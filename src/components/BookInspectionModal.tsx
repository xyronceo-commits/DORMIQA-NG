import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Video, UserCheck, CheckCircle2, Phone, Mail, Sparkles } from 'lucide-react';
import { Listing } from '../types';
import { bookInspection } from '../services/api';
import { sendNotification } from '../services/notificationService';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import { auth } from '../services/firebase';

interface BookInspectionModalProps {
  listing: Listing;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookInspectionModal: React.FC<BookInspectionModalProps> = ({
  listing,
  onClose,
  onSuccess
}) => {
  const [tourType, setTourType] = useState<'in_person' | 'virtual_video'>('in_person');
  const [selectedDate, setSelectedDate] = useState('2026-08-10');
  const [selectedTime, setSelectedTime] = useState('14:30 - 15:00');
  const [studentName, setStudentName] = useState('Chinedu Okonkwo');
  const [studentEmail, setStudentEmail] = useState('chinedu.o@student.unilag.edu.ng');
  const [studentPhone, setStudentPhone] = useState('+234 812 345 6789');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookedSuccess, setBookedSuccess] = useState(false);

  const timeSlots = [
    '10:00 - 10:30',
    '11:30 - 12:00',
    '14:30 - 15:00',
    '16:00 - 16:30',
    '17:30 - 18:00'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const inspection = await bookInspection({
        listingId: listing.id,
        listingTitle: listing.title,
        listingAddress: listing.address,
        listingPhoto: listing.photos[0],
        pricePerWeek: listing.pricePerWeek,
        studentId: auth.currentUser?.uid || 'guest_user',
        studentName,
        studentEmail,
        studentPhone,
        agentId: listing.agentId,
        agentName: listing.agent.name,
        date: selectedDate,
        timeSlot: selectedTime,
        type: tourType,
        notes
      });

      // Send real-time notification to Agent
      sendNotification({
        userId: listing.agentId,
        title: `📅 New Tour Request from ${studentName}`,
        body: `Inspection requested for "${listing.title}" on ${selectedDate} at ${selectedTime}.`,
        type: 'inspection',
        metadata: {
          inspectionId: inspection.id,
          listingId: listing.id,
          senderName: studentName
        }
      });

      // Send confirmation notification to Student
      sendNotification({
        userId: auth.currentUser?.uid || 'guest_user',
        title: `✅ Inspection Requested Successfully`,
        body: `Your request to view "${listing.title}" with Agent ${listing.agent.name} on ${selectedDate} (${selectedTime}) has been sent.`,
        type: 'inspection',
        metadata: {
          inspectionId: inspection.id,
          listingId: listing.id
        }
      });

      setSubmitting(false);
      setBookedSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1800);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden my-auto p-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full border border-neutral-200 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {bookedSuccess ? (
          <div className="text-center py-8 space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-neutral-900">
                Inspection Booking Confirmed!
              </h3>
              <p className="text-xs text-neutral-600 max-w-xs mx-auto mt-1">
                Agent <strong>{listing.agent.name}</strong> has received your request for <strong>{selectedDate} ({selectedTime})</strong>.
              </p>
            </div>

            {/* Google Calendar & iCal Export Buttons */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-blue-950 flex items-center justify-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                Add to your Personal Calendar:
              </p>
              <div className="flex items-center justify-center gap-2">
                <a
                  href={generateGoogleCalendarUrl({
                    title: `Inspection: ${listing.title}`,
                    description: `Property tour with Agent ${listing.agent.name}. Contact: ${studentPhone}`,
                    location: listing.address,
                    date: selectedDate,
                    timeSlot: selectedTime
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
                >
                  📅 Google Calendar
                </a>

                <button
                  type="button"
                  onClick={() => downloadIcsFile({
                    title: `Inspection: ${listing.title}`,
                    description: `Property tour with Agent ${listing.agent.name}. Contact: ${studentPhone}`,
                    location: listing.address,
                    date: selectedDate,
                    timeSlot: selectedTime
                  })}
                  className="px-3.5 py-2 bg-white hover:bg-neutral-100 text-slate-900 border border-neutral-300 font-bold rounded-xl text-xs transition-colors"
                >
                  📥 Download .ICS
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors"
            >
              Done & Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit mb-2">
                <UserCheck className="w-3.5 h-3.5" /> Direct Agent Booking
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Book Property Inspection
              </h2>
              <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                {listing.title} ({listing.address})
              </p>
            </div>

            {/* Tour Type Selection */}
            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider block mb-2">
                Choose Inspection Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTourType('in_person')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tourType === 'in_person'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4 mb-1 text-emerald-400" />
                  <div className="text-xs font-bold">In-Person Tour</div>
                  <div className="text-[10px] opacity-80">Meet agent at property</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTourType('virtual_video')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tourType === 'virtual_video'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <Video className="w-4 h-4 mb-1 text-emerald-400" />
                  <div className="text-xs font-bold">Live Virtual Tour</div>
                  <div className="text-[10px] opacity-80">Interactive video call</div>
                </button>
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider block mb-1.5">
                Select Date
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-900 bg-neutral-50 focus:bg-white focus:outline-none focus:border-slate-900"
              />
            </div>

            {/* Time Slot Picker */}
            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider block mb-1.5">
                Select Time Slot
              </label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center transition-all ${
                      selectedTime === slot
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Student Info Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Your Name</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Phone Number</label>
                <input
                  type="text"
                  required
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-900"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-98 disabled:opacity-50"
            >
              {submitting ? 'Confirming with Agent...' : 'Confirm Free Inspection'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
