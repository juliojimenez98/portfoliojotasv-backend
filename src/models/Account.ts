import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type AccountType = 'credit_card' | 'debit' | 'cash' | 'savings' | 'other';
export type RefreshType = 'automatic' | 'manual';

export interface AccountDocument extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  type: AccountType;
  bankName?: string;
  currency: string;
  balance: number;
  color: string;
  icon: string;
  refreshType: RefreshType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<AccountDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es requerido'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre de la cuenta es requerido'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'La descripción no puede exceder 300 caracteres'],
    },
    type: {
      type: String,
      enum: {
        values: ['credit_card', 'debit', 'cash', 'savings', 'other'],
        message: '{VALUE} no es un tipo de cuenta válido',
      },
      required: [true, 'El tipo de cuenta es requerido'],
    },
    bankName: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre del banco no puede exceder 100 caracteres'],
    },
    currency: {
      type: String,
      default: 'CLP',
      trim: true,
      uppercase: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#6366f1', // indigo-500
    },
    icon: {
      type: String,
      default: 'wallet',
    },
    refreshType: {
      type: String,
      enum: {
        values: ['automatic', 'manual'],
        message: '{VALUE} no es un tipo de refresco válido',
      },
      default: 'manual',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user + active queries
AccountSchema.index({ userId: 1, isActive: 1 });

const Account: Model<AccountDocument> =
  mongoose.models.Account || mongoose.model<AccountDocument>('Account', AccountSchema);

export default Account;
