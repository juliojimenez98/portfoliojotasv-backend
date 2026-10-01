import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ActivityLogStatus = "completed" | "in_progress" | "skipped";

export interface ActivityLogDocument extends Document {
  userId: Types.ObjectId;
  activityId: Types.ObjectId;
  activityTitle: string;
  dateKey: string;
  scheduledFor?: Date | null;
  status: ActivityLogStatus;
  checkInAt?: Date;
  checkOutAt?: Date;
  completedAt?: Date;
  durationMinutes?: number;
  note?: string;
  skipReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<ActivityLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true,
    },
    activityTitle: {
      type: String,
      required: true,
      trim: true,
    },
    dateKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD"],
      index: true,
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["completed", "in_progress", "skipped"],
      required: true,
    },
    checkInAt: {
      type: Date,
    },
    checkOutAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    skipReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  },
);

ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, activityId: 1, dateKey: 1 });

const ActivityLog: Model<ActivityLogDocument> =
  mongoose.models.ActivityLog ||
  mongoose.model<ActivityLogDocument>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
