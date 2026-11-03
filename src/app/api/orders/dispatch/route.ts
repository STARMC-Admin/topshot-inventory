import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Item } from '@/models/Item';
import { SKU } from '@/models/SKU';
import { Order, IOrderItem } from '@/models/Order';
import { fetchDelhiveryDetails } from '@/lib/delhivery';

const ADMIN_PIN = process.env.ADMIN_PIN || '9876';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      barcode_value,
      barcode_values,
      delivery_id,
      discount_percentage = 0,
      admin_pin,
    } = body;

    // Support both barcode_values (multi-racket array) and barcode_value (single string)
    let rawBarcodes: string[] = [];
    if (Array.isArray(barcode_values) && barcode_values.length > 0) {
      rawBarcodes = barcode_values;
    } else if (typeof barcode_value === 'string' && barcode_value.trim()) {
      rawBarcodes = [barcode_value.trim()];
    }

    if (rawBarcodes.length === 0 || !delivery_id) {
      return NextResponse.json(
        { success: false, error: 'At least one barcode and a delivery_id are required to dispatch.' },
        { status: 400 }
      );
    }

    const cleanBarcodes = rawBarcodes.map((b) => String(b).trim()).filter(Boolean);
    const cleanDeliveryId = delivery_id.trim().toUpperCase();
    const discount = Number(discount_percentage) || 0;

    // Check for duplicate barcodes in the same submission
    const uniqueBarcodes = new Set(cleanBarcodes);
    if (uniqueBarcodes.size !== cleanBarcodes.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate barcode detected in the dispatch list. Each physical racket can only be added once.',
        },
        { status: 400 }
      );
    }

    // 1. HARD RULE: DISCOUNT > 20% REQUIRES ADMIN PIN APPROVAL
    let adminOverride = false;
    let adminOverrideBy: string | undefined = undefined;

    if (discount > 20) {
      if (!admin_pin || admin_pin.trim() !== ADMIN_PIN) {
        return NextResponse.json(
          {
            success: false,
            error: `DISCOUNT_APPROVAL_REQUIRED: Applied discount of ${discount}% exceeds standard threshold (20%). CEO / Admin PIN is required to authorize this transaction.`,
            requiresAdminPin: true,
            maxAllowedDiscountWithoutPin: 20,
          },
          { status: 403 }
        );
      }
      adminOverride = true;
      adminOverrideBy = 'CEO_ADMIN_OVERRIDE_PIN';
    }

    // 2. ENFORCE 1:1 MAPPING FOR DELHIVERY TRACKING ID
    const duplicateDeliveryOrder = await Order.findOne({ delivery_id: cleanDeliveryId });
    if (duplicateDeliveryOrder) {
      return NextResponse.json(
        {
          success: false,
          error: `CONFLICT: Delhivery tracking number "${cleanDeliveryId}" is already mapped to existing Order #${duplicateDeliveryOrder.order_id}. Each order must have a unique tracking number.`,
        },
        { status: 409 }
      );
    }

    // 3. VALIDATE EACH RACKET IN INVENTORY AND FETCH CORRESPONDING SKUS
    const validatedItems: Array<{ item: any; sku: any }> = [];
    const skuCountMap = new Map<string, number>();

    for (const barcode of cleanBarcodes) {
      const item = await Item.findOne({ barcode_value: barcode });
      if (!item) {
        return NextResponse.json(
          { success: false, error: `Item with barcode "${barcode}" does not exist in inventory.` },
          { status: 404 }
        );
      }

      if (item.status === 'Sold') {
        const existingOrder = await Order.findOne({
          $or: [
            { order_id: item.order_id },
            { pickle_racket_id: item.pickle_racket_id },
            { 'items.pickle_racket_id': item.pickle_racket_id },
          ],
        });
        return NextResponse.json(
          {
            success: false,
            error: `CONFLICT: Physical racket "${barcode}" (${item.pickle_racket_id}) has already been sold on Order #${
              existingOrder?.order_id || item.order_id || 'UNKNOWN'
            }. Strict 1:1 mapping forbids duplicate dispatches.`,
          },
          { status: 409 }
        );
      }

      if (item.status === 'Returned') {
        return NextResponse.json(
          {
            success: false,
            error: `CONFLICT: Physical racket "${barcode}" is currently marked as Returned. Please re-label it via the Return workflow before dispatch.`,
          },
          { status: 400 }
        );
      }

      const sku = await SKU.findOne({ sku_id: item.sku_id });
      if (!sku) {
        return NextResponse.json(
          { success: false, error: `SKU "${item.sku_id}" definition not found for barcode "${barcode}".` },
          { status: 404 }
        );
      }

      validatedItems.push({ item, sku });
      skuCountMap.set(item.sku_id, (skuCountMap.get(item.sku_id) || 0) + 1);
    }

    // 4. COMPUTE PRICING ACROSS ALL RACKETS
    const totalPresetCost = validatedItems.reduce((sum, pair) => sum + pair.sku.preset_selling_cost, 0);
    const discountAmount = Math.round((totalPresetCost * discount) / 100);
    const finalSellingPrice = Math.max(0, totalPresetCost - discountAmount);

    // 5. FETCH DELHIVERY BUYER & SHIPPING DETAILS
    const delhiveryData = await fetchDelhiveryDetails(cleanDeliveryId);

    // 6. GENERATE UNIQUE ORDER ID
    const orderTimestamp = Date.now().toString(36).toUpperCase();
    const orderRandom = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `ORD-${orderTimestamp}-${orderRandom}`;

    // 7. PREPARE ORDER ITEMS
    const orderItems: IOrderItem[] = validatedItems.map(({ item, sku }) => ({
      pickle_racket_id: item.pickle_racket_id,
      barcode_value: item.barcode_value,
      sku_id: item.sku_id,
      sku_name: sku.name,
      preset_selling_cost: sku.preset_selling_cost,
    }));

    // Primary identifiers for legacy compatibility
    const primaryRacketId = orderItems.map((i) => i.pickle_racket_id).join(', ');
    const primaryBarcode = orderItems.map((i) => i.barcode_value).join(', ');
    const primarySkuId =
      orderItems.length === 1
        ? orderItems[0].sku_id
        : Array.from(new Set(orderItems.map((i) => i.sku_id))).join(', ');

    // 8. ATOMIC SAVE: CREATE ORDER
    const newOrder = await Order.create({
      order_id: orderId,
      items: orderItems,
      total_units: orderItems.length,
      pickle_racket_id: primaryRacketId,
      barcode_value: primaryBarcode,
      sku_id: primarySkuId,
      delivery_id: cleanDeliveryId,
      preset_selling_cost: totalPresetCost,
      discount_percentage: discount,
      admin_override: adminOverride,
      admin_override_by: adminOverrideBy,
      final_selling_price: finalSellingPrice,
      shipping_cost: delhiveryData.shipping_cost,
      buyer_name: delhiveryData.buyer_name,
      buyer_address: delhiveryData.buyer_address,
      status: 'Dispatched',
    });

    // 9. UPDATE EACH ITEM: MARK AS SOLD WITH ORDER HISTORY
    for (const { item } of validatedItems) {
      item.status = 'Sold';
      item.order_id = orderId;
      item.history.push({
        action: 'SOLD',
        timestamp: new Date(),
        note: `Dispatched to ${delhiveryData.buyer_name} on Order ${orderId} (${orderItems.length} unit package, Delhivery: ${cleanDeliveryId})`,
      });
      await item.save();
    }

    // 10. DECREMENT SKU TOTAL QUANTITIES
    const skuEntries = Array.from(skuCountMap.entries());
    for (let i = 0; i < skuEntries.length; i++) {
      const [skuId, count] = skuEntries[i];
      await SKU.findOneAndUpdate(
        { sku_id: skuId },
        { $inc: { total_quantity: -count } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Order #${orderId} with ${orderItems.length} racket${
          orderItems.length > 1 ? 's' : ''
        } successfully dispatched!`,
        data: {
          order: newOrder,
          rackets: orderItems,
          total_units: orderItems.length,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Order dispatch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch order' },
      { status: 500 }
    );
  }
}
