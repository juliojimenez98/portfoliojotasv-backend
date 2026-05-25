import { Request, Response } from "express";
import PollaGroup from "../models/PollaGroup";
import PollaMatch from "../models/PollaMatch";
import PollaPrediction from "../models/PollaPrediction";
import User from "../models/User";
import { Types } from "mongoose";
import { MUNDIAL_2026_FIXTURE } from "../data/mundial2026Fixture";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Recalculates points for ALL predictions in a group based on finished matches.
 * Called every time a match result is saved.
 */
async function recalculateGroupPoints(groupId: string) {
  const group = await PollaGroup.findById(groupId);
  if (!group) return;

  const finishedMatches = await PollaMatch.find({
    groupId,
    status: "finished",
    homeScore: { $exists: true },
    awayScore: { $exists: true },
  });

  const finishedMatchMap = new Map(
    finishedMatches.map((m) => [m._id.toString(), m]),
  );

  const predictions = await PollaPrediction.find({ groupId });
  const { exactScore, correctTrend, championBonus, topScorerBonus } =
    group.scoringConfig;

  // Determine actual champion / top scorer from group metadata (stored on group)
  const groupAny = group as any;
  const actualChampion: string | undefined = groupAny.actualChampion;
  const actualTopScorer: string | undefined = groupAny.actualTopScorer;

  for (const pred of predictions) {
    let total = 0;
    let champBonus = false;
    let scorerBonus = false;

    for (const mp of pred.matchPredictions) {
      const real = finishedMatchMap.get(mp.matchId.toString());
      if (!real) {
        mp.pointsEarned = 0;
        continue;
      }
      const rHome = real.homeScore!;
      const rAway = real.awayScore!;
      const pHome = mp.homeScore;
      const pAway = mp.awayScore;

      if (pHome === rHome && pAway === rAway) {
        mp.pointsEarned = exactScore;
      } else {
        const realTrend =
          rHome > rAway ? "home" : rAway > rHome ? "away" : "draw";
        const predTrend =
          pHome > pAway ? "home" : pAway > pHome ? "away" : "draw";
        mp.pointsEarned = realTrend === predTrend ? correctTrend : 0;
      }
      total += mp.pointsEarned;
    }

    // Bonus points
    if (
      actualChampion &&
      pred.predictedChampion?.toLowerCase() === actualChampion.toLowerCase()
    ) {
      total += championBonus;
      champBonus = true;
    }
    if (
      actualTopScorer &&
      pred.predictedTopScorer?.toLowerCase() === actualTopScorer.toLowerCase()
    ) {
      total += topScorerBonus;
      scorerBonus = true;
    }

    pred.totalPoints = total;
    pred.championBonusEarned = champBonus;
    pred.topScorerBonusEarned = scorerBonus;
    await pred.save();
  }
}

// ─── Groups ─────────────────────────────────────────────────────────────────

// @route  POST /api/polla/groups
// @desc   Create a new polla group
// @access Private
export const createGroup = async (req: Request, res: Response) => {
  const {
    name,
    description,
    entryFee,
    currency,
    tournamentName,
    scoringConfig,
  } = req.body;

  const group = await PollaGroup.create({
    name,
    description,
    entryFee: entryFee ?? 0,
    currency: currency ?? "CLP",
    tournamentName: tournamentName ?? "Mundial 2026",
    adminId: req.user?.id,
    scoringConfig: scoringConfig ?? {},
    members: [
      {
        userId: req.user?.id,
        username: req.user?.username,
        hasPaid: true,
        paidAt: new Date(),
        joinedAt: new Date(),
      },
    ],
  });

  // Auto-create prediction document for the admin
  await PollaPrediction.create({
    groupId: group._id,
    userId: req.user?.id,
    username: req.user?.username,
  });

  res.status(201).json({ success: true, data: group });
};

// @route  GET /api/polla/groups
// @desc   Get all groups where the current user is a member
// @access Private
export const getMyGroups = async (req: Request, res: Response) => {
  const groups = await PollaGroup.find({
    "members.userId": req.user?.id,
  }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: groups.length, data: groups });
};

