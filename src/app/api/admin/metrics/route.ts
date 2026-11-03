import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Order } from '@/models/Order';
import { Item } from '@/models/Item';
import { SKU } from '@/models/SKU';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    // 0. Verify Executive CEO Authorization
    const auth = verifyAdminAuth(req);
    if (!auth.isAuthorized) {
      return auth.response;
    }

    await connectToDatabase();

    // 1. Overall Order Aggregations
    const allOrders = await Order.find({}).sort({ created_at: -1 }).lean();
    const activeOrders = allOrders.filter((o) => o.status !== 'Cancelled');
    const soldOrders = allOrders.filter((o) => o.status === 'Dispatched' || o.status === 'Delivered');
    const returnedOrders = allOrders.filter((o) => o.status === 'Returned');

    // Multi-unit aware counts
    const totalUnitsSold = soldOrders.reduce(
      (acc, o) => acc + (o.items?.length || o.total_units || 1),
      0
    );
    const totalUnitsReturned = returnedOrders.reduce(
      (acc, o) => acc + (o.items?.length || o.total_units || 1),
      0
    );
    const grossRevenue = soldOrders.reduce((acc, o) => acc + (o.final_selling_price || 0), 0);
    const totalShippingCost = soldOrders.reduce((acc, o) => acc + (o.shipping_cost || 0), 0);
    const netRevenue = grossRevenue - totalShippingCost;

    const returnRate =
      allOrders.length > 0
        ? Number(((returnedOrders.length / allOrders.length) * 100).toFixed(1))
        : 0;

    // 2. Inventory breakdown per SKU
    const skus = await SKU.find({}).lean();
    const liveStockAgg = await Item.aggregate([
      { $match: { status: 'In-Stock' } },
      { $group: { _id: '$sku_id', count: { $sum: 1 } } },
    ]);
    const stockMap = new Map(liveStockAgg.map((s) => [s._id, s.count]));

    const inventoryLevels = skus.map((s) => ({
      sku_id: s.sku_id,
      name: s.name,
      preset_selling_cost: s.preset_selling_cost,
      in_stock_count: stockMap.get(s.sku_id) ?? 0,
    }));

    const totalUnitsInStock = inventoryLevels.reduce((acc, s) => acc + s.in_stock_count, 0);

    // 3. Weekly Revenue (Last 7 days, day-by-day)
    const now = new Date();
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const weeklyDataMap: Record<string, { revenue: number; units: number }> = {};
    past7Days.forEach((dateStr) => {
      weeklyDataMap[dateStr] = { revenue: 0, units: 0 };
    });

    // 4. Monthly Revenue (Last 6 months)
    const monthlyDataMap: Record<string, { revenue: number; units: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyDataMap[monthKey] = { revenue: 0, units: 0 };
    }

    soldOrders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const dayStr = orderDate.toISOString().split('T')[0];
      const unitsInOrder = order.items?.length || order.total_units || 1;

      if (weeklyDataMap[dayStr]) {
        weeklyDataMap[dayStr].revenue += order.final_selling_price || 0;
        weeklyDataMap[dayStr].units += unitsInOrder;
      }

      const monthKey = orderDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (monthlyDataMap[monthKey]) {
        monthlyDataMap[monthKey].revenue += order.final_selling_price || 0;
        monthlyDataMap[monthKey].units += unitsInOrder;
      }
    });

    const weeklyChart = past7Days.map((dateStr) => ({
      date: dateStr,
      displayDate: new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      revenue: weeklyDataMap[dateStr].revenue,
      units: weeklyDataMap[dateStr].units,
    }));

    const monthlyChart = Object.keys(monthlyDataMap).map((monthKey) => ({
      month: monthKey,
      revenue: monthlyDataMap[monthKey].revenue,
      units: monthlyDataMap[monthKey].units,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          grossRevenue,
          netRevenue,
          totalShippingCost,
          totalUnitsSold,
          totalUnitsReturned,
          totalUnitsInStock,
          returnRate,
          totalOrdersCount: allOrders.length,
          discountOverridesCount: allOrders.filter((o) => o.admin_override).length,
        },
        inventoryLevels,
        weeklyChart,
        monthlyChart,
        recentOrders: allOrders.slice(0, 10),
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin metrics:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
