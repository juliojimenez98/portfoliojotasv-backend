import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type {
  TransactionType,
  TransactionCategory,
} from "../types/transaction";

export interface TransactionDocument extends Document {
  accountId: Types.ObjectId;
  userId: Types.ObjectId;
  description: string;
  amount: number; // Always in CLP
  originalCurrency: string;
  originalAmount: number;
  exchangeRate: number;
  type: TransactionType;
  category: string;
  date: Date;
  notes?: string;
  subscriptionId?: Types.ObjectId;
  linkedTransactionId?: Types.ObjectId;
  balanceBefore?: number; // Account balance before this transaction was applied
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<TransactionDocument>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "La cuenta es requerida"],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario es requerido"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "La descripción es requerida"],
      trim: true,
      maxlength: [200, "La descripción no puede exceder 200 caracteres"],
    },
    amount: {
      type: Number,
      required: [true, "El monto es requerido"],
      min: [1, "El monto debe ser mayor a 0"],
    },
    originalCurrency: {
      type: String,
      default: "CLP",
      trim: true,
      uppercase: true,
    },
    originalAmount: {
      type: Number,
      required: false,
      min: [0.01, "El monto original debe ser mayor a 0"],
    },
    exchangeRate: {
      type: Number,
      default: 1,
      min: [0, "La tasa de cambio debe ser positiva"],
    },
    type: {
      type: String,
      enum: {
        values: ["income", "expense", "transfer"],
        message: "{VALUE} no es un tipo de transacción válido",
      },
      required: [true, "El tipo de transacción es requerido"],
    },
    category: {
      type: String,
      required: [true, "La categoría es requerida"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "La fecha es requerida"],
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Las notas no pueden exceder 500 caracteres"],
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: false,
    },
    linkedTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: false,
    },
    balanceBefore: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient monthly queries by account
TransactionSchema.index({ accountId: 1, date: -1 });
// Index for date-range queries across all accounts
TransactionSchema.index({ date: -1 });
// Index for category-based filtering
TransactionSchema.index({ category: 1, date: -1 });

const Transaction: Model<TransactionDocument> =
  mongoose.models.Transaction ||
  mongoose.model<TransactionDocument>("Transaction", TransactionSchema);

export default Transaction;
