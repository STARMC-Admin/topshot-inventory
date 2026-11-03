import mongoose, { Schema, Document, Model } from 'mongoose';

export type ItemStatus = 'In-Stock' | 'Sold' | 'Returned';

export interface IItemHistory {
  action: 'ACQUIRED' | 'SOLD' | 'RETURNED' | 'RELABELED';
  timestamp: Date;
  note?: string;
  previous_barcode?: string;
}

export interface IItem extends Document {
  pickle_racket_id: string; // Unique UUID for the physical racket
  sku_id: string; // SKU reference
  barcode_value: string; // Unique printable barcode string (e.g., TS-BC-XXXXXX)
  status: ItemStatus; // 'In-Stock' | 'Sold' | 'Returned'
  order_id?: string; // Associated order_id if sold
  batch_id?: string; // Acquisition batch reference
  history: IItemHistory[];
  created_at: Date;
  updated_at: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    pickle_racket_id: {
      type: String,
      required: [true, 'pickle_racket_id (UUID) is required'],
      unique: true,
      index: true,
    },
    sku_id: {
      type: String,
      required: [true, 'sku_id is required'],
      ref: 'SKU',
      index: true,
    },
    barcode_value: {
      type: String,
      required: [true, 'barcode_value is required'],
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['In-Stock', 'Sold', 'Returned'],
      default: 'In-Stock',
      index: true,
    },
    order_id: {
      type: String,
      default: null,
      index: true,
    },
    batch_id: {
      type: String,
      default: null,
    },
    history: [
      {
        action: {
          type: String,
          enum: ['ACQUIRED', 'SOLD', 'RETURNED', 'RELABELED'],
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
        },
        previous_barcode: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for fast stock queries per SKU
ItemSchema.index({ sku_id: 1, status: 1 });

export const Item: Model<IItem> = mongoose.models.Item || mongoose.model<IItem>('Item', ItemSchema);
