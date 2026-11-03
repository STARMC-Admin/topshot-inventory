import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Order } from '@/models/Order';
import { Item } from '@/models/Item';
import { SKU } from '@/models/SKU';
import { v4 as uuidv4 } from 'uuid';
import { generateBarcodeValue } from '@/lib/barcodeGenerator';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { identifier, return_reason = 'Customer Return / Damaged Sticker' } = body;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'order_id or delivery_id is required to process return' },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();

    // 1. Find the order by order_id, delivery_id, barcode_value, or item barcode/uuid
    const order = await Order.findOne({
      $or: [
        { order_id: cleanIdentifier },
        { delivery_id: cleanIdentifier.toUpperCase() },
        { barcode_value: cleanIdentifier },
        { pickle_racket_id: cleanIdentifier },
        { 'items.barcode_value': cleanIdentifier },
        { 'items.pickle_racket_id': cleanIdentifier },
      ],
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: `No existing order found matching identifier "${cleanIdentifier}". Please check the tracking or order slip.`,
        },
        { status: 404 }
      );
    }

    if (order.status === 'Returned') {
      return NextResponse.json(
        {
          success: false,
          error: `Order #${order.order_id} has ALREADY been processed as returned.`,
          order,
        },
        { status: 400 }
      );
    }

    // 2. Mark the order as 'Returned'
    order.status = 'Returned';
    await order.save();

    // 3. Collect all items associated with this order
    let itemsToProcess: Array<{
      pickle_racket_id: string;
      barcode_value: string;
      sku_id: string;
      sku_name?: string;
      preset_selling_cost: number;
    }> = [];

    if (order.items && order.items.length > 0) {
      itemsToProcess = order.items;
    } else {
      // Query items collection by order_id
      const linkedItems = await Item.find({ order_id: order.order_id }).lean();
      if (linkedItems && linkedItems.length > 0) {
        itemsToProcess = linkedItems.map((it) => ({
          pickle_racket_id: it.pickle_racket_id,
          barcode_value: it.barcode_value,
          sku_id: it.sku_id,
          preset_selling_cost: order.preset_selling_cost,
        }));
      } else {
        itemsToProcess = [
          {
            pickle_racket_id: order.pickle_racket_id,
            barcode_value: order.barcode_value,
            sku_id: order.sku_id,
            preset_selling_cost: order.preset_selling_cost,
          },
        ];
      }
    }

    const restockedItems = [];
    const labelsToPrint = [];

    // 4. For each item in the order, decommission original and issue fresh restock record
    for (const itemRef of itemsToProcess) {
      // Mark original physical item record as Returned
      const originalItem = await Item.findOne({
        $or: [{ pickle_racket_id: itemRef.pickle_racket_id }, { barcode_value: itemRef.barcode_value }],
      });

      if (originalItem) {
        originalItem.status = 'Returned';
        originalItem.history.push({
          action: 'RETURNED',
          timestamp: new Date(),
          note: `Order ${order.order_id} marked returned (${return_reason}). Original physical sticker decommissioned.`,
        });
        await originalItem.save();
      }

      // Generate brand new unique UUID and unique barcode
      const newRacketId = uuidv4();
      const newBarcodeValue = generateBarcodeValue(itemRef.sku_id);

      const newItem = await Item.create({
        pickle_racket_id: newRacketId,
        sku_id: itemRef.sku_id,
        barcode_value: newBarcodeValue,
        status: 'In-Stock',
        history: [
          {
            action: 'RELABELED',
            timestamp: new Date(),
            note: `Restocked and re-labeled from returned order ${order.order_id}. Original racket ID: ${itemRef.pickle_racket_id}`,
            previous_barcode: itemRef.barcode_value,
          },
        ],
      });

      // Update SKU in-stock inventory count (+1)
      const sku = await SKU.findOneAndUpdate(
        { sku_id: itemRef.sku_id },
        { $inc: { total_quantity: 1 } },
        { new: true }
      );

      const labelData = {
        pickle_racket_id: newItem.pickle_racket_id,
        barcode_value: newItem.barcode_value,
        sku_id: itemRef.sku_id,
        sku_name: sku?.name || itemRef.sku_name || itemRef.sku_id,
        price: sku?.preset_selling_cost || itemRef.preset_selling_cost,
      };

      restockedItems.push({
        new_pickle_racket_id: newItem.pickle_racket_id,
        new_barcode_value: newItem.barcode_value,
        sku_id: newItem.sku_id,
        sku_name: sku?.name || itemRef.sku_id,
        current_sku_stock: sku?.total_quantity,
      });

      labelsToPrint.push(labelData);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Return processed successfully for Order #${order.order_id}. ${
          restockedItems.length
        } fresh barcode${
          restockedItems.length > 1 ? 's' : ''
        } generated for physical racket re-stocking.`,
        data: {
          returned_order: {
            order_id: order.order_id,
            delivery_id: order.delivery_id,
            buyer_name: order.buyer_name,
            total_units: itemsToProcess.length,
            status: order.status,
          },
          restocked_items: restockedItems,
          labels_to_print: labelsToPrint,
          label_to_print: labelsToPrint[0], // Backwards compatibility for single label
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing return:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process return' },
      { status: 500 }
    );
  }
}