// @route  GET /api/polla/groups/:id
// @desc   Get a single group with leaderboard + finance summary
// @access Private (members only)
export const getGroup = async (req: Request, res: Response) => {
  const group = await PollaGroup.findById(req.params.id);
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Grupo no encontrado" });
  }

  const isMember = group.members.some(
    (m) => m.userId.toString() === req.user?.id,
  );
  if (!isMember && !req.user?.isAdmin) {
    return res
      .status(403)
      .json({ success: false, error: "No eres miembro de este grupo" });
  }

  // Finance summary
  const paid = group.members.filter((m) => m.hasPaid);
  const pending = group.members.filter((m) => !m.hasPaid);
  const pot = paid.length * group.entryFee;

  // Leaderboard
  const predictions = await PollaPrediction.find({ groupId: group._id }).sort({
    totalPoints: -1,
  });

  const leaderboard = predictions.map((p, idx) => ({
    rank: idx + 1,
    userId: p.userId,
    username: p.username,
    totalPoints: p.totalPoints,
    championBonusEarned: p.championBonusEarned,
    topScorerBonusEarned: p.topScorerBonusEarned,
    predictedChampion: p.predictedChampion,
    predictedTopScorer: p.predictedTopScorer,
  }));

  res.status(200).json({
    success: true,
    data: {
      group,
      finance: {
        pot,
        paidCount: paid.length,
        pendingCount: pending.length,
        paid: paid.map((m) => ({
          userId: m.userId,
          username: m.username,
          paidAt: m.paidAt,
        })),
        pending: pending.map((m) => ({
          userId: m.userId,
          username: m.username,
        })),
      },
      leaderboard,
    },
  });
};

// @route  POST /api/polla/groups/join
// @desc   Join a group via invite code
// @access Private
export const joinGroup = async (req: Request, res: Response) => {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    return res
      .status(400)
      .json({ success: false, error: "Código de invitación requerido" });
  }

  const group = await PollaGroup.findOne({
    inviteCode: inviteCode.toUpperCase(),
  });
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Código de invitación inválido" });
  }

  const alreadyMember = group.members.some(
    (m) => m.userId.toString() === req.user?.id,
  );
  if (alreadyMember) {
    return res
      .status(400)
      .json({ success: false, error: "Ya eres miembro de este grupo" });
  }

  group.members.push({
    userId: new Types.ObjectId(req.user?.id),
    username: req.user?.username!,
    hasPaid: false,
    joinedAt: new Date(),
  });
  await group.save();

  // Auto-create prediction doc
  await PollaPrediction.findOneAndUpdate(
    { groupId: group._id, userId: req.user?.id },
    { groupId: group._id, userId: req.user?.id, username: req.user?.username },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(200).json({ success: true, data: group });
};

// @route  PATCH /api/polla/groups/:id/members/:userId/payment
// @desc   Toggle payment status for a member (admin only)
// @access Private (admin of the group)
export const toggleMemberPayment = async (req: Request, res: Response) => {
  const group = await PollaGroup.findById(req.params.id);
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Grupo no encontrado" });
  }

  if (group.adminId.toString() !== req.user?.id && !req.user?.isAdmin) {
    return res
      .status(403)
      .json({
        success: false,
        error: "Solo el administrador puede gestionar pagos",
      });
  }

  const member = group.members.find(
    (m) => m.userId.toString() === req.params.userId,
  );
  if (!member) {
    return res
      .status(404)
      .json({ success: false, error: "Miembro no encontrado" });
  }

  member.hasPaid = !member.hasPaid;
  member.paidAt = member.hasPaid ? new Date() : undefined;
  await group.save();

  res.status(200).json({ success: true, data: group });
};

// @route  PATCH /api/polla/groups/:id/results
// @desc   Set actual champion/top scorer for bonus calculation (admin only)
// @access Private
export const setTournamentResults = async (req: Request, res: Response) => {
  const group = await PollaGroup.findById(req.params.id);
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Grupo no encontrado" });
  }
  if (group.adminId.toString() !== req.user?.id && !req.user?.isAdmin) {
    return res
      .status(403)
      .json({
        success: false,
        error: "Solo el administrador puede actualizar resultados finales",
      });
  }

  const { actualChampion, actualTopScorer } = req.body;
  const groupAny = group as any;
  if (actualChampion !== undefined) groupAny.actualChampion = actualChampion;
  if (actualTopScorer !== undefined) groupAny.actualTopScorer = actualTopScorer;
  await group.save();

  await recalculateGroupPoints(group._id.toString());
  res.status(200).json({ success: true, data: group });
};

// ─── Matches ────────────────────────────────────────────────────────────────

// @route  GET /api/polla/groups/:id/matches
// @desc   Get all matches for a group
// @access Private (members only)
export const getMatches = async (req: Request, res: Response) => {
  const group = await PollaGroup.findById(req.params.id);
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Grupo no encontrado" });
  }
  const isMember = group.members.some(
    (m) => m.userId.toString() === req.user?.id,
  );
  if (!isMember && !req.user?.isAdmin) {
    return res
      .status(403)
      .json({ success: false, error: "No eres miembro de este grupo" });
  }

  const matches = await PollaMatch.find({ groupId: req.params.id }).sort({
    stage: 1,
    matchday: 1,
    matchDate: 1,
  });

  res.status(200).json({ success: true, count: matches.length, data: matches });
};

