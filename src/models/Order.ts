import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrderStatus = 'Dispatched' | 'Delivered' | 'Returned' | 'Cancelled';

export interface IOrderItem {
  pickle_racket_id: string; // Unique UUID of physical racket
  barcode_value: string; // Barcode scanned on physical racket
  sku_id: string; // Associated SKU identifier
  sku_name?: string; // Human readable SKU title
  preset_selling_cost: number; // Retail MSRP price of this unit
}

export interface IOrder extends Document {
  order_id: string; // Unique Order ID e.g., ORD-2026-XXXXX
  items: IOrderItem[]; // Array of physical rackets included in this order
  total_units: number; // Total count of rackets in this order (>= 1)
  pickle_racket_id: string; // Primary racket UUID (or comma-separated list for legacy queries)
  barcode_value: string; // Primary barcode string (or comma-separated list for legacy queries)
  sku_id: string; // Primary SKU identifier
  delivery_id: string; // Delhivery Tracking / AWB Number
  preset_selling_cost: number; // Combined MSRP/preset cost for all items
  discount_percentage: number; // Applied discount %
  admin_override: boolean; // Flagged true if discount > 20%
  admin_override_by?: string; // Approver identifier (e.g., 'CEO_PIN_AUTHORIZED')
  final_selling_price: number; // Actual charged price after discount
  shipping_cost: number; // Delhivery logistics cost
  buyer_name: string; // Customer name from Delhivery
  buyer_address: string; // Shipping destination address
  status: OrderStatus; // Order status
  created_at: Date;
  updated_at: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    pickle_racket_id: {
      type: String,
      required: [true, 'pickle_racket_id is required for order item'],
    },
    barcode_value: {
      type: String,
      required: [true, 'barcode_value is required for order item'],
    },
    sku_id: {
      type: String,
      required: [true, 'sku_id is required for order item'],
    },
    sku_name: {
      type: String,
    },
    preset_selling_cost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    order_id: {
      type: String,
      required: [true, 'order_id is required'],
      unique: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      default: [],
    },
    total_units: {
      type: Number,
      default: 1,
      min: 1,
    },
    pickle_racket_id: {
      type: String,
      required: [true, 'pickle_racket_id is required'],
      index: true,
    },
    barcode_value: {
      type: String,
      required: [true, 'barcode_value is required'],
      index: true,
    },
    sku_id: {
      type: String,
      required: [true, 'sku_id is required'],
      index: true,
    },
    delivery_id: {
      type: String,
      required: [true, 'delivery_id (Delhivery Tracking ID) is required'],
      index: true,
    },
    preset_selling_cost: {
      type: Number,
      required: true,
      min: 0,
    },
    discount_percentage: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    admin_override: {
      type: Boolean,
      default: false,
    },
    admin_override_by: {
      type: String,
      default: null,
    },
    final_selling_price: {
      type: Number,
      required: [true, 'final_selling_price is required'],
      min: [0, 'Price cannot be negative'],
    },
    shipping_cost: {
      type: Number,
      required: [true, 'shipping_cost is required'],
      default: 0,
    },
    buyer_name: {
      type: String,
      required: [true, 'buyer_name is required'],
      trim: true,
    },
    buyer_address: {
      type: String,
      required: [true, 'buyer_address is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Dispatched', 'Delivered', 'Returned', 'Cancelled'],
      default: 'Dispatched',
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes for fast queries
OrderSchema.index({ created_at: -1 });
OrderSchema.index({ status: 1, created_at: -1 });
OrderSchema.index({ 'items.pickle_racket_id': 1 });
OrderSchema.index({ 'items.barcode_value': 1 });
OrderSchema.index({ 'items.sku_id': 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Order) {
  delete (mongoose.models as any).Order;
}

export const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
