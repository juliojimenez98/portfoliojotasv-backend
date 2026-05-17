import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Payday configuration types:
 *  - fixed_day          → a fixed day of the month (e.g. 5, 10, 15, 28)
 *  - last_day           → last calendar day of the month
 *  - last_business_day  → last business day (Mon–Fri) of the month
 *  - business_days_before_end → N business days before end of month (e.g. 3)
 *  - first_day          → 1st of the month
 *  - first_business_day → first business day of the month
 *  - custom_text        → free text description (e.g. "Quincena 15 y 30")
 */
export type PaydayType =
  | 'fixed_day'
  | 'last_day'
  | 'last_business_day'
  | 'business_days_before_end'
  | 'first_day'
  | 'first_business_day'
  | 'custom_text';

export interface PaydayConfig {
  type: PaydayType;
  fixedDay?: number;          // used when type === 'fixed_day'
  businessDaysBefore?: number; // used when type === 'business_days_before_end'
  customText?: string;         // used when type === 'custom_text'
  accountId?: string;          // account where salary is received
  amount?: number;             // expected salary amount (optional)
  currency?: string;           // currency of the salary
  label?: string;              // user-friendly label (e.g. "Salario principal")
}

export interface UserDocument extends Document {
  email: string;
  username: string;
  password: string;
  allowedApps: string[];
  isAdmin: boolean;
  paydayConfig?: PaydayConfig;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const PaydayConfigSchema = new Schema<PaydayConfig>(
  {
    type: {
      type: String,
      enum: [
        'fixed_day', 'last_day', 'last_business_day',
        'business_days_before_end', 'first_day', 'first_business_day', 'custom_text',
      ],
      required: true,
    },
    fixedDay: { type: Number, min: 1, max: 31 },
    businessDaysBefore: { type: Number, min: 1, max: 15 },
    customText: { type: String, trim: true, maxlength: 100 },
    accountId: { type: String },
    amount: { type: Number, min: 0 },
    currency: { type: String, default: 'CLP' },
    label: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false }
);

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Formato de email inválido'],
    },
    username: {
      type: String,
      required: [true, 'El nombre de usuario es requerido'],
      unique: true,
      trim: true,
      minlength: [3, 'El username debe tener al menos 3 caracteres'],
      maxlength: [30, 'El username no puede exceder 30 caracteres'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false, // Never return password by default
    },
    allowedApps: {
      type: [String],
      default: [],
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    paydayConfig: {
      type: PaydayConfigSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

/**
 * Pre-save hook: Hash password before saving.
 */
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Instance method: Compare a plain-text password with the hashed one.
 */
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

export default User;
