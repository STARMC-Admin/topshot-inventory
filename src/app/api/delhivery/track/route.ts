import { NextResponse } from 'next/server';
import { fetchDelhiveryDetails } from '@/lib/delhivery';
import { connectToDatabase } from '@/lib/mongodb';
import { Order } from '@/models/Order';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deliveryId = searchParams.get('delivery_id');

    if (!deliveryId) {
      return NextResponse.json(
        { success: false, error: 'delivery_id query parameter is required' },
        { status: 400 }
      );
    }

    const cleanDeliveryId = deliveryId.trim().toUpperCase();

    // Check if this delivery_id has already been mapped to an existing order in Topshot!
    await connectToDatabase();
    const existingOrder = await Order.findOne({ delivery_id: cleanDeliveryId }).lean();
    if (existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: `Tracking Number "${cleanDeliveryId}" is ALREADY assigned to Order #${existingOrder.order_id} (Status: ${existingOrder.status}). Duplicate shipment tracking numbers are not allowed.`,
          existingOrder,
        },
        { status: 409 }
      );
    }

    // Call Delhivery live/mock integration
    const details = await fetchDelhiveryDetails(cleanDeliveryId);

    return NextResponse.json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    console.error('Delhivery track error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Delhivery details' },
      { status: 500 }
    );
  }
}
