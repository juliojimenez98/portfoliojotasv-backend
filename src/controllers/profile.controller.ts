import { Request, Response } from "express";
import User from "../models/User";

// @route   GET /api/profile/payday
// @desc    Get current user's payday config
// @access  Private
export const getPaydayConfig = async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.id).select("paydayConfig");
  if (!user)
    return res.status(404).json({ success: false, error: "User not found" });
  res.status(200).json({ success: true, data: user.paydayConfig ?? null });
};

// @route   PUT /api/profile/payday
// @desc    Save / update current user's payday config
// @access  Private
export const savePaydayConfig = async (req: Request, res: Response) => {
  const {
    type,
    fixedDay,
    businessDaysBefore,
    customText,
    accountId,
    amount,
    currency,
    label,
  } = req.body;

  const VALID_TYPES = [
    "fixed_day",
    "last_day",
    "last_business_day",
    "business_days_before_end",
    "first_day",
    "first_business_day",
    "custom_text",
  ];

  if (!type || !VALID_TYPES.includes(type)) {
    return res
      .status(400)
      .json({ success: false, error: "Tipo de día de pago inválido" });
  }
  if (type === "fixed_day" && (!fixedDay || fixedDay < 1 || fixedDay > 31)) {
    return res
      .status(400)
      .json({ success: false, error: "Día fijo debe ser entre 1 y 31" });
  }
  if (
    type === "business_days_before_end" &&
    (!businessDaysBefore || businessDaysBefore < 1)
  ) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Días hábiles antes del fin deben ser al menos 1",
      });
  }

  const config: any = { type, currency: currency || "CLP" };
  if (fixedDay) config.fixedDay = fixedDay;
  if (businessDaysBefore) config.businessDaysBefore = businessDaysBefore;
  if (customText) config.customText = customText;
  if (accountId) config.accountId = accountId;
  if (amount !== undefined && amount >= 0) config.amount = amount;
  if (label) config.label = label;

  const user = await User.findByIdAndUpdate(
    req.user?.id,
    { paydayConfig: config },
    { new: true, runValidators: true },
  ).select("paydayConfig");

  if (!user)
    return res.status(404).json({ success: false, error: "User not found" });

  res.status(200).json({ success: true, data: user.paydayConfig });
};

// @route   DELETE /api/profile/payday
// @desc    Remove current user's payday config
// @access  Private
export const deletePaydayConfig = async (req: Request, res: Response) => {
  await User.findByIdAndUpdate(req.user?.id, { $unset: { paydayConfig: "" } });
  res.status(200).json({ success: true, data: null });
};
