import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ActivityFrequency =
  | "daily"
  | "weekdays"
  | "weekends"
  | "weekly"
  | "monthly"
  | "custom_days"
  | "interval_days";

export type ActivityTrackingMode = "completion" | "timer";

export type ActivityCategory =
  | "work"
  | "personal"
  | "health"
  | "study"
  | "home"
  | "other";

export interface ActivitySchedule {
  frequency: ActivityFrequency;
  daysOfWeek: number[];
  intervalDays: number;
  startDate: Date;
  endDate?: Date | null;
  timeOfDay?: string;
  expectedStartTime?: string;
  expectedEndTime?: string;
}

export interface ActivityDocument extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  category: ActivityCategory;
  trackingMode: ActivityTrackingMode;
  schedule: ActivitySchedule;
  nextOccurrenceAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityScheduleSchema = new Schema<ActivitySchedule>(
  {
    frequency: {
      type: String,
      enum: [
        "daily",
        "weekdays",
        "weekends",
        "weekly",
        "monthly",
        "custom_days",
        "interval_days",
      ],
      required: true,
      default: "daily",
    },
    daysOfWeek: {
      type: [Number],
      default: [],
      validate: {
        validator(days: number[]) {
          return days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
        },
        message: "Los días deben estar entre 0 y 6.",
      },
    },
    intervalDays: {
      type: Number,
      default: 1,
      min: [1, "El intervalo debe ser de al menos 1 día"],
      max: [365, "El intervalo no puede exceder 365 días"],
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    timeOfDay: {
      type: String,
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm"],
    },
    expectedStartTime: {
      type: String,
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "La hora de entrada debe tener formato HH:mm"],
    },
    expectedEndTime: {
      type: String,
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "La hora de salida debe tener formato HH:mm"],
    },
  },
  { _id: false },
);

const ActivitySchema = new Schema<ActivityDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "El nombre de la actividad es requerido"],
      trim: true,
      maxlength: [100, "El nombre no puede exceder 100 caracteres"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "La descripción no puede exceder 500 caracteres"],
    },
    category: {
      type: String,
      enum: ["work", "personal", "health", "study", "home", "other"],
      default: "personal",
    },
    trackingMode: {
      type: String,
      enum: ["completion", "timer"],
      default: "completion",
    },
    schedule: {
      type: ActivityScheduleSchema,
      required: true,
    },
    nextOccurrenceAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

ActivitySchema.index({ userId: 1, isActive: 1 });
ActivitySchema.index({ userId: 1, nextOccurrenceAt: 1 });

const Activity: Model<ActivityDocument> =
  mongoose.models.Activity ||
  mongoose.model<ActivityDocument>("Activity", ActivitySchema);

export default Activity;
