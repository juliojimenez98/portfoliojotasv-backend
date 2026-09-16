import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type LogAction = "taken" | "skipped" | "snoozed" | "paused" | "resumed";

export interface RemedyLogDocument extends Document {
  userId: Types.ObjectId;
  remedyId: Types.ObjectId;
  remedyName: string;
  scheduledFor: Date;
  action: LogAction;
  actionAt: Date;
  skipReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RemedyLogSchema = new Schema<RemedyLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    remedyId: {
      type: Schema.Types.ObjectId,
      ref: "Remedy",
      required: true,
      index: true,
    },
    remedyName: {
      type: String,
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    action: {
      type: String,
      enum: ["taken", "skipped", "snoozed", "paused", "resumed"],
      required: true,
    },
    actionAt: {
      type: Date,
      default: Date.now,
    },
    skipReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

RemedyLogSchema.index({ userId: 1, actionAt: -1 });

const RemedyLog: Model<RemedyLogDocument> =
  mongoose.models.RemedyLog ||
  mongoose.model<RemedyLogDocument>("RemedyLog", RemedyLogSchema);

export default RemedyLog;
