import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { BillingCycle, SubscriptionCategory } from '../types/subscription';

export interface SubscriptionDocument extends Document {
  userId: Types.ObjectId;
  accountId: Types.ObjectId;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  billingDay: number;
  category: SubscriptionCategory;
  isActive: boolean;
  startDate: Date;
  nextBillingDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<SubscriptionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es requerido'],
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'La cuenta es requerida'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre de la suscripción es requerido'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    amount: {
      type: Number,
      required: [true, 'El monto es requerido'],
      min: [0.01, 'El monto debe ser mayor a 0'],
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    billingCycle: {
      type: String,
      enum: {
        values: ['monthly', 'yearly'],
        message: '{VALUE} no es un ciclo de facturación válido',
      },
      required: [true, 'El ciclo de facturación es requerido'],
    },
    billingDay: {
      type: Number,
      required: [true, 'El día de facturación es requerido'],
      min: [1, 'El día debe ser entre 1 y 31'],
      max: [31, 'El día debe ser entre 1 y 31'],
    },
    category: {
      type: String,
      enum: {
        values: [
          'streaming',
          'music',
          'software',
          'gaming',
          'cloud',
          'fitness',
          'news',
          'productivity',
          'other',
        ],
        message: '{VALUE} no es una categoría válida',
      },
      required: [true, 'La categoría es requerida'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      required: [true, 'La fecha de inicio es requerida'],
    },
    nextBillingDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Las notas no pueden exceder 500 caracteres'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for active subscriptions
SubscriptionSchema.index({ isActive: 1 });
// Index for upcoming billing queries
SubscriptionSchema.index({ nextBillingDate: 1, isActive: 1 });

/**
 * Pre-save hook: Compute nextBillingDate based on the billing cycle.
 */
SubscriptionSchema.pre('save', async function () {
  if (this.isNew || this.isModified('billingCycle') || this.isModified('billingDay') || this.isModified('startDate')) {
    const now = new Date();
    const day = this.billingDay;

    if (this.billingCycle === 'monthly') {
      // Next billing is this month's billingDay, or next month if it already passed
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
      this.nextBillingDate = thisMonth > now ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, day);
    } else {
      // Yearly: next billing is this year's startDate month + billingDay, or next year
      const month = this.startDate.getMonth();
      const thisYear = new Date(now.getFullYear(), month, day);
      this.nextBillingDate = thisYear > now ? thisYear : new Date(now.getFullYear() + 1, month, day);
    }
  }
});

const Subscription: Model<SubscriptionDocument> =
  mongoose.models.Subscription ||
  mongoose.model<SubscriptionDocument>('Subscription', SubscriptionSchema);

export default Subscription;
