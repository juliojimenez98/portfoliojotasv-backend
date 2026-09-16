import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ReminderStatus = "pending" | "sent" | "snoozed";

export interface ReminderState {
  status: ReminderStatus;
  lastSentAt?: Date;
  snoozedUntil?: Date;
  snoozeCount: number;
  lastTelegramMessageId?: number;
}

export interface RemedyDocument extends Document {
  userId: Types.ObjectId;
  name: string;
  dose: string;
  instructions?: string;
  frequencyHours: number; // e.g. 8, 12, 24
  nextDoseAt: Date;
  snoozeMinutes: number; // default 15, editable per remedy
  isActive: boolean;
  pausedUntil?: Date | null; // null = indefinite if isActive is false
  pauseReason?: string;
  reminderState: ReminderState;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderStateSchema = new Schema<ReminderState>(
  {
    status: {
      type: String,
      enum: ["pending", "sent", "snoozed"],
      default: "pending",
    },
    lastSentAt: { type: Date },
    snoozedUntil: { type: Date },
    snoozeCount: { type: Number, default: 0 },
    lastTelegramMessageId: { type: Number },
  },
  { _id: false },
);

const RemedySchema = new Schema<RemedyDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "El nombre del remedio es requerido"],
      trim: true,
    },
    dose: {
      type: String,
      required: [true, "La dosis es requerida"],
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    frequencyHours: {
      type: Number,
      required: [true, "La frecuencia en horas es requerida"],
      min: [1, "La frecuencia debe ser de al menos 1 hora"],
    },
    nextDoseAt: {
      type: Date,
      required: true,
    },
    snoozeMinutes: {
      type: Number,
      default: 15,
      min: [1, "El intervalo de repetición debe ser de al menos 1 minuto"],
      max: [1440, "El intervalo de repetición no puede exceder 24 horas"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    pausedUntil: {
      type: Date,
      default: null,
    },
    pauseReason: {
      type: String,
      trim: true,
    },
    reminderState: {
      type: ReminderStateSchema,
      default: () => ({
        status: "pending",
        snoozeCount: 0,
      }),
    },
  },
  {
    timestamps: true,
  },
);

RemedySchema.index({ userId: 1, isActive: 1 });
RemedySchema.index({ nextDoseAt: 1 });

const Remedy: Model<RemedyDocument> =
  mongoose.models.Remedy ||
  mongoose.model<RemedyDocument>("Remedy", RemedySchema);

export default Remedy;
