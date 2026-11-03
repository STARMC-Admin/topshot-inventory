import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SKU } from '@/models/SKU';
import { Item } from '@/models/Item';
import { generateInboundBatch } from '@/lib/barcodeGenerator';
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const auth = verifyAdminAuth(req);
    if (!auth.isAuthorized) {
      return auth.response;
    }

    await connectToDatabase();
    const body = await req.json();
    const { sku_id, name, preset_selling_cost, quantity } = body;

    const parsedQty = parseInt(quantity, 10);
    if (!parsedQty || parsedQty <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a positive integer' },
        { status: 400 }
      );
    }

    if (parsedQty > 500) {
      return NextResponse.json(
        { success: false, error: 'Maximum batch acquisition size is 500 units' },
        { status: 400 }
      );
    }

    if (!sku_id) {
      return NextResponse.json(
        { success: false, error: 'sku_id is required' },
        { status: 400 }
      );
    }

    const cleanSkuId = sku_id.trim().toUpperCase();

    // Find or create SKU if details provided
    let sku = await SKU.findOne({ sku_id: cleanSkuId });
    if (!sku) {
      if (!name || preset_selling_cost === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: `SKU "${cleanSkuId}" not found. Please provide name and preset_selling_cost to create it.`,
          },
          { status: 404 }
        );
      }

      sku = await SKU.create({
        sku_id: cleanSkuId,
        name: name.trim(),
        preset_selling_cost: Number(preset_selling_cost),
        total_quantity: 0,
      });
    }

    // Generate unique barcodes & UUIDs
    const { batchId, items } = generateInboundBatch(cleanSkuId, parsedQty);

    // Bulk insert items into MongoDB
    const insertedItems = await Item.insertMany(items);

    // Atomically increment SKU total_quantity
    await SKU.findOneAndUpdate(
      { sku_id: cleanSkuId },
      { $inc: { total_quantity: parsedQty } }
    );

    // Prepare label dataset for PDF printing
    const labelData = insertedItems.map((item) => ({
      pickle_racket_id: item.pickle_racket_id,
      barcode_value: item.barcode_value,
      sku_id: sku!.sku_id,
      sku_name: sku!.name,
      price: sku!.preset_selling_cost,
    }));

    return NextResponse.json(
      {
        success: true,
        message: `Successfully acquired ${parsedQty} units of ${sku.name}`,
        data: {
          batch_id: batchId,
          sku_id: sku.sku_id,
          sku_name: sku.name,
          preset_selling_cost: sku.preset_selling_cost,
          quantity_acquired: parsedQty,
          items: labelData,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error during inventory acquisition:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to acquire inventory' },
      { status: 500 }
    );
  }
}
