/**
 * Complete Database Seeder for Topshot Inventory & Order Management
 * Seeds SKUs, In-Stock inventory, and comprehensive sample orders with full 1:1 mapping.
 * Run with: npm run seed
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { sampleOrders } = require('./sample_orders_data');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/topshot_inventory';

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

const SKU = mongoose.models.SKU || mongoose.model('SKU', SKUSchema);
const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

const sampleSkus = [
  {
    sku_id: 'SKU-TOP-AERO-01',
    name: 'Topshot Aero Carbon 16mm Pro Racket',
    preset_selling_cost: 4499,
    weight_grams: 228,
  },
  {
    sku_id: 'SKU-TOP-FORCE-02',
    name: 'Topshot Force Raw T700 Carbon Power Racket',
    preset_selling_cost: 5999,
    weight_grams: 235,
  },
  {
    sku_id: 'SKU-TOP-SPIN-03',
    name: 'Topshot SpinMaster Pro Graphite Racket',
    preset_selling_cost: 3299,
    weight_grams: 225,
  },
  {
    sku_id: 'SKU-TOP-LITE-04',
    name: 'Topshot Lite Featherweight Control Racket',
    preset_selling_cost: 2799,
    weight_grams: 215,
  },
];

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected! Resetting existing collections for Topshot...');

  await SKU.deleteMany({});
  await Item.deleteMany({});
  await Order.deleteMany({});

  console.log('Inserting Topshot SKUs...');
  for (const s of sampleSkus) {
    await SKU.create(s);
  }

  console.log('Generating initial In-Stock physical rackets and unique barcodes...');
  const itemsToInsert = [];
  const createdSkus = await SKU.find({});

  for (const sku of createdSkus) {
    const qty = 8; // 8 active in-stock units each
    for (let i = 1; i <= qty; i++) {
      const racketId = uuidv4();
      const barcode = `TS-${sku.sku_id.slice(-7)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      itemsToInsert.push({
        pickle_racket_id: racketId,
        sku_id: sku.sku_id,
        barcode_value: barcode,
        status: 'In-Stock',
        batch_id: 'INITIAL_ACQUISITION',
        history: [{ action: 'ACQUIRED', timestamp: new Date(), note: 'Initial warehouse stock intake' }],
      });
    }
    sku.total_quantity = qty;
    await sku.save();
  }

  const insertedItems = await Item.insertMany(itemsToInsert);
  console.log(`Created ${insertedItems.length} in-stock rackets with unique barcodes!`);

  console.log('Seeding sample orders and corresponding dispatched physical rackets...');
  const now = new Date();
  let ordersCount = 0;

  for (let i = 0; i < sampleOrders.length; i++) {
    const s = sampleOrders[i];
    const orderDate = new Date(now.getTime() - s.daysAgo * 24 * 60 * 60 * 1000 - i * 3600 * 1000);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `ORD-2026-${String(1001 + i).padStart(4, '0')}-${randomSuffix}`;
    const racketId = uuidv4();
    const barcode = `TS-${s.sku_id.slice(-7)}-SEED-${String(i + 1).padStart(3, '0')}`;
    const deliveryId = `${s.tracking_prefix || 'DLHV-SEED'}-${String(7000 + i)}`;

    const discountAmount = Math.round((s.preset_selling_cost * s.discount_percentage) / 100);
    const finalPrice = s.preset_selling_cost - discountAmount;
    const isAdminOverride = s.admin_override || s.discount_percentage > 20;

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

    const acquisitionDate = new Date(orderDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    const itemHistory = [
      {
        action: 'ACQUIRED',
        timestamp: acquisitionDate,
        note: `Acquisition batch intake for SKU ${s.sku_id}`,
      },
      {
        action: 'SOLD',
        timestamp: orderDate,
        note: `Dispatched to ${s.buyer_name} on Order ${orderId} (Delhivery: ${deliveryId})`,
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
      batch_id: 'BATCH-SEED-2026',
      history: itemHistory,
      created_at: acquisitionDate,
      updated_at: orderDate,
    });

    ordersCount++;
  }

  console.log(`Created ${ordersCount} sample orders with 1:1 mapped physical items!`);
  console.log('Topshot seed completed successfully! 🎾');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
