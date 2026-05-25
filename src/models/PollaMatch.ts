import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type MatchStage = "group" | "round_of_16" | "quarterfinal" | "semifinal" | "final";
export type MatchStatus = "scheduled" | "live" | "finished";

export interface PollaMatchDocument extends Document {
  groupId: Types.ObjectId;
  stage: MatchStage;
  matchday?: number;
  homeTeam: string;
  awayTeam: string;
  matchDate?: Date;
  venue?: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  isBettingOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PollaMatchSchema = new Schema<PollaMatchDocument>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "PollaGroup", required: true, index: true },
    stage: { type: String, enum: ["group", "round_of_16", "quarterfinal", "semifinal", "final"], required: true },
    matchday: { type: Number },
    homeTeam: { type: String, required: true, trim: true },
    awayTeam: { type: String, required: true, trim: true },
    matchDate: { type: Date },
    venue: { type: String, trim: true },
    homeScore: { type: Number },
    awayScore: { type: Number },
    status: { type: String, enum: ["scheduled", "live", "finished"], default: "scheduled" },
    isBettingOpen: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const PollaMatch: Model<PollaMatchDocument> =
  mongoose.models.PollaMatch || mongoose.model<PollaMatchDocument>("PollaMatch", PollaMatchSchema);

export default PollaMatch;
