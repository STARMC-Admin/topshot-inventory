'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertCircle, RefreshCw, Keyboard } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedValue: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const scannerElementId = 'html5-barcode-scanner';

    const startScanner = async () => {
      try {
        setCameraError(null);
        setIsScanning(true);

        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;

        const scanner = new Html5Qrcode(scannerElementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' }, // Back camera for phones
          {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Success callback
            scanner
              .stop()
              .catch(() => {})
              .finally(() => {
                onScanSuccess(decodedText);
                onClose();
              });
          },
          () => {
            // Frame scan failure (expected during search frames)
          }
        );
      } catch (err: any) {
        console.warn('Camera initialization error:', err);
        setCameraError(
          'Camera access was denied or not available. You can enter or paste the barcode manually below.'
        );
        setIsScanning(false);
      }
    };

    // Small delay to allow DOM element to render
    const timer = setTimeout(startScanner, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [isOpen, onScanSuccess, onClose]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      onScanSuccess(manualCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-lime-400 animate-pulse" />
            <h3 className="font-semibold text-lg">Scan Physical Racket Barcode</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-xl bg-black min-h-[260px] flex items-center justify-center border border-slate-800">
            <div id="html5-barcode-scanner" className="w-full" />
            
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90">
                <AlertCircle className="h-10 w-10 text-amber-400 mb-2" />
                <p className="text-sm text-slate-300 mb-2">{cameraError}</p>
                <span className="text-xs text-slate-400">
                  Tip: On mobile devices, ensure camera permissions are allowed for this site.
                </span>
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-xs text-slate-400">
            Align the barcode sticker on the racket within the scanning frame.
          </p>

          {/* Manual Input Fallback */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Keyboard className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Or enter barcode (e.g. TS-PRO-...)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400 border border-slate-700"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-lime-300 disabled:opacity-50 transition-colors"
              >
                Apply
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
