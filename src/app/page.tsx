'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  RotateCcw,
  BarChart3,
  Smartphone,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  UserCheck,
  ArrowRight,
  Sparkles,
  KeyRound,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { WorkerDispatchView } from '@/components/WorkerDispatchView';
import { WorkerReturnView } from '@/components/WorkerReturnView';
import { AdminDashboardView } from '@/components/AdminDashboardView';

type ActiveTab = 'dispatch' | 'return' | 'admin';
type UserRole = 'worker' | 'ceo' | null;

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dispatch');
  const [role, setRole] = useState<UserRole>(null);
  const [ceoPin, setCeoPin] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Login form state
  const [loginPinInput, setLoginPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // In-session unlock modal state (when worker tries to access CEO tab)
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Restore session from localStorage on initial mount
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('topshot_auth_role') as UserRole;
      const savedPin = localStorage.getItem('topshot_auth_pin') || '';

      if (savedRole === 'worker') {
        setRole('worker');
      } else if (savedRole === 'ceo' && savedPin) {
        setRole('ceo');
        setCeoPin(savedPin);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Handler: Worker 1-click Sign In
  const handleWorkerSignIn = () => {
    setRole('worker');
    setCeoPin('');
    setActiveTab('dispatch');
    localStorage.setItem('topshot_auth_role', 'worker');
    localStorage.removeItem('topshot_auth_pin');
  };

  // Handler: CEO Sign In
  const handleCeoSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = loginPinInput.trim();
    if (!pin) {
      setLoginError('Please enter the CEO Security PIN.');
      return;
    }

    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ceo', pin }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Authentication failed. Please verify PIN.');
      } else {
        setRole('ceo');
        setCeoPin(pin);
        setActiveTab('admin');
        localStorage.setItem('topshot_auth_role', 'ceo');
        localStorage.setItem('topshot_auth_pin', pin);
        setLoginPinInput('');
      }
    } catch {
      setLoginError('Network error during authentication.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handler: In-session Unlock CEO Mode (when worker clicks CEO tab)
  const handleUnlockCeoMode = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = unlockPinInput.trim();
    if (!pin) {
      setUnlockError('Please enter CEO PIN.');
      return;
    }

    setIsAuthenticating(true);
    setUnlockError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ceo', pin }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setUnlockError(data.error || 'Invalid CEO PIN.');
      } else {
        setRole('ceo');
        setCeoPin(pin);
        setActiveTab('admin');
        localStorage.setItem('topshot_auth_role', 'ceo');
        localStorage.setItem('topshot_auth_pin', pin);
        setIsUnlockModalOpen(false);
        setUnlockPinInput('');
      }
    } catch {
      setUnlockError('Network error during PIN verification.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handler: Sign Out
  const handleSignOut = () => {
    setRole(null);
    setCeoPin('');
    setActiveTab('dispatch');
    localStorage.removeItem('topshot_auth_role');
    localStorage.removeItem('topshot_auth_pin');
  };

  // Switch to Worker mode
  const handleSwitchToWorker = () => {
    setRole('worker');
    setCeoPin('');
    setActiveTab('dispatch');
    localStorage.setItem('topshot_auth_role', 'worker');
    localStorage.removeItem('topshot_auth_pin');
  };

  // Handler for tab navigation
  const handleTabClick = (tab: ActiveTab) => {
    if (tab === 'admin' && role === 'worker') {
      // Worker blocked from accessing CEO metrics
      setIsUnlockModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-lime-400" />
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: AUTHENTICATION GATEWAY (When user has not selected role)
  // -------------------------------------------------------------
  if (!role) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-4xl space-y-8 my-auto">
          {/* Top Brand Banner */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-lime-400 font-black text-slate-950 text-3xl shadow-xl shadow-lime-400/20 mb-2">
              ⚡
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-extrabold text-3xl sm:text-4xl tracking-tight text-white">TOPSHOT</h1>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-lime-400/20 text-lime-400 border border-lime-400/30">
                PICKLEBALL
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Role-Based Access Control • Warehouse Fulfillment & Executive Intelligence
            </p>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Warehouse Worker Portal */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xl hover:border-slate-700 transition-all">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-2xl">
                  👷
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Warehouse Worker Portal</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Order dispatching and parcel returns/refund processing.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span>Scan & Dispatch Multiple Rackets per Order</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span>Process Returns & Issue Fresh Restock Barcodes</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-400 font-medium">
                    <Lock className="h-4 w-4 flex-shrink-0" />
                    <span>CEO Financial Metrics & Ledgers Restricted</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleWorkerSignIn}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 text-sm border border-slate-700 shadow-md transition-all active:scale-[0.99]"
                >
                  <UserCheck className="h-4 w-4 text-lime-400" />
                  <span>Enter as Warehouse Worker</span>
                </button>
              </div>
            </div>

            {/* Card 2: Executive CEO Portal */}
            <div className="rounded-3xl bg-slate-900 border border-sky-900/60 p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-2xl">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">Executive CEO Portal</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      Full Access
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Financial metrics, stock acquisition, pricing, and orders history.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-sky-400 font-semibold">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span>Gross & Net Revenues, Margins & Logistics Costs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-400 font-semibold">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span>Batch Stock Acquisition & Barcode Label Generation</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-400 font-semibold">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span>Historical Order Intelligence & Financial CSV/Excel Export</span>
                  </div>
                </div>

                {/* PIN Input Form */}
                <form onSubmit={handleCeoSignIn} className="space-y-3 pt-2">
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-400" />
                    <input
                      type="password"
                      maxLength={8}
                      placeholder="Enter CEO PIN (Default: 9876)"
                      value={loginPinInput}
                      onChange={(e) => {
                        setLoginPinInput(e.target.value);
                        setLoginError(null);
                      }}
                      className="w-full rounded-2xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>

                  {loginError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-950/60 border border-rose-800/80 p-2.5 text-xs text-rose-300">
                      <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-3.5 px-4 text-sm shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all active:scale-[0.99]"
                  >
                    {isAuthenticating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>Authenticate as CEO</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            Topshot Pickleball Retail Enterprise • Delhivery Integrated • Strict Barcode Security
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW: MAIN APPLICATION DASHBOARD (When authenticated)
  // -------------------------------------------------------------
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Topshot Brand Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-lime-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-lime-400/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-white">TOPSHOT</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-400 border border-lime-400/30">
                  PICKLEBALL
                </span>
              </div>
              <p className="text-xs text-slate-400">Inventory & Order Management System</p>
            </div>
          </div>

          {/* User Session Badge & Controls */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            {role === 'worker' ? (
              <div className="inline-flex items-center gap-2 bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-semibold text-amber-300">Worker Station</span>
                <span className="text-slate-500">|</span>
                <button
                  onClick={() => setIsUnlockModalOpen(true)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
                  title="Unlock CEO Controls"
                >
                  <Lock className="h-3 w-3 text-amber-400" />
                  <span>Unlock CEO</span>
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-slate-900 border border-sky-500/30 px-3 py-1.5 rounded-xl text-xs">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                <span className="font-bold text-sky-300">👑 CEO Mode (Full Access)</span>
                <span className="text-slate-500">|</span>
                <button
                  onClick={handleSwitchToWorker}
                  className="text-slate-400 hover:text-white text-[11px] transition-colors"
                >
                  Switch to Worker
                </button>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Workflow Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleTabClick('dispatch')}
              className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'dispatch'
                  ? 'border-lime-400 text-lime-400 bg-lime-400/5'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Worker: Scan & Dispatch</span>
            </button>

            <button
              onClick={() => handleTabClick('return')}
              className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'return'
                  ? 'border-rose-400 text-rose-400 bg-rose-400/5'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Worker: Process Return / Refund</span>
            </button>

            <button
              onClick={() => handleTabClick('admin')}
              className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'border-sky-400 text-sky-400 bg-sky-400/5'
                  : role === 'worker'
                  ? 'border-transparent text-slate-500 hover:text-amber-400 opacity-80'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {role === 'worker' ? (
                <Lock className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              <span>CEO: Metrics & SKUs</span>
              {role === 'worker' && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold">
                  PIN Required
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dispatch' && (
          <WorkerDispatchView isCeo={role === 'ceo'} ceoPin={ceoPin} />
        )}
        {activeTab === 'return' && <WorkerReturnView />}
        {activeTab === 'admin' && role === 'ceo' && (
          <AdminDashboardView ceoPin={ceoPin} />
        )}
        {activeTab === 'admin' && role === 'worker' && (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-slate-900 border border-amber-500/30 text-center space-y-4">
            <Lock className="h-10 w-10 text-amber-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">CEO Access Restricted</h3>
            <p className="text-xs text-slate-400">
              Warehouse workers are authorized for order dispatching and refund processing only.
              To view financial metrics, SKU pricing, or export reports, please authenticate with the CEO PIN.
            </p>
            <button
              onClick={() => setIsUnlockModalOpen(true)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
            >
              Enter CEO Security PIN
            </button>
          </div>
        )}
      </div>

      {/* In-Session CEO Unlock Modal Dialog */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">CEO Authentication</h3>
                  <p className="text-[11px] text-slate-400">Unlock executive metrics & controls</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUnlockModalOpen(false);
                  setUnlockError(null);
                  setUnlockPinInput('');
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUnlockCeoMode} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  CEO Security PIN
                </label>
                <input
                  type="password"
                  maxLength={8}
                  placeholder="Enter PIN (Default: 9876)"
                  value={unlockPinInput}
                  onChange={(e) => {
                    setUnlockPinInput(e.target.value);
                    setUnlockError(null);
                  }}
                  autoFocus
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 font-mono"
                />
              </div>

              {unlockError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-950/60 border border-rose-800/80 p-2.5 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAuthenticating || !unlockPinInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs disabled:opacity-50"
                >
                  {isAuthenticating ? 'Verifying...' : 'Unlock CEO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        Topshot Pickleball Retail Enterprise • Delhivery Integrated • Real-time Barcode Tracking
      </footer>
    </main>
  );
}
