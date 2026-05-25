import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface MatchPrediction {
  matchId: Types.ObjectId;
  homeScore: number;
  awayScore: number;
  pointsEarned: number;
}

export interface PollaPredictionDocument extends Document {
  groupId: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  predictedChampion?: string;
  predictedTopScorer?: string;
  matchPredictions: Types.DocumentArray<MatchPrediction & Document>;
  totalPoints: number;
  championBonusEarned: boolean;
  topScorerBonusEarned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MatchPredictionSchema = new Schema<MatchPrediction>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "PollaMatch", required: true },
    homeScore: { type: Number, required: true, min: 0 },
    awayScore: { type: Number, required: true, min: 0 },
    pointsEarned: { type: Number, default: 0 },
  },
  { _id: false },
);

const PollaPredictionSchema = new Schema<PollaPredictionDocument>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "PollaGroup", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true, trim: true },
    predictedChampion: { type: String, trim: true },
    predictedTopScorer: { type: String, trim: true },
    matchPredictions: { type: [MatchPredictionSchema], default: [] },
    totalPoints: { type: Number, default: 0 },
    championBonusEarned: { type: Boolean, default: false },
    topScorerBonusEarned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

PollaPredictionSchema.index({ groupId: 1, userId: 1 }, { unique: true });

const PollaPrediction: Model<PollaPredictionDocument> =
  mongoose.models.PollaPrediction || mongoose.model<PollaPredictionDocument>("PollaPrediction", PollaPredictionSchema);

export default PollaPrediction;
