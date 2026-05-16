import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface CategoryDocument extends Document {
  userId: Types.ObjectId;
  value: string;
  label: string;
  icon: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<CategoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es requerido'],
      index: true,
    },
    value: {
      type: String,
      required: [true, 'El valor/slug es requerido'],
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: [true, 'El nombre de la categoría es requerido'],
      trim: true,
      maxlength: [50, 'El nombre no puede exceder 50 caracteres'],
    },
    icon: {
      type: String,
      required: [true, 'El icono es requerido'],
      trim: true,
      default: '📁',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique category value per user
CategorySchema.index({ userId: 1, value: 1 }, { unique: true });

const Category: Model<CategoryDocument> =
  mongoose.models.Category ||
  mongoose.model<CategoryDocument>('Category', CategorySchema);

export default Category;
