import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type MatchStage =
  | "group"
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "final";
export type MatchStatus = "scheduled" | "live" | "finished";

export interface PollaMatchDocument extends Document {
  groupId: Types.ObjectId;
  stage: MatchStage;
  matchday?: number; // for group stage
  homeTeam: string;
  awayTeam: string;
  matchDate?: Date;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  isBettingOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PollaMatchSchema = new Schema<PollaMatchDocument>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "PollaGroup",
      required: true,
      index: true,
    },
    stage: {
      type: String,
      enum: ["group", "round_of_16", "quarterfinal", "semifinal", "final"],
      required: true,
    },
    matchday: { type: Number },
    homeTeam: {
      type: String,
      required: [true, "El equipo local es requerido"],
      trim: true,
      maxlength: 60,
    },
    awayTeam: {
      type: String,
      required: [true, "El equipo visitante es requerido"],
      trim: true,
      maxlength: 60,
    },
    matchDate: { type: Date },
    homeScore: { type: Number, min: 0 },
    awayScore: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["scheduled", "live", "finished"],
      default: "scheduled",
    },
    isBettingOpen: { type: Boolean, default: true },
  },
  { timestamps: true },
);

PollaMatchSchema.index({ groupId: 1, stage: 1 });

const PollaMatch: Model<PollaMatchDocument> =
  mongoose.models.PollaMatch ||
  mongoose.model<PollaMatchDocument>("PollaMatch", PollaMatchSchema);

export default PollaMatch;
