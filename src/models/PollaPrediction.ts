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
  // Special predictions (set before tournament starts)
  predictedChampion?: string;
  predictedTopScorer?: string;
  // Per-match predictions
  matchPredictions: MatchPrediction[];
  // Calculated totals
  totalPoints: number;
  championBonusEarned: boolean;
  topScorerBonusEarned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MatchPredictionSchema = new Schema<MatchPrediction>(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: "PollaMatch",
      required: true,
    },
    homeScore: { type: Number, required: true, min: 0 },
    awayScore: { type: Number, required: true, min: 0 },
    pointsEarned: { type: Number, default: 0 },
  },
  { _id: false },
);

const PollaPredictionSchema = new Schema<PollaPredictionDocument>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "PollaGroup",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: { type: String, required: true, trim: true },
    predictedChampion: { type: String, trim: true, maxlength: 60 },
    predictedTopScorer: { type: String, trim: true, maxlength: 80 },
    matchPredictions: { type: [MatchPredictionSchema], default: [] },
    totalPoints: { type: Number, default: 0 },
    championBonusEarned: { type: Boolean, default: false },
    topScorerBonusEarned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One prediction document per user per group
PollaPredictionSchema.index({ groupId: 1, userId: 1 }, { unique: true });

const PollaPrediction: Model<PollaPredictionDocument> =
  mongoose.models.PollaPrediction ||
  mongoose.model<PollaPredictionDocument>(
    "PollaPrediction",
    PollaPredictionSchema,
  );

export default PollaPrediction;
