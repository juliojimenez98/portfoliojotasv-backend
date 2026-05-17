import { Request, Response } from "express";
import SpendPeriod from "../models/SpendPeriod";
import Transaction from "../models/Transaction";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a snapshot of all transactions that fall within [startDate, endDate].
 */
async function buildSnapshot(userId: string, startDate: Date, endDate: Date) {
  const txns = await Transaction.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const snap = {
    totalExpenses: 0,
    totalIncome: 0,
    totalTransfers: 0,
    netSavings: 0,
    transactionCount: txns.length,
    topCategories: [] as { category: string; amount: number; count: number }[],
  };

  const catMap: Record<string, { amount: number; count: number }> = {};

  for (const t of txns) {
    if (t.type === "expense") {
      snap.totalExpenses += t.amount;
      if (!catMap[t.category]) catMap[t.category] = { amount: 0, count: 0 };
      catMap[t.category].amount += t.amount;
      catMap[t.category].count += 1;
    } else if (t.type === "income") {
      snap.totalIncome += t.amount;
    } else if (t.type === "transfer") {
      snap.totalTransfers += t.amount;
    }
  }

  snap.netSavings = snap.totalIncome - snap.totalExpenses;
  snap.topCategories = Object.entries(catMap)
    .map(([category, d]) => ({ category, amount: d.amount, count: d.count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return snap;
}

// ── endpoints ─────────────────────────────────────────────────────────────────

// GET /api/periods — list all periods (history + active)
export const getPeriods = async (req: Request, res: Response) => {
  const periods = await SpendPeriod.find({ userId: req.user?.id })
    .sort({ startDate: -1 })
    .lean();
  res.status(200).json({ success: true, data: periods });
};

// GET /api/periods/active — get the single active period (or null)
export const getActivePeriod = async (req: Request, res: Response) => {
  const period = await SpendPeriod.findOne({
    userId: req.user?.id,
    status: "active",
  }).lean();
  res.status(200).json({ success: true, data: period ?? null });
};

// POST /api/periods/start — open a new period (closes the previous active one if any)
export const startPeriod = async (req: Request, res: Response) => {
  const { label, startDate, notes } = req.body;

  const start = startDate ? new Date(startDate) : new Date();

  // Close any currently active period first
  const existing = await SpendPeriod.findOne({
    userId: req.user?.id,
    status: "active",
  });
  if (existing) {
    const endDate = new Date(start.getTime() - 1); // 1 ms before new period
    const snapshot = await buildSnapshot(
      String(req.user?.id),
      existing.startDate,
      endDate,
    );
    existing.status = "closed";
    existing.endDate = endDate;
    existing.snapshot = snapshot;
    await existing.save();
  }

  const autoLabel =
    label?.trim() ||
    start
      .toLocaleDateString("es-CL", { month: "long", year: "numeric" })
      .replace(/^\w/, (c) => c.toUpperCase());

  const period = await SpendPeriod.create({
    userId: req.user?.id,
    label: autoLabel,
    startDate: start,
    status: "active",
    notes: notes?.trim() || undefined,
  });

  res.status(201).json({ success: true, data: period });
};

// POST /api/periods/:id/close — manually close a specific period
export const closePeriod = async (req: Request, res: Response) => {
  const period = await SpendPeriod.findOne({
    _id: req.params.id,
    userId: req.user?.id,
  });
  if (!period) {
    return res
      .status(404)
      .json({ success: false, error: "Período no encontrado" });
  }
  if (period.status === "closed") {
    return res
      .status(400)
      .json({ success: false, error: "El período ya está cerrado" });
  }

  const endDate = new Date();
  const snapshot = await buildSnapshot(
    String(req.user?.id),
    period.startDate,
    endDate,
  );

  period.status = "closed";
  period.endDate = endDate;
  period.snapshot = snapshot;
  await period.save();

  res.status(200).json({ success: true, data: period });
};

// DELETE /api/periods/:id — delete a closed period from history
export const deletePeriod = async (req: Request, res: Response) => {
  const period = await SpendPeriod.findOne({
    _id: req.params.id,
    userId: req.user?.id,
  });
  if (!period) {
    return res
      .status(404)
      .json({ success: false, error: "Período no encontrado" });
  }
  if (period.status === "active") {
    return res
      .status(400)
      .json({
        success: false,
        error: "No se puede eliminar el período activo",
      });
  }
  await period.deleteOne();
  res.status(200).json({ success: true, data: {} });
};
