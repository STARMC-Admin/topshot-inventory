'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Package,
  RotateCcw,
  ShieldAlert,
  Truck,
  CheckCircle2,
  ChevronDown,
  Tag,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export type TimeRangeOption = 'past_week' | 'past_month' | 'selected_month' | 'all';

interface FilteredOrderData {
  filter: {
    range: string;
    periodLabel: string;
    startDate: string | null;
    endDate: string | null;
    selectedYear: number;
    selectedMonth: number;
  };
  summary: {
    totalOrders: number;
    unitsSold: number;
    unitsReturned: number;
    grossRevenue: number;
    totalShipping: number;
    netRevenue: number;
    avgOrderValue: number;
    returnRate: number;
    adminOverridesCount: number;
  };
  orders: Array<{
    _id: string;
    order_id: string;
    pickle_racket_id: string;
    barcode_value: string;
    sku_id: string;
    items?: Array<{
      pickle_racket_id: string;
      barcode_value: string;
      sku_id: string;
      sku_name?: string;
      preset_selling_cost: number;
    }>;
    total_units?: number;
    delivery_id: string;
    preset_selling_cost: number;
    discount_percentage: number;
    admin_override: boolean;
    admin_override_by?: string;
    final_selling_price: number;
    shipping_cost: number;
    buyer_name: string;
    buyer_address: string;
    status: 'Dispatched' | 'Delivered' | 'Returned' | 'Cancelled';
    created_at: string;
  }>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface AdminOrdersHistoryViewProps {
  ceoPin?: string;
}

export const AdminOrdersHistoryView: React.FC<AdminOrdersHistoryViewProps> = ({ ceoPin = '' }) => {
  const currentDate = useMemo(() => new Date(), []);
  const [range, setRange] = useState<TimeRangeOption>('past_week');
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [data, setData] = useState<FilteredOrderData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Years options for selector (past 3 years up to current)
  const yearOptions = useMemo(() => {
    const currYear = currentDate.getFullYear();
    return [currYear, currYear - 1, currYear - 2];
  }, [currentDate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('range', range);
      if (range === 'selected_month') {
        params.set('year', selectedYear.toString());
        params.set('month', selectedMonth.toString());
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: {
          'x-admin-pin': ceoPin,
        },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching filtered orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [range, selectedYear, selectedMonth, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set('format', format);
      params.set('range', range);
      if (range === 'selected_month') {
        params.set('year', selectedYear.toString());
        params.set('month', selectedMonth.toString());
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/export?${params.toString()}`, {
        headers: {
          'x-admin-pin': ceoPin,
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topshot_orders_${range}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export orders:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const summary = data?.summary;
  const orders = data?.orders || [];

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm text-white space-y-5">
      {/* Header and Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Clock className="h-3.5 w-3.5" /> Order Intelligence Ledger
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {data?.filter?.periodLabel || 'Fetching orders...'}
            </span>
          </div>
          <h3 className="text-xl font-bold mt-1.5">Historical Order Audit & Details</h3>
          <p className="text-xs text-slate-400">
            Audit customer dispatches, Delhivery tracking, discount authorizations, and returns.
          </p>
        </div>

        {/* Filter Tabs: Past Week, Past Month, Selected Month, All Time */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setRange('past_week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === 'past_week'
                ? 'bg-lime-400 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Past Week (7D)</span>
          </button>

          <button
            onClick={() => setRange('past_month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === 'past_month'
                ? 'bg-lime-400 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Past Month (30D)</span>
          </button>

          <button
            onClick={() => setRange('selected_month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === 'selected_month'
                ? 'bg-lime-400 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Selected Month</span>
          </button>

          <button
            onClick={() => setRange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === 'all'
                ? 'bg-lime-400 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Selected Month Custom Picker Bar (Visible when range === 'selected_month') */}
      {range === 'selected_month' && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-lime-500/30 text-xs">
          <span className="font-semibold text-lime-400 flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Choose Month & Year:
          </span>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-lime-400"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-lime-400"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-400 text-[11px] ml-auto">
            Viewing records from {MONTH_NAMES[selectedMonth - 1]} 1, {selectedYear} to month end.
          </span>
        </div>
      )}

      {/* Period Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Orders
            </span>
            <span className="text-lg font-extrabold text-white">{summary.totalOrders}</span>
            <span className="text-[10px] text-slate-500 block">in selected period</span>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Period Gross
            </span>
            <span className="text-lg font-extrabold text-lime-400">
              ₹{summary.grossRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 block">{summary.unitsSold} units dispatched</span>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Net Realized
            </span>
            <span className="text-lg font-extrabold text-emerald-400">
              ₹{summary.netRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 block">post ₹{summary.totalShipping} shipping</span>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Avg Order Value
            </span>
            <span className="text-lg font-extrabold text-sky-400">
              ₹{summary.avgOrderValue.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 block">per sold racket</span>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Return Rate
            </span>
            <span className="text-lg font-extrabold text-rose-400">
              {summary.returnRate}%
            </span>
            <span className="text-[10px] text-slate-500 block">{summary.unitsReturned} returned</span>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              PIN Overrides
            </span>
            <span className="text-lg font-extrabold text-amber-400">
              {summary.adminOverridesCount}
            </span>
            <span className="text-[10px] text-slate-500 block">discounts &gt; 20%</span>
          </div>
        </div>
      )}

      {/* Search, Status Filtering, and Export Actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Order ID, Buyer, Delhivery ID, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-lime-400"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              <option value="Dispatched" className="bg-slate-900">Dispatched</option>
              <option value="Delivered" className="bg-slate-900">Delivered</option>
              <option value="Returned" className="bg-slate-900">Returned</option>
            </select>
          </div>

          <button
            onClick={fetchOrders}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-lime-400' : ''}`} />
          </button>

          {/* Export Filtered Orders */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting || orders.length === 0}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
              title="Download CSV for this filtered view"
            >
              <Download className="h-3 w-3 text-lime-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={isExporting || orders.length === 0}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
              title="Download Excel for this filtered view"
            >
              <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-slate-950">
              <th className="py-3 px-3">Order ID & Date</th>
              <th className="py-3 px-3">Racket (SKU & Barcode)</th>
              <th className="py-3 px-3">Delhivery Waybill</th>
              <th className="py-3 px-3">Buyer Details</th>
              <th className="py-3 px-3">Selling Price</th>
              <th className="py-3 px-3">Shipping</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading && orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin text-lime-400 mx-auto mb-2" />
                  <span>Loading order records for {data?.filter?.periodLabel || range}...</span>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <Package className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-sm text-slate-300">No orders found for this time period</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try switching filters (e.g. "All Time") or adjusting the search term.
                  </p>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const isExpanded = expandedOrderId === order.order_id;
                const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <React.Fragment key={order._id}>
                    <tr
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isExpanded ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      {/* Order ID & Date */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-lime-400">{order.order_id}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{formattedDate}</div>
                      </td>

                      {/* SKU & Barcode */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white">{order.sku_id}</span>
                          {order.items && order.items.length > 1 && (
                            <span className="text-[10px] bg-lime-400/20 text-lime-400 font-bold px-1.5 py-0.5 rounded border border-lime-400/30 whitespace-nowrap">
                              {order.items.length} Units
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 truncate max-w-[150px]">
                          {order.barcode_value}
                        </div>
                      </td>

                      {/* Delhivery Tracking ID */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
                          <Truck className="h-3.5 w-3.5 text-lime-400 flex-shrink-0" />
                          <span>{order.delivery_id}</span>
                        </div>
                      </td>

                      {/* Buyer Details */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-white">{order.buyer_name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {order.buyer_address}
                        </div>
                      </td>

                      {/* Price & Discounts */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-sm">
                          ₹{order.final_selling_price.toLocaleString('en-IN')}
                        </div>
                        {order.discount_percentage > 0 ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-rose-400">-{order.discount_percentage}%</span>
                            {order.admin_override && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30 font-bold">
                                PIN OK
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">MSRP</span>
                        )}
                      </td>

                      {/* Shipping Cost */}
                      <td className="py-3 px-3">
                        <span className="text-slate-300 font-mono">₹{order.shipping_cost}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'Dispatched'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : order.status === 'Delivered'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {order.status === 'Dispatched' && <Truck className="h-3 w-3" />}
                          {order.status === 'Delivered' && <CheckCircle2 className="h-3 w-3" />}
                          {order.status === 'Returned' && <RotateCcw className="h-3 w-3" />}
                          {order.status}
                        </span>
                      </td>

                      {/* Expand / Details Toggle */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.order_id)}
                          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800"
                        >
                          {isExpanded ? 'Less' : 'Details'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={8} className="p-4 border-t border-b border-slate-800">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                            <div>
                              <span className="text-slate-400 block font-semibold mb-1">
                                Physical Item Audit ({order.items && order.items.length > 0 ? `${order.items.length} Rackets` : '1 Racket'})
                              </span>
                              {order.items && order.items.length > 0 ? (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="bg-slate-950/60 p-1.5 rounded border border-slate-800 text-[11px]">
                                      <div className="font-semibold text-white truncate">{item.sku_name || item.sku_id}</div>
                                      <div className="font-mono text-lime-400">{item.barcode_value}</div>
                                      <div className="text-[10px] text-slate-500 font-mono truncate">UUID: {item.pickle_racket_id}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  <div className="font-mono text-slate-300 text-[11px]">
                                    UUID: <span className="text-white">{order.pickle_racket_id}</span>
                                  </div>
                                  <div className="font-mono text-slate-300 text-[11px] mt-0.5">
                                    Barcode: <span className="text-lime-400">{order.barcode_value}</span>
                                  </div>
                                  <div className="text-slate-400 text-[11px] mt-0.5">
                                    Preset Cost: ₹{order.preset_selling_cost}
                                  </div>
                                </>
                              )}
                            </div>

                            <div>
                              <span className="text-slate-400 block font-semibold mb-1">Delhivery Destination</span>
                              <div className="text-slate-200 text-[11px]">{order.buyer_address}</div>
                              <div className="text-slate-400 text-[11px] mt-1 font-mono">
                                Tracking AWB: {order.delivery_id}
                              </div>
                            </div>

                            <div>
                              <span className="text-slate-400 block font-semibold mb-1">Financial Reconciliation</span>
                              <div className="flex justify-between text-slate-300 text-[11px]">
                                <span>Charged to Buyer:</span>
                                <span className="font-bold text-white">₹{order.final_selling_price}</span>
                              </div>
                              <div className="flex justify-between text-slate-400 text-[11px]">
                                <span>Delhivery Logistics Cost:</span>
                                <span>- ₹{order.shipping_cost}</span>
                              </div>
                              <div className="flex justify-between text-emerald-400 font-bold text-[11px] pt-1 border-t border-slate-800">
                                <span>Net Realized Revenue:</span>
                                <span>₹{(order.final_selling_price || 0) - (order.shipping_cost || 0)}</span>
                              </div>
                              {order.admin_override && (
                                <div className="mt-1 text-[10px] text-amber-400 flex items-center gap-1">
                                  <ShieldAlert className="h-3 w-3" />
                                  <span>Authorized by CEO Override PIN (Discount: {order.discount_percentage}%)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
