'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  X,
  Printer,
  Sparkles,
  Layers,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { generateBarcodePDF } from '@/lib/pdfGenerator';

interface AdminAcquisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  existingSkus?: Array<{ sku_id: string; name: string; preset_selling_cost: number }>;
  ceoPin?: string;
}

export const AdminAcquisitionModal: React.FC<AdminAcquisitionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingSkus = [],
  ceoPin = '',
}) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [newSkuId, setNewSkuId] = useState('');
  const [name, setName] = useState('');
  const [presetCost, setPresetCost] = useState<number>(3499);
  const [quantity, setQuantity] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acquisitionResult, setAcquisitionResult] = useState<any | null>(null);

  useEffect(() => {
    if (existingSkus.length > 0 && !selectedSkuId) {
      setSelectedSkuId(existingSkus[0].sku_id);
    }
  }, [existingSkus, selectedSkuId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setAcquisitionResult(null);

    const payload = {
      sku_id: mode === 'existing' ? selectedSkuId : newSkuId.trim().toUpperCase(),
      name: mode === 'new' ? name.trim() : undefined,
      preset_selling_cost: mode === 'new' ? presetCost : undefined,
      quantity,
    };

    try {
      const res = await fetch('/api/inventory/acquire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': ceoPin,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to acquire inventory');
      } else {
        setAcquisitionResult(data.data);
        if (onSuccess) onSuccess();
      }
    } catch {
      setErrorMsg('Network error while processing inventory acquisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = (format: 'thermal_single' | 'a4_sheet') => {
    if (!acquisitionResult?.items) return;
    const doc = generateBarcodePDF(acquisitionResult.items, { format });
    doc.save(`Topshot_Barcodes_${acquisitionResult.sku_id}_${acquisitionResult.batch_id}_${format}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-lime-400" />
            <h3 className="font-bold text-lg">Inbound Inventory Acquisition</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {!acquisitionResult ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('existing')}
                  className={`py-2 rounded-lg transition-all ${
                    mode === 'existing' ? 'bg-lime-400 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Restock Existing SKU
                </button>
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={`py-2 rounded-lg transition-all ${
                    mode === 'new' ? 'bg-lime-400 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Create & Inbound New SKU
                </button>
              </div>

              {mode === 'existing' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Select Target SKU
                  </label>
                  {existingSkus.length > 0 ? (
                    <select
                      value={selectedSkuId}
                      onChange={(e) => setSelectedSkuId(e.target.value)}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                    >
                      {existingSkus.map((s) => (
                        <option key={s.sku_id} value={s.sku_id}>
                          {s.sku_id} — {s.name} (₹{s.preset_selling_cost})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-400 bg-amber-950/40 p-2.5 rounded-lg border border-amber-800">
                      No SKUs exist yet. Switch to "Create & Inbound New SKU" above.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      SKU Code / ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SKU-PRO-CARBON-01"
                      value={newSkuId}
                      onChange={(e) => setNewSkuId(e.target.value)}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white uppercase focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Racket Model Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Topshot Aero Pro Carbon Racket"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Preset Selling Cost (MSRP INR)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={presetCost}
                      onChange={(e) => setPresetCost(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Quantity Received (pcs)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-32 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                  <span className="text-xs text-slate-400">
                    System will automatically generate {quantity} unique barcodes & UUIDs.
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-950/60 border border-rose-800 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (mode === 'existing' && !selectedSkuId)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-3 font-bold text-slate-950 text-sm shadow-lg shadow-lime-400/20 hover:bg-lime-300 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Generating Barcodes & Registering Items...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Inbound Barcodes & Ingest</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Barcode Print Options on Successful Ingestion */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <h4 className="font-bold text-white text-base">Inbound Batch Ingested!</h4>
                  <p className="text-xs text-slate-400">
                    Batch: <span className="font-mono text-lime-400">{acquisitionResult.batch_id}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-xs space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>SKU:</span>
                  <span className="font-bold text-white">{acquisitionResult.sku_name}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Total Physical Units Added:</span>
                  <span className="font-bold text-lime-400">+{acquisitionResult.quantity_acquired} pcs</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Unique Barcodes Provisioned:</span>
                  <span className="font-mono text-white">{acquisitionResult.items.length} records</span>
                </div>
              </div>

              {/* Printable PDF Generation Actions */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Print Adhesive Barcode Labels
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF('thermal_single')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-3 font-bold text-slate-950 hover:bg-lime-300 transition-all text-sm shadow-lg shadow-lime-400/20"
                >
                  <Printer className="h-4 w-4" />
                  <span>Download Thermal Roll Stickers (50x35mm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF('a4_sheet')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 py-2.5 font-semibold text-white hover:bg-slate-700 transition-all text-sm"
                >
                  <FileText className="h-4 w-4 text-lime-400" />
                  <span>Download A4 Sheet (24 Labels/Page)</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setAcquisitionResult(null);
                    onClose();
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-white"
                >
                  Done & Close Modal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
