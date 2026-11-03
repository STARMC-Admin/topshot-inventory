import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Item } from '@/models/Item';
import { SKU } from '@/models/SKU';
import { Order } from '@/models/Order';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get('barcode');

    if (!barcode) {
      return NextResponse.json(
        { success: false, error: 'barcode parameter is required' },
        { status: 400 }
      );
    }

    const cleanBarcode = barcode.trim();

    // Look up item by barcode value or pickle_racket_id
    const item = await Item.findOne({
      $or: [{ barcode_value: cleanBarcode }, { pickle_racket_id: cleanBarcode }],
    }).lean();

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: `Barcode "${cleanBarcode}" not recognized in Topshot inventory. Verify sticker or acquire SKU first.`,
        },
        { status: 404 }
      );
    }

    // Look up associated SKU
    const sku = await SKU.findOne({ sku_id: item.sku_id }).lean();

    // If item is already sold, fetch the order context
    if (item.status === 'Sold') {
      const existingOrder = await Order.findOne({ pickle_racket_id: item.pickle_racket_id }).lean();
      return NextResponse.json(
        {
          success: false,
          error: `This racket is already SOLD on Order #${existingOrder?.order_id || 'N/A'}. Cannot dispatch duplicate order.`,
          data: {
            item,
            sku,
            existingOrder,
          },
        },
        { status: 409 }
      );
    }

    if (item.status === 'Returned') {
      return NextResponse.json(
        {
          success: false,
          error: `This racket is marked as RETURNED. Use the Return flow to issue a fresh barcode sticker before re-dispatching.`,
          data: { item, sku },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        pickle_racket_id: item.pickle_racket_id,
        barcode_value: item.barcode_value,
        sku_id: item.sku_id,
        sku_name: sku?.name || item.sku_id,
        preset_selling_cost: sku?.preset_selling_cost || 0,
        status: item.status,
        weight_grams: sku?.weight_grams || 230,
      },
    });
  } catch (error: any) {
    console.error('Scan lookup error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error looking up barcode' },
      { status: 500 }
    );
  }
}
