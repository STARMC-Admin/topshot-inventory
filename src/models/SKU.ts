import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISKU extends Document {
  sku_id: string; // E.g., "SKU-TOP-PRO-01"
  name: string; // E.g., "Topshot Pro Carbon Fiber Pickleball Racket"
  preset_selling_cost: number; // Preset retail price (e.g., 4999 INR)
  total_quantity: number; // Current live in-stock count
  category?: string;
  weight_grams?: number;
  created_at: Date;
  updated_at: Date;
}

const SKUSchema = new Schema<ISKU>(
  {
    sku_id: {
      type: String,
      required: [true, 'sku_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'SKU Name is required'],
      trim: true,
    },
    preset_selling_cost: {
      type: Number,
      required: [true, 'Preset selling cost is required'],
      min: [0, 'Preset cost cannot be negative'],
    },
    total_quantity: {
      type: Number,
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    category: {
      type: String,
      default: 'Pickleball Racket',
    },
    weight_grams: {
      type: Number,
      default: 230,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const SKU: Model<ISKU> = mongoose.models.SKU || mongoose.model<ISKU>('SKU', SKUSchema);
