import mongoose, { Schema, Document, Model, Types } from "mongoose";
import crypto from "crypto";

export interface GroupMember {
  userId: Types.ObjectId;
  username: string;
  hasPaid: boolean;
  paidAt?: Date;
  joinedAt: Date;
}

export interface ScoringConfig {
  exactScore: number;
  correctTrend: number;
  championBonus: number;
  topScorerBonus: number;
}

export interface PollaGroupDocument extends Document {
  name: string;
  description?: string;
  adminId: Types.ObjectId;
  inviteCode: string;
  entryFee: number;
  currency: string;
  members: Types.DocumentArray<GroupMember & Document>;
  scoringConfig: ScoringConfig;
  tournamentName: string;
  isActive: boolean;
  actualChampion?: string;
  actualTopScorer?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupMemberSchema = new Schema<GroupMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true, trim: true },
    hasPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ScoringConfigSchema = new Schema<ScoringConfig>(
  {
    exactScore: { type: Number, default: 3 },
    correctTrend: { type: Number, default: 1 },
    championBonus: { type: Number, default: 5 },
    topScorerBonus: { type: Number, default: 3 },
  },
  { _id: false },
);

const PollaGroupSchema = new Schema<PollaGroupDocument>(
  {
    name: { type: String, required: [true, "El nombre es requerido"], trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 300 },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    inviteCode: { type: String, unique: true, default: () => crypto.randomBytes(4).toString("hex").toUpperCase() },
    entryFee: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "CLP", uppercase: true, trim: true },
    members: { type: [GroupMemberSchema], default: [] },
    scoringConfig: { type: ScoringConfigSchema, default: () => ({}) },
    tournamentName: { type: String, default: "Mundial 2026", trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true },
    actualChampion: { type: String, trim: true },
    actualTopScorer: { type: String, trim: true },
  },
  { timestamps: true },
);

PollaGroupSchema.index({ "members.userId": 1 });

const PollaGroup: Model<PollaGroupDocument> =
  mongoose.models.PollaGroup || mongoose.model<PollaGroupDocument>("PollaGroup", PollaGroupSchema);

export default PollaGroup;
