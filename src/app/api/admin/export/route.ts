import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Order } from '@/models/Order';
import * as XLSX from 'xlsx';
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
    const format = searchParams.get('format') || 'csv'; // 'csv' or 'xlsx'
    const range = searchParams.get('range'); // 'past_week' | 'past_month' | 'selected_month' | 'all'
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const status = searchParams.get('status');
    const searchQuery = searchParams.get('q')?.trim();

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let fileSuffix = 'all';

    if (range === 'past_week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      fileSuffix = 'past_week';
    } else if (range === 'past_month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      fileSuffix = 'past_month';
    } else if (range === 'selected_month') {
      const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
      const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      fileSuffix = `${year}_${month < 10 ? '0' + month : month}`;
    }

    const filter: any = {};
    if (startDate && endDate) {
      filter.created_at = { $gte: startDate, $lte: endDate };
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
        { 'items.barcode_value': { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const orders = await Order.find(filter).sort({ created_at: -1 }).lean();

    // Map exact fields for executive spreadsheet
    const exportRows = orders.map((o) => {
      const hasItems = o.items && o.items.length > 0;
      const unitsCount = hasItems ? o.items.length : o.total_units || 1;
      const racketIds = hasItems ? o.items.map((i: any) => i.pickle_racket_id).join('; ') : o.pickle_racket_id;
      const barcodes = hasItems ? o.items.map((i: any) => i.barcode_value).join('; ') : o.barcode_value;
      const skuIds = hasItems ? o.items.map((i: any) => i.sku_id).join('; ') : o.sku_id;
      const itemDescriptions = hasItems
        ? o.items.map((i: any) => `${i.sku_name || i.sku_id} [${i.barcode_value}]`).join(' | ')
        : o.sku_id;

      return {
        'Order ID': o.order_id,
        'Units (Rackets)': unitsCount,
        'Delhivery Tracking ID': o.delivery_id,
        'Items Detail': itemDescriptions,
        'SKU ID(s)': skuIds,
        'Barcode(s)': barcodes,
        'Pickle Racket ID (UUIDs)': racketIds,
        'Preset Cost (₹)': o.preset_selling_cost,
        'Discount Applied (%)': o.discount_percentage,
        'Admin Override (>20%)': o.admin_override ? 'YES' : 'NO',
        'Final Selling Price (₹)': o.final_selling_price,
        'Shipping Cost (₹)': o.shipping_cost,
        'Net Realized (₹)': (o.final_selling_price || 0) - (o.shipping_cost || 0),
        'Buyer Name': o.buyer_name,
        'Buyer Address': o.buyer_address,
        'Status': o.status,
        'Date': new Date(o.created_at).toISOString().replace('T', ' ').slice(0, 19),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Topshot Orders');

    const fileName = `topshot_orders_${fileSuffix}_${Date.now()}`;

    if (format === 'xlsx') {
      const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="${fileName}.xlsx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    }

    // Default CSV
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}.csv"`,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Error generating orders export:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export orders' },
      { status: 500 }
    );
  }
}
