import { Request, Response } from "express";
import mongoose from "mongoose";
import PollaGroup from "../models/PollaGroup";
import PollaMatch from "../models/PollaMatch";
import PollaPrediction from "../models/PollaPrediction";
import User from "../models/User";
import { MUNDIAL_2026_FIXTURE } from "../data/mundial2026Fixture";

async function recalculateGroupPoints(groupId: string) {
  const group = await PollaGroup.findById(groupId);
  if (!group) return;
  const matches = await PollaMatch.find({ groupId, status: "finished" });
  const predictions = await PollaPrediction.find({ groupId });
  const sc = group.scoringConfig;
  for (const pred of predictions) {
    let total = 0;
    let championBonus = false;
    let topScorerBonus = false;
    for (const mp of pred.matchPredictions) {
      const match = matches.find((m) => String(m._id) === String(mp.matchId));
      if (!match || match.homeScore == null || match.awayScore == null) { mp.pointsEarned = 0; continue; }
      if (mp.homeScore === match.homeScore && mp.awayScore === match.awayScore) {
        mp.pointsEarned = sc.exactScore;
      } else {
        const rt = match.homeScore > match.awayScore ? 1 : match.homeScore < match.awayScore ? -1 : 0;
        const pt = mp.homeScore > mp.awayScore ? 1 : mp.homeScore < mp.awayScore ? -1 : 0;
        mp.pointsEarned = rt === pt ? sc.correctTrend : 0;
      }
      total += mp.pointsEarned;
    }
    if (group.actualChampion && pred.predictedChampion && pred.predictedChampion.toLowerCase() === group.actualChampion.toLowerCase()) { total += sc.championBonus; championBonus = true; }
    if (group.actualTopScorer && pred.predictedTopScorer && pred.predictedTopScorer.toLowerCase() === group.actualTopScorer.toLowerCase()) { total += sc.topScorerBonus; topScorerBonus = true; }
    pred.totalPoints = total;
    pred.championBonusEarned = championBonus;
    pred.topScorerBonusEarned = topScorerBonus;
    await pred.save();
  }
}

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name, description, entryFee, currency, tournamentName, scoringConfig } = req.body;
    const adminId = (req as any).user._id;
    const username = (req as any).user.username;
    const group = await PollaGroup.create({ name, description, adminId, entryFee: entryFee || 0, currency: currency || "CLP", tournamentName: tournamentName || "Mundial 2026", scoringConfig, members: [{ userId: adminId, username, hasPaid: true, joinedAt: new Date() }] });
    await PollaPrediction.create({ groupId: group._id, userId: adminId, username });
    res.status(201).json({ success: true, data: group });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const getMyGroups = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const groups = await PollaGroup.find({ "members.userId": userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: groups });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
};

export const getGroup = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const userId = (req as any).user._id;
    const group = await PollaGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Grupo no encontrado" });
    const isMember = group.members.some((m) => String(m.userId) === String(userId));
    if (!isMember) return res.status(403).json({ success: false, message: "No eres miembro de este grupo" });
    const totalPot = group.members.filter((m) => m.hasPaid).length * group.entryFee;
    const paidCount = group.members.filter((m) => m.hasPaid).length;
    const predictions = await PollaPrediction.find({ groupId }).sort({ totalPoints: -1 });
    const leaderboard = predictions.map((p, i) => ({ rank: i + 1, userId: p.userId, username: p.username, totalPoints: p.totalPoints, championBonusEarned: p.championBonusEarned, topScorerBonusEarned: p.topScorerBonusEarned, hasPaid: group.members.find((m) => String(m.userId) === String(p.userId))?.hasPaid ?? false }));
    res.json({ success: true, data: { group, finance: { totalPot, paidCount, totalMembers: group.members.length, entryFee: group.entryFee, currency: group.currency }, leaderboard } });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
};

