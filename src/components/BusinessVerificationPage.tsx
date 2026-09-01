import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Upload, 
  CheckCircle2, 
  FileCheck,
  AlertTriangle,
  Loader2,
  BadgeCheck,
  Camera,
  Lock,
  User as UserIcon,
  MapPin,
  Phone,
  Clock,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { User, BusinessVerificationDetails, BusinessVerificationStatus, University } from '../types';
import { saveUserToFirestore, auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

import { VerificationStatusPage } from './VerificationStatusPage';
import { UniversitySelector } from './UniversitySelector';

interface BusinessVerificationPageProps {
  agentData?: Partial<User> | null;
  universities?: University[];
  onCompleteVerification: (details: { licenseNumber: string; isVerifiedAgent: boolean; avatarUrl?: string; verificationDetails?: BusinessVerificationDetails }) => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
}

export const BusinessVerificationPage: React.FC<BusinessVerificationPageProps> = ({
  agentData,
  universities = [],
  onCompleteVerification,
  onSignOut,
  onDeleteAccount
}) => {
  // Current Status
  const currentStatus: BusinessVerificationStatus = agentData?.businessVerificationStatus || (agentData?.isVerifiedAgent ? 'approved' : 'none');
  const existingDetails = agentData?.businessVerificationDetails;

  // Real-time listener for status changes (e.g. when approved by Admin)
  useEffect(() => {
    const uid = agentData?.id || auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.businessVerificationStatus === 'approved' || data.isVerifiedAgent === true) {
          onCompleteVerification({
            licenseNumber: data.licenseNumber || `DMQ-AGT-${Math.floor(100000 + Math.random() * 900000)}`,
            isVerifiedAgent: true,
            avatarUrl: data.avatarUrl,
            verificationDetails: data.businessVerificationDetails
          });
        }
      }
    }, (err) => console.warn('Status listener warning:', err));

    return () => unsubscribe();
  }, [agentData?.id]);

  // Form State
  const [businessName, setBusinessName] = useState(existingDetails?.businessName || agentData?.agencyName || '');
  const [agentFullName, setAgentFullName] = useState(existingDetails?.agentFullName || agentData?.name || '');
  const [phone, setPhone] = useState(existingDetails?.phone || agentData?.phone || '');
  const [servicedUniId, setServicedUniId] = useState<string>(agentData?.universityId || 'uniosun');
  const [businessType, setBusinessType] = useState<'individual_caretaker' | 'registered_agency' | 'property_management_company'>(
    existingDetails?.businessType || 'individual_caretaker'
  );
  const [businessAddress, setBusinessAddress] = useState(existingDetails?.businessAddress || '');
  const [hostelManagementInfo, setHostelManagementInfo] = useState(existingDetails?.hostelManagementInfo || '');
  const [relationship, setRelationship] = useState<'owner' | 'caretaker' | 'managing_agent' | 'representative'>(
    existingDetails?.relationship || 'caretaker'
  );
  const [proofType, setProofType] = useState<'cac' | 'nin_id' | 'utility_bill' | 'office_photo' | 'business_card'>(
    existingDetails?.proofType || 'nin_id'
  );
  
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(existingDetails?.documentName || null);
  
  // Personal Face Photo State
  const [portraitPhoto, setPortraitPhoto] = useState<string | null>(existingDetails?.portraitPhotoUrl || agentData?.avatarUrl || null);
  const [portraitFileName, setPortraitFileName] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const handlePortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPortraitFileName(file.name);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setPortraitPhoto(uploadEvent.target.result as string);
          setErrorMessage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedDocument(file);
      setUploadedDocName(file.name);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!portraitPhoto) {
      setErrorMessage('Please upload a clear, unblurred personal photo for identity verification.');
      return;
    }

    if (!agentFullName.trim() || !businessName.trim() || !phone.trim()) {
      setErrorMessage('Please complete all required fields (Full Name, Business Name, WhatsApp Phone).');
      return;
    }

    if (!businessAddress.trim() || !hostelManagementInfo.trim()) {
      setErrorMessage('Please specify your business address and hostel management details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const licenseNumber = `DMQ-AGT-${Math.floor(100000 + Math.random() * 900000)}`;
      const verificationObj: BusinessVerificationDetails = {
        businessName: businessName.trim(),
        agentFullName: agentFullName.trim(),
        phone: phone.trim(),
        businessType,
        businessAddress: businessAddress.trim(),
        hostelManagementInfo: hostelManagementInfo.trim(),
        relationship,
        proofType,
        documentName: uploadedDocName || 'proof_document.pdf',
        portraitPhotoUrl: portraitPhoto,
        submittedAt: new Date().toISOString()
      };

      // 1. Persist state as PENDING and save full verification details into Firestore
      const uid = agentData?.id || auth.currentUser?.uid;
      if (uid) {
        await saveUserToFirestore({
          id: uid,
          name: agentFullName.trim(),
          email: agentData?.email || auth.currentUser?.email || '',
          role: 'agent',
          agencyName: businessName.trim(),
          phone: phone.trim(),
          avatarUrl: portraitPhoto,
          isEmailVerified: true,
          businessVerificationStatus: 'pending',
          businessVerificationDetails: verificationObj,
          isVerifiedAgent: false,
          licenseNumber
        });
      }

      // 2. Set submission success state which displays the dedicated Verification Status page
      setSubmissionSuccess(true);

      // 3. Notify parent app state of updated pending status
      onCompleteVerification({
        licenseNumber,
        isVerifiedAgent: false, // Remains false until admin approves
        avatarUrl: portraitPhoto,
        verificationDetails: verificationObj
      });

    } catch (err: any) {
      console.error('Business Verification submit error:', err);
      setErrorMessage(err.message || 'Verification submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. PENDING STATUS SCREEN
  if (currentStatus === 'pending' || submissionSuccess) {
    return (
      <VerificationStatusPage
        agentData={{
          ...agentData,
          businessVerificationStatus: 'pending',
          businessVerificationDetails: {
            businessName: businessName.trim(),
            agentFullName: agentFullName.trim(),
            phone: phone.trim(),
            businessType,
            businessAddress: businessAddress.trim(),
            hostelManagementInfo: hostelManagementInfo.trim(),
            relationship,
            proofType,
            documentName: uploadedDocName || 'proof_document.pdf',
            portraitPhotoUrl: portraitPhoto || '',
            submittedAt: new Date().toISOString()
          }
        }}
        onSignOut={onSignOut}
        onDeleteAccount={onDeleteAccount}
        onApproved={() => {
          onCompleteVerification({
            licenseNumber: agentData?.licenseNumber || `DMQ-AGT-${Math.floor(100000 + Math.random() * 900000)}`,
            isVerifiedAgent: true,
            avatarUrl: portraitPhoto || agentData?.avatarUrl
          });
        }}
      />
    );
  }

  // 2. FORM STATE (For status 'none' or 'rejected')
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-50 dark:bg-neutral-950 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Step Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">Email Verified ✓</span>
          </div>
          <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
            BUSINESS VERIFICATION REQUIRED
          </span>
        </div>

        {/* Verification Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xs space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Agent Identity & Business Verification
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto font-medium leading-relaxed">
              To protect students and guarantee zero fake listings on Dormiqa, all hostel caretakers and accommodation managers must complete business verification before accessing the dashboard.
            </p>
          </div>

          {/* Rejection Banner if rejected */}
          {currentStatus === 'rejected' && (
            <div className="p-4 bg-black text-white border border-neutral-800 rounded-2xl text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-emerald-400" />
                <span>Previous Verification Application Needs Correction</span>
              </div>
              <p className="text-[11px] text-neutral-300">
                Reason: {agentData?.rejectionReason || 'Uploaded documents were unreadable or information requires updating.'} Please review your details and resubmit.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-black text-white border border-neutral-800 rounded-2xl flex items-center gap-2 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            
            {/* 1. AGENT PERSONAL FACE PHOTO */}
            <div className="p-4 bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl space-y-3 border border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs flex items-center gap-1.5 text-emerald-400">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  1. Personal Verification Photo (Required)
                </label>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-extrabold px-2 py-0.5 rounded border border-emerald-800/80 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Locked Profile Photo
                </span>
              </div>

              <p className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                Upload a <strong>clear, well-lit photo of yourself</strong>. Must be unblurred, no dark sunglasses, no face mask, clearly displaying your face.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
                <div className="relative shrink-0">
                  <img
                    src={portraitPhoto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80'}
                    alt="Agent Identity Verification Face"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{portraitFileName ? 'Change Uploaded Photo' : 'Upload Personal Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePortraitUpload}
                    />
                  </label>
                  {portraitFileName && (
                    <p className="text-[10px] text-emerald-400 font-semibold truncate">
                      ✓ Selected: {portraitFileName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. AGENT & BUSINESS IDENTITY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Agent's Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={agentFullName}
                  onChange={(e) => setAgentFullName(e.target.value)}
                  placeholder="e.g. Chief Tunde Adebayo"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Name of Agency / Business *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Yaba Student Housing Ltd"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  WhatsApp Contact Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 803 456 7890"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Business Type *
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="individual_caretaker">Individual Caretaker / Hostel Manager</option>
                  <option value="registered_agency">Registered Housing Agency</option>
                  <option value="property_management_company">Property Management Company</option>
                </select>
              </div>
            </div>

            {/* PRIMARY SERVICED UNIVERSITY */}
            <div>
              <UniversitySelector
                universities={universities}
                selectedUniversityId={servicedUniId}
                onSelectUniversity={(uni) => setServicedUniId(uni.id)}
                label="Primary University / Campus Serviced"
                placeholder="Select primary university serviced"
                required
              />
            </div>

            {/* 3. LOCATION & PROPERTY MANAGEMENT INFO */}
            <div className="space-y-4">
              <div>
                <label className="font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Business Office Address / Location *
                </label>
                <input
                  type="text"
                  required
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="e.g. Suite 4, Akoka Commercial Complex, Yaba, Lagos State"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Hostels / Property Details Managed *
                  </label>
                  <input
                    type="text"
                    required
                    value={hostelManagementInfo}
                    onChange={(e) => setHostelManagementInfo(e.target.value)}
                    placeholder="e.g. Divine Villa (12 self-contain units)"
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Ownership or Relationship *
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="caretaker">Managing Caretaker</option>
                    <option value="owner">Direct Property Owner / Landlord</option>
                    <option value="managing_agent">Managing Agency Representative</option>
                    <option value="representative">Official Hostel Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. SUPPORTING DOCUMENTATION */}
            <div className="space-y-3">
              <label className="font-bold text-neutral-800 dark:text-neutral-200 block">
                Select Supporting Document Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'nin_id', label: 'National ID / NIN', icon: '🎴' },
                  { id: 'office_photo', label: 'Office Storefront', icon: '🏢' },
                  { id: 'business_card', label: 'Business Card', icon: '🏷️' },
                  { id: 'utility_bill', label: 'Utility Bill', icon: '📄' },
                  { id: 'cac', label: 'CAC Document', icon: '📜' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProofType(item.id as any)}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 justify-center transition-all cursor-pointer ${
                      proofType === item.id
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 shadow-sm'
                        : 'bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Upload Document Box */}
              <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-5 text-center bg-neutral-50/50 dark:bg-neutral-800/50 hover:bg-neutral-50 transition-all cursor-pointer">
                {uploadedDocName ? (
                  <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold px-2">
                    <span className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Document Attached: {uploadedDocName}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setUploadedDocument(null); setUploadedDocName(null); }}
                      className="text-[11px] text-rose-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1.5 py-1">
                    <Upload className="w-6 h-6 text-neutral-400" />
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Click to upload selected document ({proofType.toUpperCase()})
                    </span>
                    <span className="text-[10px] text-neutral-400">JPG, PNG, WEBP, or PDF up to 10MB</span>
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className="hidden" 
                      onChange={handleDocumentUpload} 
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-white shrink-0" />
                    <span>Submitting Business Verification Details...</span>
                  </>
                ) : (
                  <>
                    <BadgeCheck className="w-4.5 h-4.5 shrink-0" />
                    <span>Submit for Verification</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
