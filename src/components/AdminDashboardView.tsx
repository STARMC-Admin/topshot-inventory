'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  RotateCcw,
  Download,
  Plus,
  Edit2,
  Check,
  X,
  Calendar,
  Layers,
  ShieldAlert,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { AdminAcquisitionModal } from './AdminAcquisitionModal';
import { AdminOrdersHistoryView } from './AdminOrdersHistoryView';

interface MetricsData {
  summary: {
    grossRevenue: number;
    netRevenue: number;
    totalShippingCost: number;
    totalUnitsSold: number;
    totalUnitsReturned: number;
    totalUnitsInStock: number;
    returnRate: number;
    totalOrdersCount: number;
    discountOverridesCount: number;
  };
  inventoryLevels: Array<{
    sku_id: string;
    name: string;
    preset_selling_cost: number;
    in_stock_count: number;
  }>;
  weeklyChart: Array<{
    date: string;
    displayDate: string;
    revenue: number;
    units: number;
  }>;
  monthlyChart: Array<{
    month: string;
    revenue: number;
    units: number;
  }>;
  recentOrders: Array<any>;
}

interface AdminDashboardViewProps {
  ceoPin?: string;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ ceoPin = '' }) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');
  const [isAcquisitionOpen, setIsAcquisitionOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // SKU editing state
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [isSavingSku, setIsSavingSku] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      const res = await fetch('/api/admin/metrics', {
        headers: {
          'x-admin-pin': ceoPin,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMetrics(data.data);
      } else {
        setAuthError(data.error || 'Failed to load CEO metrics');
      }
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
      setAuthError('Network error fetching CEO metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [ceoPin]);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setIsExporting(true);
      const res = await fetch(`/api/admin/export?format=${format}`, {
        headers: {
          'x-admin-pin': ceoPin,
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topshot_financial_report_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export orders:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSkuPrice = async (skuId: string) => {
    try {
      setIsSavingSku(true);
      const res = await fetch('/api/skus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': ceoPin,
        },
        body: JSON.stringify({ sku_id: skuId, preset_selling_cost: editPrice }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingSkuId(null);
        fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to save SKU:', err);
    } finally {
      setIsSavingSku(false);
    }
  };

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center p-6 bg-slate-900 border border-rose-800/60 rounded-2xl gap-3">
        <ShieldAlert className="h-10 w-10 text-rose-500" />
        <h3 className="text-lg font-bold text-white">Executive Access Restricted</h3>
        <p className="text-sm text-slate-400 max-w-md">{authError}</p>
        <button
          onClick={fetchMetrics}
          className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry Authentication
        </button>
      </div>
    );
  }

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-lime-400" />
        <p className="text-sm">Aggregating CEO metrics and inventory levels...</p>
      </div>
    );
  }

  const summary = metrics?.summary;
  const activeChartData = chartView === 'weekly' ? metrics?.weeklyChart : metrics?.monthlyChart;
  const maxRevenue = Math.max(...(activeChartData?.map((d) => d.revenue) || [1]), 1000);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm text-white">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-400/10 text-lime-400 border border-lime-400/20">
            👑 Executive CEO Portal
          </span>
          <h2 className="text-2xl font-bold mt-1">Topshot Business Intelligence</h2>
          <p className="text-xs text-slate-400">Live inventory valuation, dispatch velocity & returns</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAcquisitionOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-lime-400/20 hover:bg-lime-300 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Inventory (Inbound)</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-lime-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-lime-400" />
          </div>
          <div className="text-2xl font-extrabold text-lime-400">
            ₹{(summary?.grossRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Net: ₹{(summary?.netRevenue || 0).toLocaleString('en-IN')} (post shipping)
          </div>
        </div>

        {/* Total Units Sold */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Units Sold</span>
            <TrendingUp className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {summary?.totalUnitsSold || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {summary?.totalOrdersCount || 0} total shipments
          </div>
        </div>

        {/* Live In-Stock */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In-Stock Rackets</span>
            <Package className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {summary?.totalUnitsInStock || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {metrics?.inventoryLevels.length || 0} active SKU models
          </div>
        </div>

        {/* Return Rate */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Return Rate</span>
            <RotateCcw className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {summary?.returnRate || 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary?.totalUnitsReturned || 0} units restocked & relabeled
          </div>
        </div>
      </div>

      {/* Revenue Charts */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 text-white shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold">Revenue Velocity & Volume</h3>
            <p className="text-xs text-slate-400">Track dispatch income over time</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setChartView('weekly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'weekly' ? 'bg-lime-400 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Weekly (7 Days)
            </button>
            <button
              onClick={() => setChartView('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'monthly' ? 'bg-lime-400 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Monthly (6 Mos)
            </button>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-56 flex items-end gap-3 pt-6 border-b border-slate-800 pb-2">
          {activeChartData?.map((item: any, idx: number) => {
            const heightPercent = maxRevenue > 0 ? Math.max(8, (item.revenue / maxRevenue) * 100) : 8;
            const label = chartView === 'weekly' ? item.displayDate.split(',')[0] : item.month;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                {/* Tooltip */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-slate-700 text-[11px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-xl">
                  <div className="font-bold text-lime-400">₹{item.revenue.toLocaleString('en-IN')}</div>
                  <div className="text-slate-300">{item.units} rackets sold</div>
                </div>

                <div className="w-full flex justify-center h-44 items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-emerald-600 to-lime-400 group-hover:from-emerald-500 group-hover:to-lime-300 transition-all shadow-lg"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-full">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SKU Management Section */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 text-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">SKU Inventory & Price Management</h3>
            <p className="text-xs text-slate-400">Live in-stock racket units and preset selling costs</p>
          </div>
          <button
            onClick={() => setIsAcquisitionOpen(true)}
            className="flex items-center gap-1.5 text-xs text-lime-400 font-semibold hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Inbound Stock
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">SKU ID</th>
                <th className="py-3 px-3">Model Name</th>
                <th className="py-3 px-3">Preset Cost (MSRP)</th>
                <th className="py-3 px-3">Live Stock</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {metrics?.inventoryLevels.map((sku) => (
                <tr key={sku.sku_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-lime-400">{sku.sku_id}</td>
                  <td className="py-3 px-3 font-medium text-white">{sku.name}</td>
                  <td className="py-3 px-3">
                    {editingSkuId === sku.sku_id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">₹</span>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-20 rounded bg-slate-800 border border-slate-600 px-1.5 py-0.5 text-xs text-white"
                        />
                      </div>
                    ) : (
                      <span className="text-white font-semibold">₹{sku.preset_selling_cost.toLocaleString('en-IN')}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        sku.in_stock_count > 5
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : sku.in_stock_count > 0
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {sku.in_stock_count} units in-stock
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {editingSkuId === sku.sku_id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSaveSkuPrice(sku.sku_id)}
                          disabled={isSavingSku}
                          className="p-1 rounded bg-lime-400 text-slate-950 hover:bg-lime-300"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingSkuId(null)}
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingSkuId(sku.sku_id);
                          setEditPrice(sku.preset_selling_cost);
                        }}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 ml-auto"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CEO Historical Orders Intelligence Ledger */}
      <AdminOrdersHistoryView ceoPin={ceoPin} />

      {/* Inbound Acquisition Modal */}
      <AdminAcquisitionModal
        isOpen={isAcquisitionOpen}
        onClose={() => setIsAcquisitionOpen(false)}
        onSuccess={fetchMetrics}
        existingSkus={metrics?.inventoryLevels || []}
        ceoPin={ceoPin}
      />
    </div>
  );
};
