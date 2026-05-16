import mongoose, { Schema, Document, Model } from 'mongoose';

export interface MigrationDocument extends Document {
  name: string;
  version: number;
  executedAt: Date;
}

const MigrationSchema = new Schema<MigrationDocument>({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  version: {
    type: Number,
    required: true,
  },
  executedAt: {
    type: Date,
    default: Date.now,
  },
});

const MigrationModel: Model<MigrationDocument> =
  mongoose.models.Migration ||
  mongoose.model<MigrationDocument>('Migration', MigrationSchema);

export default MigrationModel;
