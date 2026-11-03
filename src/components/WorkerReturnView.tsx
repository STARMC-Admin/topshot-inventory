'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle,
  Printer,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  PackageCheck,
  Tag,
  Layers,
} from 'lucide-react';
import { generateBarcodePDF } from '@/lib/pdfGenerator';

export const WorkerReturnView: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch('/api/orders/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to process return');
      } else {
        setResult(data.data);
      }
    } catch {
      setErrorMsg('Network error while processing return');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintAllLabels = () => {
    const labels = result?.labels_to_print || (result?.label_to_print ? [result.label_to_print] : []);
    if (labels.length === 0) return;

    const doc = generateBarcodePDF(labels, { format: 'thermal_single' });
    doc.save(`Topshot_Restock_Labels_${result?.returned_order?.order_id || Date.now()}.pdf`);
  };

  const restockedList = result?.restocked_items || (result?.restocked_item ? [result.restocked_item] : []);

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pb-12">
      {/* Return Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 p-5 border border-slate-700/60 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <RotateCcw className="h-3.5 w-3.5" /> Return & Refund Station
          </span>
        </div>
        <h2 className="text-xl font-bold mt-2">Process Racket Return & Restock</h2>
        <p className="text-xs text-slate-400 mt-1">
          Scans or looks up an Order ID, Delhivery Waybill, or Racket Barcode. Automatically decommissions the old barcode,
          issues fresh barcodes + UUIDs for each racket in the order, and restocks live inventory.
        </p>
      </div>

      {/* Input Form */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm text-white">
        <form onSubmit={handleProcessReturn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Returned Package or Racket Identifier
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Order ID (ORD-...), Delhivery ID, or Barcode"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-lime-400 placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={!identifier.trim() || isProcessing}
                className="rounded-xl bg-lime-400 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-lime-300 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-md"
              >
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Find & Process
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              You can read the Delhivery waybill sticker on the external parcel to look up the order.
            </p>
          </div>
        </form>

        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-800/80 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Success Restock & Label Card */}
      {result && (
        <div className="rounded-2xl bg-slate-900 border border-emerald-500/40 p-5 shadow-xl text-white space-y-4 animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-base text-emerald-300">Return & Restock Successful!</h3>
              <p className="text-xs text-slate-400">
                Order <span className="font-mono text-white font-semibold">{result.returned_order.order_id}</span> marked as Returned.
              </p>
            </div>
          </div>

          {/* Returned Order Details */}
          <div className="rounded-xl bg-slate-800/80 border border-slate-700/80 p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Customer Name:</span>
              <span className="font-semibold text-white">{result.returned_order.buyer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Delhivery Waybill:</span>
              <span className="font-mono text-slate-300">{result.returned_order.delivery_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Units Processed:</span>
              <span className="font-bold text-emerald-400">{restockedList.length} Racket(s)</span>
            </div>
          </div>

          {/* Fresh Restock Records Generated */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-lime-400" />
                Fresh Barcodes Issued for Restocking ({restockedList.length})
              </span>
            </div>

            <div className="space-y-2">
              {restockedList.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{item.sku_name || item.sku_id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      Restocked (+1)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">New Printable Barcode:</span>
                    <span className="font-mono text-lime-400 font-bold">{item.new_barcode_value}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    New UUID: {item.new_pickle_racket_id}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Print Barcode Sticker Button */}
          <button
            onClick={handlePrintAllLabels}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-3 font-bold text-slate-950 hover:bg-lime-300 active:scale-95 transition-all shadow-lg shadow-lime-400/20 text-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Print Restock Barcode Label{restockedList.length > 1 ? 's' : ''} (PDF)</span>
          </button>
        </div>
      )}
    </div>
  );
};
