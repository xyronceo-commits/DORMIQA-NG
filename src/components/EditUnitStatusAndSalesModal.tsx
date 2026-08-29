import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  DollarSign, 
  Tag, 
  FileText, 
  Building2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  Save, 
  Percent,
  ShieldAlert
} from 'lucide-react';
import { Listing, UnitStatus } from '../types';
import { updateListingStatusAndSales } from '../services/api';

interface EditUnitStatusAndSalesModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onListingUpdated: (updatedListing: Listing) => void;
}

export const EditUnitStatusAndSalesModal: React.FC<EditUnitStatusAndSalesModalProps> = ({
  listing,
  isOpen,
  onClose,
  onListingUpdated
}) => {
  const [title, setTitle] = useState<string>(listing.title || '');
  const [address, setAddress] = useState<string>(listing.address || '');
  const [description, setDescription] = useState<string>(listing.description || '');

  const [unitStatus, setUnitStatus] = useState<UnitStatus>(listing.unitStatus || 'vacant');
  const [vacanciesCount, setVacanciesCount] = useState<number>(listing.vacanciesCount || 1);
  const [unitStatusNote, setUnitStatusNote] = useState<string>(listing.unitStatusNote || '');

  // Sales Info State
  const [pricePerYear, setPricePerYear] = useState<number>(listing.pricePerYear || 350000);
  const [pricePerWeek, setPricePerWeek] = useState<number>(listing.pricePerWeek || Math.round((listing.pricePerYear || 350000) / 52));
  const [pricePerMonth, setPricePerMonth] = useState<number>(listing.pricePerMonth || Math.round((listing.pricePerYear || 350000) / 12));
  const [deposit, setDeposit] = useState<number>(listing.deposit || 30000);
  const [agencyFeeNote, setAgencyFeeNote] = useState<string>(listing.agencyFeeNote || '10% Agency & Legal Agreement Fee');
  const [promoDiscount, setPromoDiscount] = useState<string>(listing.promoDiscount || '');
  const [salesNote, setSalesNote] = useState<string>(listing.salesNote || '');
  const [isAvailableForSale, setIsAvailableForSale] = useState<boolean>(
    listing.isAvailableForSale !== undefined ? listing.isAvailableForSale : true
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleYearPriceChange = (val: number) => {
    setPricePerYear(val);
    setPricePerWeek(Math.round(val / 52));
    setPricePerMonth(Math.round(val / 12));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const updated = await updateListingStatusAndSales(listing.id, {
        title,
        hotelName: title,
        address,
        description,
        unitStatus,
        vacanciesCount,
        unitStatusNote,
        pricePerYear,
        pricePerMonth,
        pricePerWeek,
        deposit,
        agencyFeeNote,
        promoDiscount,
        salesNote,
        isAvailableForSale
      });

      setSuccessNotice('Property listing details updated successfully!');
      onListingUpdated(updated);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to update property details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Manage Unit Status & Sales Info</h2>
              <p className="text-xs text-slate-400 line-clamp-1">{listing.title} • {listing.hotelName || listing.address}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 0: BASIC PROPERTY DETAILS */}
          <div className="space-y-4">
            <div className="border-b border-neutral-200 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                1. Basic Property & Listing Details
              </h3>
              <p className="text-[11px] text-neutral-500">Edit the title, location address, and overview description of this hostel.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Hostel / Listing Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. Royal Crown Student Lodge"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Address / Campus Area
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. 14 Oke-Baale Expressway, Osogbo"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">
                Property Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                placeholder="Describe rooms, power supply, security, water supply, and distance to lecture halls..."
              />
            </div>
          </div>

          {/* SECTION 1: UNIT POSTED STATUS */}
          <div className="space-y-4">
            <div className="border-b border-neutral-200 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                2. Unit Occupancy & Availability Status
              </h3>
              <p className="text-[11px] text-neutral-500">Specify whether the rooms are vacant, occupied, under renovation, or if few units remain.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setUnitStatus('vacant')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  unitStatus === 'vacant'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500 mb-2"></div>
                <span className="text-xs font-bold">Vacant</span>
                <span className="text-[10px] text-neutral-500">Ready for move-in</span>
              </button>

              <button
                type="button"
                onClick={() => setUnitStatus('remaining')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  unitStatus === 'remaining'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-amber-500 mb-2"></div>
                <span className="text-xs font-bold">Few Remaining</span>
                <span className="text-[10px] text-neutral-500">Limited vacancies</span>
              </button>

              <button
                type="button"
                onClick={() => setUnitStatus('under_renovation')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  unitStatus === 'under_renovation'
                    ? 'bg-orange-50 border-orange-500 text-orange-950 ring-2 ring-orange-500/20'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-orange-500 mb-2"></div>
                <span className="text-xs font-bold">Under Renovation</span>
                <span className="text-[10px] text-neutral-500">Work in progress</span>
              </button>

              <button
                type="button"
                onClick={() => setUnitStatus('occupied')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  unitStatus === 'occupied'
                    ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/20'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-rose-500 mb-2"></div>
                <span className="text-xs font-bold">Occupied</span>
                <span className="text-[10px] text-neutral-500">Fully rented out</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Remaining Vacant Rooms Count
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={vacanciesCount}
                  onChange={(e) => setVacanciesCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. 3"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Unit Status Note / Detail
                </label>
                <input
                  type="text"
                  value={unitStatusNote}
                  onChange={(e) => setUnitStatusNote(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. Painting and tiling almost done. Available Oct 1st."
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: SALES & PRICING INFORMATION */}
          <div className="space-y-4">
            <div className="border-b border-neutral-200 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                3. Sales & Pricing Information
              </h3>
              <p className="text-[11px] text-neutral-500">Update property rental pricing, caution deposit, promo discounts, and sales notes.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Yearly Rent (₦)
                </label>
                <input
                  type="number"
                  step="5000"
                  min="0"
                  value={pricePerYear}
                  onChange={(e) => handleYearPriceChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Weekly Rent (₦)
                </label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={pricePerWeek}
                  onChange={(e) => setPricePerWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Refundable Caution Deposit (₦)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Agency & Legal Fee Terms
                </label>
                <input
                  type="text"
                  value={agencyFeeNote}
                  onChange={(e) => setAgencyFeeNote(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. 10% Agency & Legal Agreement Fee"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Special Offer / Promo Discount
                </label>
                <input
                  type="text"
                  value={promoDiscount}
                  onChange={(e) => setPromoDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. ₦20,000 Early Bird discount for full year payment"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">
                Sales & Payment Instructions / Notes
              </label>
              <textarea
                rows={2}
                value={salesNote}
                onChange={(e) => setSalesNote(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                placeholder="e.g. 2-tranche installment allowed. Inspection available Mondays - Saturdays 9am - 5pm."
              />
            </div>

            {/* Availability Toggle */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Accepting Student Enquiries & Inspections</span>
                <span className="text-[10px] text-neutral-500">Toggle off to temporarily hide sales button on student view.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailableForSale(!isAvailableForSale)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                  isAvailableForSale ? 'bg-emerald-600' : 'bg-neutral-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isAvailableForSale ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Unit Status & Sales Info</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
