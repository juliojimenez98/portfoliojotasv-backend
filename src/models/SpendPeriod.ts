import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface PeriodSnapshot {
  totalExpenses: number;
  totalIncome: number;
  totalTransfers: number;
  netSavings: number;
  transactionCount: number;
  topCategories: { category: string; amount: number; count: number }[];
}

export interface SpendPeriodDocument extends Document {
  userId: Types.ObjectId;
  label: string; // e.g. "Mayo 2026", "Período 3"
  startDate: Date;
  endDate?: Date; // undefined = currently active period
  status: "active" | "closed";
  snapshot?: PeriodSnapshot;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PeriodSnapshotSchema = new Schema<PeriodSnapshot>(
  {
    totalExpenses: { type: Number, default: 0 },
    totalIncome: { type: Number, default: 0 },
    totalTransfers: { type: Number, default: 0 },
    netSavings: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    topCategories: [
      {
        category: String,
        amount: Number,
        count: Number,
        _id: false,
      },
    ],
  },
  { _id: false },
);

const SpendPeriodSchema = new Schema<SpendPeriodDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
    snapshot: {
      type: PeriodSnapshotSchema,
      default: undefined,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true },
);

SpendPeriodSchema.index({ userId: 1, status: 1 });
SpendPeriodSchema.index({ userId: 1, startDate: -1 });

const SpendPeriod: Model<SpendPeriodDocument> =
  mongoose.models.SpendPeriod ||
  mongoose.model<SpendPeriodDocument>("SpendPeriod", SpendPeriodSchema);

export default SpendPeriod;
