/**
 * Seeds comprehensive historical sample orders spanning Today, Past Week, Past Month,
 * and previous months (Sep, Aug, Jul 2026).
 *
 * Maintains Topshot strict 1:1 physical racket mapping by creating corresponding
 * physical Items with complete history records.
 *
 * Run with: node scripts/seed_historical_orders.js
 * or: npm run seed:orders
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { sampleOrders } = require('./sample_orders_data');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/topshot_inventory';

const OrderSchema = new mongoose.Schema(
  {
    order_id: { type: String, required: true, unique: true },
    pickle_racket_id: { type: String, required: true, unique: true },
    barcode_value: { type: String, required: true },
    sku_id: { type: String, required: true },
    delivery_id: { type: String, required: true },
    preset_selling_cost: { type: Number, required: true },
    discount_percentage: { type: Number, default: 0 },
    admin_override: { type: Boolean, default: false },
    admin_override_by: { type: String, default: null },
    final_selling_price: { type: Number, required: true },
    shipping_cost: { type: Number, required: true },
    buyer_name: { type: String, required: true },
    buyer_address: { type: String, required: true },
    status: { type: String, default: 'Dispatched' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const ItemSchema = new mongoose.Schema(
  {
    pickle_racket_id: { type: String, required: true, unique: true },
    sku_id: { type: String, required: true },
    barcode_value: { type: String, required: true, unique: true },
    status: { type: String, enum: ['In-Stock', 'Sold', 'Returned'], default: 'In-Stock' },
    order_id: { type: String, default: null },
    batch_id: { type: String, default: null },
    history: [
      {
        action: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
        previous_barcode: String,
      },
    ],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const SKUSchema = new mongoose.Schema(
  {
    sku_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    preset_selling_cost: { type: Number, required: true },
    total_quantity: { type: Number, default: 0 },
    category: { type: String, default: 'Pickleball Racket' },
    weight_grams: { type: Number, default: 230 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);
const SKU = mongoose.models.SKU || mongoose.model('SKU', SKUSchema);

async function seedHistory() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected! Seeding historical & recent sample orders...');

  // Remove existing historical orders to allow idempotent re-runs
  await Order.deleteMany({});
  // Remove items marked sold/returned from previous order seed runs
  await Item.deleteMany({ status: { $in: ['Sold', 'Returned'] } });

  const now = new Date();
  let createdCount = 0;
  let adminOverrideCount = 0;

  for (let i = 0; i < sampleOrders.length; i++) {
    const s = sampleOrders[i];
    const orderDate = new Date(now.getTime() - s.daysAgo * 24 * 60 * 60 * 1000 - i * 3600 * 1000);
    
    // Formulate realistic identifiers
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `ORD-2026-${String(1001 + i).padStart(4, '0')}-${randomSuffix}`;
    const racketId = uuidv4();
    const barcode = `TS-${s.sku_id.slice(-7)}-HIST-${String(i + 1).padStart(3, '0')}`;
    const deliveryId = `${s.tracking_prefix || 'DLHV-HIST'}-${String(7000 + i)}`;

    const discountAmount = Math.round((s.preset_selling_cost * s.discount_percentage) / 100);
    const finalPrice = s.preset_selling_cost - discountAmount;
    const isAdminOverride = s.admin_override || s.discount_percentage > 20;

    if (isAdminOverride) {
      adminOverrideCount++;
    }

    // 1. Create Order document
    await Order.create({
      order_id: orderId,
      pickle_racket_id: racketId,
      barcode_value: barcode,
      sku_id: s.sku_id,
      delivery_id: deliveryId,
      preset_selling_cost: s.preset_selling_cost,
      discount_percentage: s.discount_percentage,
      admin_override: isAdminOverride,
      admin_override_by: isAdminOverride ? 'CEO_ADMIN_OVERRIDE_PIN' : null,
      final_selling_price: finalPrice,
      shipping_cost: s.shipping_cost,
      buyer_name: s.buyer_name,
      buyer_address: s.buyer_address,
      status: s.status,
      created_at: orderDate,
      updated_at: orderDate,
    });

    // 2. Create corresponding physical Item enforcing 1:1 mapping and full audit trail
    const acquisitionDate = new Date(orderDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    const itemHistory = [
      {
        action: 'ACQUIRED',
        timestamp: acquisitionDate,
        note: `Initial inventory batch intake for SKU ${s.sku_id}`,
      },
      {
        action: 'SOLD',
        timestamp: orderDate,
        note: `Dispatched to ${s.buyer_name} on Order ${orderId} (Tracking: ${deliveryId})`,
      },
    ];

    if (s.status === 'Returned') {
      const returnDate = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000);
      itemHistory.push({
        action: 'RETURNED',
        timestamp: returnDate,
        note: `Order ${orderId} returned by customer. Original sticker decommissioned.`,
      });
    }

    await Item.create({
      pickle_racket_id: racketId,
      sku_id: s.sku_id,
      barcode_value: barcode,
      status: s.status === 'Returned' ? 'Returned' : 'Sold',
      order_id: orderId,
      batch_id: 'BATCH-HIST-2026',
      history: itemHistory,
      created_at: acquisitionDate,
      updated_at: orderDate,
    });

    createdCount++;
  }

  console.log(`\n✅ Successfully seeded ${createdCount} sample orders with full 1:1 physical item audit trails!`);
  console.log(`   - Dispatched / Delivered: ${sampleOrders.filter(o => o.status !== 'Returned').length}`);
  console.log(`   - Returned: ${sampleOrders.filter(o => o.status === 'Returned').length}`);
  console.log(`   - Admin PIN Overrides (>20%): ${adminOverrideCount}`);
  console.log('   - Time span: Today through July 2026 (Past Week, Past Month, Historical Months)');

  process.exit(0);
}

seedHistory().catch((err) => {
  console.error('Failed to seed historical orders:', err);
  process.exit(1);
});