// @route  POST /api/polla/groups/:id/matches
// @desc   Create a match for the group (admin only)
// @access Private
export const createMatch = async (req: Request, res: Response) => {
  const group = await PollaGroup.findById(req.params.id);
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Grupo no encontrado" });
  }
  if (group.adminId.toString() !== req.user?.id && !req.user?.isAdmin) {
    return res
      .status(403)
      .json({
        success: false,
        error: "Solo el administrador puede crear partidos",
      });
  }

  const { stage, matchday, homeTeam, awayTeam, matchDate } = req.body;

  const match = await PollaMatch.create({
    groupId: group._id,
    stage,
    matchday,
    homeTeam,
    awayTeam,
    matchDate,
  });

  res.status(201).json({ success: true, data: match });
};

// @route  PATCH /api/polla/groups/:id/matches/:matchId/result
// @desc   Set the real result for a match and recalculate points (admin only)
// @access Private
export const setMatchResult = async (req: Request, res: Response) => {
  const group = await PollaGroup.findById(req.params.id);
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Grupo no encontrado" });
  }
  if (group.adminId.toString() !== req.user?.id && !req.user?.isAdmin) {
    return res
      .status(403)
      .json({
        success: false,
        error: "Solo el administrador puede cargar resultados",
      });
  }

  const match = await PollaMatch.findOne({
    _id: req.params.matchId,
    groupId: req.params.id,
  });
  if (!match) {
    return res
      .status(404)
      .json({ success: false, error: "Partido no encontrado" });
  }

  const { homeScore, awayScore } = req.body;
  if (homeScore == null || awayScore == null) {
    return res
      .status(400)
      .json({ success: false, error: "homeScore y awayScore son requeridos" });
  }

  match.homeScore = parseInt(homeScore, 10);
  match.awayScore = parseInt(awayScore, 10);
  match.status = "finished";
  match.isBettingOpen = false;
  await match.save();

  await recalculateGroupPoints(String(req.params.id));

  res.status(200).json({ success: true, data: match });
};

// ─── Predictions ────────────────────────────────────────────────────────────

// @route  GET /api/polla/groups/:id/predictions/me
// @desc   Get my prediction document for this group
// @access Private
export const getMyPredictions = async (req: Request, res: Response) => {
  const pred = await PollaPrediction.findOne({
    groupId: req.params.id,
    userId: req.user?.id,
  });
  if (!pred) {
    return res
      .status(404)
      .json({ success: false, error: "No tienes predicciones en este grupo" });
  }
  res.status(200).json({ success: true, data: pred });
};

// @route  PUT /api/polla/groups/:id/predictions/special
// @desc   Set champion & top scorer predictions (before tournament)
// @access Private
export const setSpecialPredictions = async (req: Request, res: Response) => {
  const { predictedChampion, predictedTopScorer } = req.body;

  const pred = await PollaPrediction.findOneAndUpdate(
    { groupId: req.params.id, userId: req.user?.id },
    { predictedChampion, predictedTopScorer },
    { new: true, runValidators: true },
  );
  if (!pred) {
    return res
      .status(404)
      .json({ success: false, error: "Predicción no encontrada" });
  }

  res.status(200).json({ success: true, data: pred });
};

// @route  PUT /api/polla/groups/:id/predictions/match/:matchId
// @desc   Submit or update a prediction for a specific match
// @access Private
export const upsertMatchPrediction = async (req: Request, res: Response) => {
  const { homeScore, awayScore } = req.body;
  if (homeScore == null || awayScore == null) {
    return res
      .status(400)
      .json({ success: false, error: "homeScore y awayScore son requeridos" });
  }

  const match = await PollaMatch.findOne({
    _id: req.params.matchId,
    groupId: req.params.id,
  });
  if (!match) {
    return res
      .status(404)
      .json({ success: false, error: "Partido no encontrado" });
  }
  if (!match.isBettingOpen) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Las apuestas para este partido ya están cerradas",
      });
  }

  let pred = await PollaPrediction.findOne({
    groupId: req.params.id,
    userId: req.user?.id,
  });
  if (!pred) {
    return res
      .status(404)
      .json({
        success: false,
        error: "Predicción no encontrada, únete al grupo primero",
      });
  }

  const existing = pred.matchPredictions.find(
    (mp) => mp.matchId.toString() === req.params.matchId,
  );
  if (existing) {
    existing.homeScore = parseInt(homeScore, 10);
    existing.awayScore = parseInt(awayScore, 10);
  } else {
    pred.matchPredictions.push({
      matchId: new Types.ObjectId(String(req.params.matchId)),
      homeScore: parseInt(homeScore, 10),
      awayScore: parseInt(awayScore, 10),
      pointsEarned: 0,
    });
  }

  await pred.save();
  res.status(200).json({ success: true, data: pred });
};

