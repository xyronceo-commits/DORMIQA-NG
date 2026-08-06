import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Upload, 
  CheckCircle2, 
  Sparkles, 
  FileCheck,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  BadgeCheck
} from 'lucide-react';
import { User } from '../types';
import { verifyAgentBusiness } from '../services/api';

interface BusinessVerificationPageProps {
  agentData?: Partial<User> | null;
  onCompleteVerification: (verificationDetails: { licenseNumber: string; isVerifiedAgent: boolean }) => void;
  onSkip: () => void;
}

export const BusinessVerificationPage: React.FC<BusinessVerificationPageProps> = ({
  agentData,
  onCompleteVerification,
  onSkip
}) => {
  const [businessName, setBusinessName] = useState(agentData?.agencyName || '');
  const [proofType, setProofType] = useState<'banner' | 'logo' | 'office' | 'cac' | 'business_card'>('banner');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [aiResult, setAiResult] = useState<{
    approved: boolean;
    confidenceScore: number;
    statusBadge: string;
    aiReason: string;
    licenseNumber: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAiResult(null);

    if (!businessName.trim() && !uploadedFile) {
      setErrorMessage('Please enter the name of your business and upload a proof of business image (banner, logo, office photo, or CAC).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate Firebase Storage document upload path
      const storageUrl = uploadedFile ? `gs://campora-firebase.appspot.com/proof_of_business/${Date.now()}_${uploadedFile.name}` : null;

      const res = await verifyAgentBusiness({
        businessName: businessName.trim(),
        proofType,
        documentFileName: uploadedFile ? uploadedFile.name : null,
        documentStorageUrl: storageUrl,
        agentName: agentData?.name || 'Agent',
        agencyName: businessName.trim() || agentData?.agencyName || 'Housing Agency'
      });

      setAiResult({
        approved: res.approved,
        confidenceScore: res.confidenceScore,
        statusBadge: res.statusBadge,
        aiReason: res.aiReason,
        licenseNumber: res.licenseNumber
      });

      if (res.approved) {
        setTimeout(() => {
          onCompleteVerification({
            licenseNumber: res.licenseNumber,
            isVerifiedAgent: true
          });
        }, 2200);
      }
    } catch (err: any) {
      console.error('AI verification failed:', err);
      setErrorMessage(err.message || 'Verification service encountered an error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-50/80 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-extrabold text-neutral-800 uppercase tracking-wider">Account Created</span>
          </div>
          <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
            STEP 2 OF 2: AGENT BUSINESS VERIFICATION
          </span>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
              Agent Business Profile Verification
            </h2>
            <p className="text-xs text-neutral-600 max-w-md mx-auto font-medium leading-relaxed">
              Welcome aboard, <strong className="text-neutral-900">{agentData?.name || 'Agent'}</strong>! Enter your business name and upload a picture of your banner, logo, office building, or CAC document to verify your agency.
            </p>
          </div>

          {/* Verification Benefit Banner */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold">Instant Proof of Business Verification</h4>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed font-medium">
                Verified agents display the green verified badge on listing cards, gaining higher student trust and priority WhatsApp inspection requests.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* AI Result Feedback Banner */}
          {aiResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
              aiResult.approved 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  aiResult.approved ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {aiResult.statusBadge} ({aiResult.confidenceScore}% AI Confidence)
                </span>
                <span className="text-[10px] font-bold text-slate-500">AI Trust Inspector</span>
              </div>
              <p className="text-xs font-semibold leading-relaxed">
                {aiResult.aiReason}
              </p>
              {aiResult.approved && (
                <div className="pt-2 text-[11px] text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Redirecting to Agent Dashboard...
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            
            {/* Business Name Field */}
            <div>
              <label className="font-bold text-neutral-800 block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Name of Business / Agency
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="e.g. Yaba Student Housing Ltd or Chief Tunde Lodges"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            {/* Proof of Business Category */}
            <div>
              <label className="font-bold text-neutral-800 block mb-2 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Select Proof of Business Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'banner', label: 'Banner Picture', icon: '🖼️' },
                  { id: 'logo', label: 'Business Logo', icon: '🎨' },
                  { id: 'office', label: 'Office Storefront', icon: '🏢' },
                  { id: 'business_card', label: 'Business Card', icon: '🎴' },
                  { id: 'cac', label: 'CAC Photo (Optional)', icon: '📜' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setProofType(item.id as any);
                      setErrorMessage(null);
                    }}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 justify-center transition-all ${
                      proofType === item.id
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Proof of Business Image File */}
            <div>
              <label className="font-bold text-neutral-800 block mb-1">
                Upload Proof of Business ({proofType === 'banner' ? 'Banner Photo' : proofType === 'logo' ? 'Logo Image' : proofType === 'office' ? 'Office Building Photo' : proofType === 'business_card' ? 'Business Card Image' : 'CAC Photo'})
              </label>
              <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-5 text-center bg-neutral-50/50 hover:bg-neutral-50 transition-all cursor-pointer">
                {uploadedFile ? (
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold px-2">
                    <span className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="text-[11px] text-rose-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1.5 py-1">
                    <Upload className="w-6 h-6 text-neutral-400" />
                    <span className="text-xs font-bold text-neutral-800">Click to upload banner, logo, office photo, or card</span>
                    <span className="text-[10px] text-neutral-400">JPG, PNG, WEBP, or PDF up to 10MB</span>
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadedFile(e.target.files[0]);
                          setErrorMessage(null);
                        }
                      }} 
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
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Verifying Business Profile with AI...
                  </>
                ) : (
                  <>
                    <BadgeCheck className="w-4 h-4" />
                    Submit & Verify Business Profile
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onSkip}
                className="w-full py-2.5 text-neutral-500 hover:text-neutral-900 font-semibold text-xs transition-colors"
              >
                Skip for now & go directly to Agent Dashboard
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

