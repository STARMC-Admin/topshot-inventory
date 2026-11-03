import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Order } from '@/models/Order';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    // 0. Verify Executive CEO Authorization
    const auth = verifyAdminAuth(req);
    if (!auth.isAuthorized) {
      return auth.response;
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const range = searchParams.get('range') || 'past_week'; // 'past_week' | 'past_month' | 'selected_month' | 'all'
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month'); // 1-12
    const status = searchParams.get('status'); // 'Dispatched' | 'Delivered' | 'Returned' | 'all'
    const searchQuery = searchParams.get('q')?.trim();

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let periodLabel = 'Past Week (Last 7 Days)';

    if (range === 'past_week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      periodLabel = 'Past Week (Last 7 Days)';
    } else if (range === 'past_month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      periodLabel = 'Past Month (Last 30 Days)';
    } else if (range === 'selected_month') {
      const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
      const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1; // 1-indexed

      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const monthName = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      periodLabel = `Month: ${monthName}`;
    } else if (range === 'all') {
      periodLabel = 'All Time History';
    }

    // Build MongoDB query filter
    const filter: any = {};

    if (startDate && endDate) {
      filter.created_at = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (searchQuery) {
      filter.$or = [
        { order_id: { $regex: searchQuery, $options: 'i' } },
        { delivery_id: { $regex: searchQuery, $options: 'i' } },
        { buyer_name: { $regex: searchQuery, $options: 'i' } },
        { barcode_value: { $regex: searchQuery, $options: 'i' } },
        { sku_id: { $regex: searchQuery, $options: 'i' } },
        { buyer_address: { $regex: searchQuery, $options: 'i' } },
        { 'items.barcode_value': { $regex: searchQuery, $options: 'i' } },
        { 'items.pickle_racket_id': { $regex: searchQuery, $options: 'i' } },
        { 'items.sku_name': { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const orders = await Order.find(filter).sort({ created_at: -1 }).lean();

    // Compute period financial analytics
    const totalOrders = orders.length;
    const soldOrders = orders.filter((o) => o.status === 'Dispatched' || o.status === 'Delivered');
    const returnedOrders = orders.filter((o) => o.status === 'Returned');

    const unitsSold = soldOrders.reduce((sum, o) => sum + (o.items?.length || o.total_units || 1), 0);
    const unitsReturned = returnedOrders.reduce((sum, o) => sum + (o.items?.length || o.total_units || 1), 0);

    const grossRevenue = soldOrders.reduce((sum, o) => sum + (o.final_selling_price || 0), 0);
    const totalShipping = soldOrders.reduce((sum, o) => sum + (o.shipping_cost || 0), 0);
    const netRevenue = grossRevenue - totalShipping;
    const adminOverridesCount = orders.filter((o) => o.admin_override).length;
    const avgOrderValue = soldOrders.length > 0 ? Math.round(grossRevenue / soldOrders.length) : 0;
    const returnRate = totalOrders > 0 ? Number(((returnedOrders.length / totalOrders) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        filter: {
          range,
          periodLabel,
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null,
          selectedYear: yearParam ? parseInt(yearParam, 10) : now.getFullYear(),
          selectedMonth: monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1,
        },
        summary: {
          totalOrders,
          unitsSold,
          unitsReturned,
          grossRevenue,
          totalShipping,
          netRevenue,
          avgOrderValue,
          returnRate,
          adminOverridesCount,
        },
        orders,
      },
    });
  } catch (error: any) {
    console.error('Error fetching filtered orders for CEO portal:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