// @route  POST /api/polla/groups/:id/members
// @desc   Add an existing user to the group by username (admin only)
// @access Private
export const addMember = async (req: Request, res: Response) => {
  const group = await PollaGroup.findById(req.params.id);
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Grupo no encontrado" });
  }
  if (group.adminId.toString() !== req.user?.id && !req.user?.isAdmin) {
    return res
      .status(403)
      .json({
        success: false,
        error: "Solo el administrador puede agregar miembros",
      });
  }

  const { username } = req.body;
  if (!username) {
    return res
      .status(400)
      .json({ success: false, error: "El nombre de usuario es requerido" });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res
      .status(404)
      .json({ success: false, error: "Usuario no encontrado" });
  }

  const alreadyMember = group.members.some(
    (m) => m.userId.toString() === user._id.toString(),
  );
  if (alreadyMember) {
    return res
      .status(400)
      .json({
        success: false,
        error: "El usuario ya es miembro de este grupo",
      });
  }

  group.members.push({
    userId: user._id,
    username: user.username,
    hasPaid: false,
    joinedAt: new Date(),
  });
  await group.save();

  // Auto-create prediction doc for the new member
  await PollaPrediction.create({
    groupId: group._id,
    userId: user._id,
    username: user.username,
  });

  res.status(201).json({ success: true, data: group });
};

// @route  DELETE /api/polla/groups/:id/members/:userId
// @desc   Remove a member from the group (admin only, cannot remove themselves)
// @access Private
export const removeMember = async (req: Request, res: Response) => {
  const group = await PollaGroup.findById(req.params.id);
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Grupo no encontrado" });
  }
  if (group.adminId.toString() !== req.user?.id && !req.user?.isAdmin) {
    return res
      .status(403)
      .json({
        success: false,
        error: "Solo el administrador puede eliminar miembros",
      });
  }
  if (req.params.userId === group.adminId.toString()) {
    return res
      .status(400)
      .json({
        success: false,
        error: "El administrador no puede eliminarse del grupo",
      });
  }

  const memberIndex = group.members.findIndex(
    (m) => m.userId.toString() === req.params.userId,
  );
  if (memberIndex === -1) {
    return res
      .status(404)
      .json({ success: false, error: "Miembro no encontrado" });
  }

  group.members.splice(memberIndex, 1);
  await group.save();

  // Remove prediction doc too
  await PollaPrediction.deleteOne({
    groupId: group._id,
    userId: req.params.userId,
  });

  res.status(200).json({ success: true, data: group });
};

// @route  GET /api/polla/fixture/suggest
// @desc   Returns the Mundial 2026 fixture as a suggestion list
// @access Private
export const suggestFixture = async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    count: MUNDIAL_2026_FIXTURE.length,
    data: MUNDIAL_2026_FIXTURE,
  });
};

// @route  POST /api/polla/groups/:id/matches/bulk
// @desc   Bulk-create matches (from Excel upload or fixture suggestion)
// @access Private (admin only)
export const bulkCreateMatches = async (req: Request, res: Response) => {
  const group = await PollaGroup.findById(req.params.id);
  if (!group) {
    return res
      .status(404)
      .json({ success: false, error: "Grupo no encontrado" });
  }
  if (group.adminId.toString() !== req.user?.id && !req.user?.isAdmin) {
    return res
      .status(403)
      .json({
        success: false,
        error: "Solo el administrador puede crear partidos",
      });
  }

  const { matches } = req.body as {
    matches: Array<{
      stage: string;
      matchday?: number;
      homeTeam: string;
      awayTeam: string;
      matchDate?: string;
    }>;
  };

  if (!Array.isArray(matches) || matches.length === 0) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Se requiere un array de partidos no vacío",
      });
  }

  const VALID_STAGES = [
    "group",
    "round_of_16",
    "quarterfinal",
    "semifinal",
    "final",
  ];
  const docs = matches
    .filter(
      (m) =>
        m.homeTeam?.trim() &&
        m.awayTeam?.trim() &&
        VALID_STAGES.includes(m.stage),
    )
    .map((m) => ({
      groupId: group._id,
      stage: m.stage,
      matchday: m.matchday || undefined,
      homeTeam: m.homeTeam.trim(),
      awayTeam: m.awayTeam.trim(),
      matchDate: m.matchDate ? new Date(m.matchDate) : undefined,
    }));

  if (docs.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "Ningún partido válido en la lista" });
  }

  const created = await PollaMatch.insertMany(docs);

  res.status(201).json({
    success: true,
    count: created.length,
    data: created,
  });
};
