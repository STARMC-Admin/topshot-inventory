import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SKU } from '@/models/SKU';
import { Item } from '@/models/Item';
import { verifyAdminAuth } from '@/lib/auth';

// GET /api/skus - List all SKUs with live stock counts
export async function GET() {
  try {
    await connectToDatabase();

    const skus = await SKU.find({}).sort({ created_at: -1 }).lean();

    // Recompute actual In-Stock count from Item collection to ensure 100% sync
    const liveCounts = await Item.aggregate([
      { $match: { status: 'In-Stock' } },
      { $group: { _id: '$sku_id', inStockCount: { $sum: 1 } } },
    ]);

    const countMap = new Map(liveCounts.map((c) => [c._id, c.inStockCount]));

    const enrichedSkus = skus.map((sku) => ({
      ...sku,
      total_quantity: countMap.get(sku.sku_id) ?? sku.total_quantity,
    }));

    return NextResponse.json({ success: true, data: enrichedSkus });
  } catch (error: any) {
    console.error('Error fetching SKUs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch SKUs' },
      { status: 500 }
    );
  }
}

// POST /api/skus - Create new SKU or update existing
export async function POST(req: Request) {
  try {
    const auth = verifyAdminAuth(req);
    if (!auth.isAuthorized) {
      return auth.response;
    }

    await connectToDatabase();
    const body = await req.json();
    const { sku_id, name, preset_selling_cost, category, weight_grams } = body;

    if (!sku_id || !name || preset_selling_cost === undefined) {
      return NextResponse.json(
        { success: false, error: 'sku_id, name, and preset_selling_cost are required' },
        { status: 400 }
      );
    }

    const cleanSkuId = sku_id.trim().toUpperCase();

    const existingSku = await SKU.findOne({ sku_id: cleanSkuId });
    if (existingSku) {
      return NextResponse.json(
        { success: false, error: `SKU with ID "${cleanSkuId}" already exists.` },
        { status: 409 }
      );
    }

    const newSku = await SKU.create({
      sku_id: cleanSkuId,
      name: name.trim(),
      preset_selling_cost: Number(preset_selling_cost),
      total_quantity: 0,
      category: category || 'Pickleball Racket',
      weight_grams: weight_grams ? Number(weight_grams) : 230,
    });

    return NextResponse.json({ success: true, data: newSku }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating SKU:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create SKU' },
      { status: 500 }
    );
  }
}

// PUT /api/skus - Edit SKU details
export async function PUT(req: Request) {
  try {
    const auth = verifyAdminAuth(req);
    if (!auth.isAuthorized) {
      return auth.response;
    }

    await connectToDatabase();
    const body = await req.json();
    const { sku_id, name, preset_selling_cost } = body;

    if (!sku_id) {
      return NextResponse.json({ success: false, error: 'sku_id is required' }, { status: 400 });
    }

    const updated = await SKU.findOneAndUpdate(
      { sku_id: sku_id.trim().toUpperCase() },
      {
        ...(name && { name: name.trim() }),
        ...(preset_selling_cost !== undefined && { preset_selling_cost: Number(preset_selling_cost) }),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'SKU not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update SKU' },
      { status: 500 }
    );
  }
}
