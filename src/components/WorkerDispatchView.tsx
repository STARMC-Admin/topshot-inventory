'use client';

import React, { useState } from 'react';
import {
  Camera,
  Truck,
  Tag,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ArrowRight,
  Package,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

export interface RacketData {
  pickle_racket_id: string;
  barcode_value: string;
  sku_id: string;
  sku_name: string;
  preset_selling_cost: number;
  status: string;
}

export interface DelhiveryData {
  delivery_id: string;
  buyer_name: string;
  buyer_address: string;
  shipping_cost: number;
  destination_city: string;
}

interface WorkerDispatchViewProps {
  ceoPin?: string;
  isCeo?: boolean;
}

export const WorkerDispatchView: React.FC<WorkerDispatchViewProps> = ({ ceoPin = '', isCeo = false }) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentBarcodeInput, setCurrentBarcodeInput] = useState('');
  const [isLoadingRacket, setIsLoadingRacket] = useState(false);
  const [racketError, setRacketError] = useState<string | null>(null);

  // Multi-racket order list
  const [scannedRackets, setScannedRackets] = useState<RacketData[]>([]);

  // Delivery details
  const [deliveryId, setDeliveryId] = useState('');
  const [isLoadingDelhivery, setIsLoadingDelhivery] = useState(false);
  const [delhiveryDetails, setDelhiveryDetails] = useState<DelhiveryData | null>(null);
  const [delhiveryError, setDelhiveryError] = useState<string | null>(null);

  // Discount & Admin PIN
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [adminPin, setAdminPin] = useState(ceoPin || '');
  const [pinRequiredError, setPinRequiredError] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<any | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Handler: Scan or Lookup a Barcode to ADD to order
  const handleAddBarcode = async (barcodeToAdd: string) => {
    const clean = barcodeToAdd.trim();
    if (!clean) return;

    // Check if already in order list
    const alreadyAdded = scannedRackets.some(
      (r) => r.barcode_value.toLowerCase() === clean.toLowerCase() ||
             r.pickle_racket_id.toLowerCase() === clean.toLowerCase()
    );
    if (alreadyAdded) {
      setRacketError(`Racket "${clean}" has already been added to this order.`);
      return;
    }

    setIsLoadingRacket(true);
    setRacketError(null);

    try {
      const res = await fetch(`/api/inventory/scan?barcode=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setRacketError(data.error || 'Failed to find scanned barcode');
      } else {
        const racket: RacketData = data.data;
        // Check once more in case of race condition
        if (scannedRackets.some((r) => r.barcode_value === racket.barcode_value)) {
          setRacketError(`Racket "${racket.barcode_value}" is already in this order.`);
        } else {
          setScannedRackets((prev) => [...prev, racket]);
          setCurrentBarcodeInput('');
          setRacketError(null);
        }
      }
    } catch {
      setRacketError('Network error looking up barcode');
    } finally {
      setIsLoadingRacket(false);
    }
  };

  // Remove a racket from the current order list
  const handleRemoveRacket = (indexToRemove: number) => {
    setScannedRackets((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handler: Fetch Delhivery details
  const handleVerifyDelhivery = async () => {
    if (!deliveryId.trim()) return;

    setIsLoadingDelhivery(true);
    setDelhiveryError(null);
    setDelhiveryDetails(null);

    try {
      const res = await fetch(`/api/delhivery/track?delivery_id=${encodeURIComponent(deliveryId.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setDelhiveryError(data.error || 'Failed to verify tracking number');
      } else {
        setDelhiveryDetails(data.data);
      }
    } catch {
      setDelhiveryError('Failed to contact Delhivery logistics API');
    } finally {
      setIsLoadingDelhivery(false);
    }
  };

  // Price computations across all added rackets
  const totalPresetCost = scannedRackets.reduce((sum, r) => sum + (r.preset_selling_cost || 0), 0);
  const discountAmount = Math.round((totalPresetCost * discountPercent) / 100);
  const finalPrice = Math.max(0, totalPresetCost - discountAmount);
  const isHighDiscount = discountPercent > 20;

  // Submit Order Dispatch
  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scannedRackets.length === 0 || !deliveryId.trim()) return;

    const effectivePin = adminPin.trim() || (isCeo ? ceoPin : '');

    if (isHighDiscount && !effectivePin) {
      setPinRequiredError(true);
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setPinRequiredError(false);

    try {
      const res = await fetch('/api/orders/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode_values: scannedRackets.map((r) => r.barcode_value),
          delivery_id: deliveryId.trim(),
          discount_percentage: discountPercent,
          admin_pin: effectivePin || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.requiresAdminPin) {
          setPinRequiredError(true);
        }
        setSubmissionError(data.error || 'Dispatch submission failed');
      } else {
        setDispatchSuccess(data.data);
        // Reset inputs
        setScannedRackets([]);
        setCurrentBarcodeInput('');
        setDeliveryId('');
        setDelhiveryDetails(null);
        setDiscountPercent(0);
        if (!isCeo) setAdminPin('');
      }
    } catch {
      setSubmissionError('Network error while dispatching order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-12">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 border border-slate-700/60 shadow-lg text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-400/10 text-lime-400 border border-lime-400/20">
              <Package className="h-3.5 w-3.5" /> Mobile Worker Station
            </span>
            <h2 className="text-xl font-bold mt-1">Scan & Dispatch Orders</h2>
            <p className="text-xs text-slate-400">
              Add one or multiple rackets to a single Delhivery Order ID
            </p>
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-3 font-bold text-slate-950 shadow-lg shadow-lime-400/20 hover:bg-lime-300 active:scale-95 transition-all"
          >
            <Camera className="h-5 w-5" />
            <span className="text-sm">Scan with Camera</span>
          </button>
        </div>
      </div>

      {/* Success Receipt Alert */}
      {dispatchSuccess && (
        <div className="rounded-2xl bg-emerald-950/80 border border-emerald-500/50 p-5 text-emerald-100 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-emerald-200">Order Dispatched Successfully!</h4>
              <p className="text-xs text-emerald-300/80">
                Order ID: <span className="font-mono font-semibold text-white">{dispatchSuccess.order.order_id}</span>
              </p>
            </div>
          </div>

          <div className="bg-black/40 p-3.5 rounded-xl border border-emerald-500/20 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-emerald-400/70 block">Delhivery Tracking</span>
                <span className="font-mono text-white font-semibold">{dispatchSuccess.order.delivery_id}</span>
              </div>
              <div>
                <span className="text-emerald-400/70 block">Buyer Name</span>
                <span className="font-medium text-white">{dispatchSuccess.order.buyer_name}</span>
              </div>
              <div>
                <span className="text-emerald-400/70 block">Total Units</span>
                <span className="font-bold text-white">
                  {dispatchSuccess.total_units || dispatchSuccess.rackets?.length || 1} Racket(s)
                </span>
              </div>
              <div>
                <span className="text-emerald-400/70 block">Final Charged Price</span>
                <span className="font-bold text-lime-400 text-sm">
                  ₹{Number(dispatchSuccess.order.final_selling_price).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* List of dispatched items */}
            {dispatchSuccess.rackets && dispatchSuccess.rackets.length > 0 && (
              <div className="pt-2 border-t border-emerald-500/20">
                <span className="text-emerald-400/70 block font-semibold mb-1">Dispatched Rackets:</span>
                <div className="space-y-1">
                  {dispatchSuccess.rackets.map((r: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-black/30 px-2 py-1 rounded text-[11px]">
                      <span className="text-white truncate max-w-[200px]">{r.sku_name || r.sku_id}</span>
                      <span className="font-mono text-lime-300">{r.barcode_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setDispatchSuccess(null)}
            className="w-full text-center text-xs text-emerald-300 hover:text-white pt-1 font-semibold"
          >
            Dismiss & Ready for Next Order
          </button>
        </div>
      )}

      {/* Scanner Dialog Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerOpen(false);
          handleAddBarcode(code);
        }}
      />

      {/* Step 1: Add Rackets to Order (Multi-racket support) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm text-white space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 1: Add Rackets to Order
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-lime-400/20 text-lime-400 border border-lime-400/30">
              {scannedRackets.length} Added
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="text-xs text-lime-400 hover:underline flex items-center gap-1"
          >
            <Camera className="h-3.5 w-3.5" /> Scan Barcode
          </button>
        </div>

        {/* Input Barcode Manual or Prepopulated */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Scan or enter barcode (e.g. TS-AERO-...)"
            value={currentBarcodeInput}
            onChange={(e) => setCurrentBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddBarcode(currentBarcodeInput);
              }
            }}
            className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-lime-400 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={() => handleAddBarcode(currentBarcodeInput)}
            disabled={!currentBarcodeInput.trim() || isLoadingRacket}
            className="rounded-xl bg-lime-400 text-slate-950 px-4 py-2 text-sm font-bold hover:bg-lime-300 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 flex items-center gap-1.5 transition-all shadow-md"
          >
            {isLoadingRacket ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>Add Racket</span>
          </button>
        </div>

        {racketError && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-950/50 border border-rose-800/60 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{racketError}</span>
          </div>
        )}

        {/* Scanned Rackets Cart / List */}
        {scannedRackets.length > 0 ? (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold text-slate-400 flex justify-between">
              <span>Items in this Order ({scannedRackets.length}):</span>
              <span className="text-slate-400">
                Preset Total: <strong className="text-white">₹{totalPresetCost.toLocaleString('en-IN')}</strong>
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {scannedRackets.map((r, index) => (
                <div
                  key={`${r.barcode_value}-${index}`}
                  className="rounded-xl bg-slate-800/90 border border-slate-700 p-3 flex items-center justify-between gap-3 text-sm hover:border-slate-600 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-lime-950/80 text-lime-400 border border-lime-800/60 font-semibold">
                        #{index + 1}
                      </span>
                      <h4 className="font-semibold text-white truncate text-xs sm:text-sm">
                        {r.sku_name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="font-mono text-lime-300/90">{r.barcode_value}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-200">
                        ₹{r.preset_selling_cost.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRacket(index)}
                    title="Remove racket from order"
                    className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900 hover:text-white transition-all flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              💡 Tip: Scan or enter another barcode above to add multiple rackets to this same order.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-slate-500 text-xs">
            <Layers className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            <p>No rackets added yet. Scan or enter a physical barcode to begin this order.</p>
          </div>
        )}
      </div>

      {/* Step 2: Delhivery Tracking Integration */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Step 2: Delhivery Tracking Number
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Truck className="h-3.5 w-3.5 text-lime-400" /> Logistics Sync
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. DLHV-982347101 or DLHV-TEST-1001"
            value={deliveryId}
            onChange={(e) => setDeliveryId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleVerifyDelhivery();
              }
            }}
            className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-lime-400 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={handleVerifyDelhivery}
            disabled={!deliveryId.trim() || isLoadingDelhivery}
            className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoadingDelhivery ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Fetch Details'}
          </button>
        </div>

        {delhiveryError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-950/50 border border-rose-800/60 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{delhiveryError}</span>
          </div>
        )}

        {delhiveryDetails && (
          <div className="mt-4 rounded-xl bg-slate-800/80 border border-slate-700 p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Buyer Name:</span>
              <span className="font-semibold text-white text-sm">{delhiveryDetails.buyer_name}</span>
            </div>
            <div className="flex justify-between items-start text-slate-300">
              <span className="text-slate-400 flex-shrink-0 mr-2">Address:</span>
              <span className="text-right text-slate-200">{delhiveryDetails.buyer_address}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-700/60">
              <span className="text-slate-400">Delhivery Shipping Cost:</span>
              <span className="font-semibold text-amber-400">₹{delhiveryDetails.shipping_cost}</span>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Pricing & Discount Logic */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Step 3: Discount & Approval Rule
          </span>
          <Tag className="h-4 w-4 text-lime-400" />
        </div>

        {/* Discount Slider & Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-300">Manual Order Discount Percentage:</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="90"
                value={discountPercent}
                onChange={(e) => {
                  const val = Math.min(90, Math.max(0, Number(e.target.value)));
                  setDiscountPercent(val);
                }}
                className="w-16 rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-right text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-lime-400"
              />
              <span className="font-bold text-slate-400">%</span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="60"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="w-full accent-lime-400 cursor-pointer"
          />

          {/* Hard Rule Alert */}
          {isHighDiscount && (
            <div className="rounded-xl bg-amber-950/60 border border-amber-600/50 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <span>Admin Approval Required (Discount &gt; 20%)</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Corporate policy blocks submission for discounts exceeding 20% without CEO/Admin PIN override.
              </p>
              <div className="relative pt-1">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-amber-500" />
                <input
                  type="password"
                  maxLength={8}
                  placeholder="Enter CEO / Admin PIN (Default: 9876)"
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    setPinRequiredError(false);
                  }}
                  className={`w-full rounded-xl bg-slate-900 border ${
                    pinRequiredError ? 'border-rose-500 ring-2 ring-rose-500' : 'border-amber-600/40'
                  } pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400`}
                />
              </div>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Combined Preset Cost ({scannedRackets.length} Racket{scannedRackets.length !== 1 ? 's' : ''}):</span>
              <span>₹{totalPresetCost.toLocaleString('en-IN')}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Discount ({discountPercent}%):</span>
                <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-slate-800">
              <span>Final Order Total:</span>
              <span className="text-lime-400">₹{finalPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Error Banner */}
      {submissionError && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-950/60 border border-rose-700/60 p-4 text-xs text-rose-200">
          <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Submission Blocked</span>
            <span>{submissionError}</span>
          </div>
        </div>
      )}

      {/* Final Dispatch Button */}
      <button
        onClick={handleDispatchOrder}
        disabled={scannedRackets.length === 0 || !deliveryId.trim() || isSubmitting}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-lime-400 py-4 font-bold text-slate-950 text-base shadow-xl shadow-lime-400/20 hover:bg-lime-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-all"
      >
        {isSubmitting ? (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Processing Order Dispatch...</span>
          </>
        ) : (
          <>
            <span>
              Confirm & Dispatch Order ({scannedRackets.length} Racket{scannedRackets.length !== 1 ? 's' : ''})
            </span>
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </div>
  );
};