export const joinGroup = async (req: Request, res: Response) => {
  try {
    const { inviteCode } = req.body;
    const userId = (req as any).user._id;
    const username = (req as any).user.username;
    const group = await PollaGroup.findOne({ inviteCode: inviteCode?.toUpperCase() });
    if (!group) return res.status(404).json({ success: false, message: "Código de invitación inválido" });
    if (group.members.some((m) => String(m.userId) === String(userId))) return res.status(400).json({ success: false, message: "Ya eres miembro de este grupo" });
    group.members.push({ userId, username, hasPaid: false, joinedAt: new Date() });
    await group.save();
    await PollaPrediction.findOneAndUpdate({ groupId: group._id, userId }, { $setOnInsert: { groupId: group._id, userId, username } }, { upsert: true, new: true });
    res.json({ success: true, data: group });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const toggleMemberPayment = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const targetUserId = String(req.params.userId);
    const requesterId = String((req as any).user._id);
    const group = await PollaGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Grupo no encontrado" });
    if (String(group.adminId) !== requesterId) return res.status(403).json({ success: false, message: "Solo el admin puede modificar pagos" });
    const member = group.members.find((m) => String(m.userId) === targetUserId);
    if (!member) return res.status(404).json({ success: false, message: "Miembro no encontrado" });
    member.hasPaid = !member.hasPaid;
    member.paidAt = member.hasPaid ? new Date() : undefined;
    await group.save();
    res.json({ success: true, data: group });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const addMember = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const requesterId = String((req as any).user._id);
    const { username } = req.body;
    const group = await PollaGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Grupo no encontrado" });
    if (String(group.adminId) !== requesterId) return res.status(403).json({ success: false, message: "Solo el admin puede agregar miembros" });
    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ success: false, message: `Usuario "${username}" no encontrado` });
    if (group.members.some((m) => String(m.userId) === String(targetUser._id))) return res.status(400).json({ success: false, message: "El usuario ya es miembro" });
    group.members.push({ userId: targetUser._id as mongoose.Types.ObjectId, username: targetUser.username, hasPaid: false, joinedAt: new Date() });
    await group.save();
    await PollaPrediction.findOneAndUpdate({ groupId, userId: targetUser._id }, { $setOnInsert: { groupId, userId: targetUser._id, username: targetUser.username } }, { upsert: true, new: true });
    res.json({ success: true, data: group });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const targetUserId = String(req.params.userId);
    const requesterId = String((req as any).user._id);
    const group = await PollaGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Grupo no encontrado" });
    if (String(group.adminId) !== requesterId) return res.status(403).json({ success: false, message: "Solo el admin puede eliminar miembros" });
    if (targetUserId === requesterId) return res.status(400).json({ success: false, message: "El admin no puede eliminarse a sí mismo" });
    group.members.pull({ userId: targetUserId } as any);
    await group.save();
    await PollaPrediction.deleteOne({ groupId, userId: targetUserId });
    res.json({ success: true, data: group });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const setTournamentResults = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const requesterId = String((req as any).user._id);
    const { actualChampion, actualTopScorer } = req.body;
    const group = await PollaGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Grupo no encontrado" });
    if (String(group.adminId) !== requesterId) return res.status(403).json({ success: false, message: "Solo el admin puede establecer resultados" });
    if (actualChampion !== undefined) group.actualChampion = actualChampion;
    if (actualTopScorer !== undefined) group.actualTopScorer = actualTopScorer;
    await group.save();
    await recalculateGroupPoints(groupId);
    res.json({ success: true, data: group });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const getMatches = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const matches = await PollaMatch.find({ groupId }).sort({ matchDate: 1, createdAt: 1 });
    res.json({ success: true, data: matches });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
};

export const createMatch = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const requesterId = String((req as any).user._id);
    const group = await PollaGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Grupo no encontrado" });
    if (String(group.adminId) !== requesterId) return res.status(403).json({ success: false, message: "Solo el admin puede crear partidos" });
    const { stage, matchday, homeTeam, awayTeam, matchDate, venue } = req.body;
    const match = await PollaMatch.create({ groupId, stage, matchday, homeTeam, awayTeam, matchDate, venue });
    res.status(201).json({ success: true, data: match });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const bulkCreateMatches = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const requesterId = String((req as any).user._id);
    const group = await PollaGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Grupo no encontrado" });
    if (String(group.adminId) !== requesterId) return res.status(403).json({ success: false, message: "Solo el admin puede importar partidos" });
    const { matches } = req.body;
    if (!Array.isArray(matches) || matches.length === 0) return res.status(400).json({ success: false, message: "No se enviaron partidos" });
    const docs = matches.map((m: any) => ({ groupId, stage: m.stage, matchday: m.matchday, homeTeam: m.homeTeam, awayTeam: m.awayTeam, matchDate: m.matchDate ? new Date(m.matchDate) : undefined, venue: m.venue }));
    const created = await PollaMatch.insertMany(docs);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const setMatchResult = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const matchId = String(req.params.matchId);
    const requesterId = String((req as any).user._id);
    const group = await PollaGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Grupo no encontrado" });
    if (String(group.adminId) !== requesterId) return res.status(403).json({ success: false, message: "Solo el admin puede cargar resultados" });
    const match = await PollaMatch.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: "Partido no encontrado" });
    match.homeScore = req.body.homeScore;
    match.awayScore = req.body.awayScore;
    match.status = "finished";
    match.isBettingOpen = false;
    await match.save();
    await recalculateGroupPoints(groupId);
    res.json({ success: true, data: match });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const suggestFixture = async (_req: Request, res: Response) => {
  res.json({ success: true, data: MUNDIAL_2026_FIXTURE });
};

export const getMyPredictions = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const userId = (req as any).user._id;
    const prediction = await PollaPrediction.findOne({ groupId, userId });
    res.json({ success: true, data: prediction });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
};

export const setSpecialPredictions = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const userId = (req as any).user._id;
    const { predictedChampion, predictedTopScorer } = req.body;
    const prediction = await PollaPrediction.findOneAndUpdate({ groupId, userId }, { predictedChampion, predictedTopScorer }, { new: true });
    if (!prediction) return res.status(404).json({ success: false, message: "Predicción no encontrada" });
    res.json({ success: true, data: prediction });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};

export const upsertMatchPrediction = async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    const matchId = String(req.params.matchId);
    const userId = (req as any).user._id;
    const { homeScore, awayScore } = req.body;
    const match = await PollaMatch.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: "Partido no encontrado" });
    if (!match.isBettingOpen) return res.status(400).json({ success: false, message: "Las apuestas están cerradas para este partido" });
    const prediction = await PollaPrediction.findOne({ groupId, userId });
    if (!prediction) return res.status(404).json({ success: false, message: "Predicción no encontrada" });
    const existing = prediction.matchPredictions.find((mp) => String(mp.matchId) === matchId);
    if (existing) { existing.homeScore = homeScore; existing.awayScore = awayScore; }
    else { prediction.matchPredictions.push({ matchId: new mongoose.Types.ObjectId(matchId), homeScore, awayScore, pointsEarned: 0 }); }
    await prediction.save();
    res.json({ success: true, data: prediction });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
};
