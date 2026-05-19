import { Request, Response } from "express";
import Transaction from "../models/Transaction";
import Account from "../models/Account";
import Category from "../models/Category";
import { convertToCLP } from "../services/currency.service";
import { TRANSACTION_CATEGORIES } from "../types/transaction";

// @route   GET /api/transactions
// @desc    Get all transactions (with optional filters)
// @access  Private
export const getTransactions = async (req: Request, res: Response) => {
  const { type, accountId } = req.query;
  const filter: any = { userId: req.user?.id };

  if (type) filter.type = type;
  if (accountId) filter.accountId = accountId;

  const transactions = await Transaction.find(filter).sort({ date: -1 });
  res
    .status(200)
    .json({ success: true, count: transactions.length, data: transactions });
};

// @route   POST /api/transactions
// @desc    Create new transaction
// @access  Private
export const createTransaction = async (req: Request, res: Response) => {
  // Verify account belongs to user
  const account = await Account.findOne({
    _id: req.body.accountId,
    userId: req.user?.id,
  });
  if (!account) {
    return res
      .status(404)
      .json({
        success: false,
        error: "Account not found or belongs to another user",
      });
  }

  let { amount, originalCurrency, originalAmount, exchangeRate, ...rest } =
    req.body;

  originalCurrency = (originalCurrency || "CLP").toUpperCase();
  originalAmount = parseFloat(originalAmount) || parseFloat(amount);

  if (!originalAmount || originalAmount <= 0) {
    return res
      .status(400)
      .json({ success: false, error: "El monto debe ser mayor a 0" });
  }

  let finalAmountCLP = 0;
  let finalExchangeRate = parseFloat(exchangeRate) || 1;

  if (originalCurrency === "CLP") {
    finalAmountCLP = Math.round(originalAmount);
    finalExchangeRate = 1;
  } else {
    // If exchangeRate was provided manually by frontend override, use it. Otherwise fetch from service.
    if (!req.body.exchangeRate) {
      const conv = await convertToCLP(originalAmount, originalCurrency);
      finalAmountCLP = conv.amountCLP;
      finalExchangeRate = conv.exchangeRate;
    } else {
      finalAmountCLP = Math.round(originalAmount * finalExchangeRate);
    }
  }

  const transactionData = {
    ...rest,
    userId: req.user?.id,
    accountId: account._id,
    originalCurrency,
    originalAmount,
    exchangeRate: finalExchangeRate,
    amount: finalAmountCLP,
  };

  const transaction = await Transaction.create(transactionData);

  // Update account balance (double-round to guard against any existing DB drift)
  const amountChange =
    transaction.type === "income" ? transaction.amount : -transaction.amount;
  account.balance = Math.round(Math.round(account.balance) + amountChange);
  await account.save();

  res.status(201).json({ success: true, data: transaction });
};

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
export const deleteTransaction = async (req: Request, res: Response) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user?.id,
  });
  if (!transaction) {
    return res
      .status(404)
      .json({ success: false, error: "Transaction not found" });
  }

  // Revert account balance
  const account = await Account.findById(transaction.accountId);
  if (account) {
    if (transaction.type === "transfer") {
      const isOutgoing = transaction.notes?.startsWith("Transferencia a");
      account.balance = Math.round(
        Math.round(account.balance) +
          (isOutgoing ? transaction.amount : -transaction.amount),
      );
    } else {
      const amountReversal =
        transaction.type === "income"
          ? -transaction.amount
          : transaction.amount;
      account.balance = Math.round(Math.round(account.balance) + amountReversal);
    }
    await account.save();
  }

  // If this is part of a transfer, also delete and revert the linked transaction
  if (transaction.linkedTransactionId) {
    const linked = await Transaction.findById(transaction.linkedTransactionId);
    if (linked) {
      const linkedAccount = await Account.findById(linked.accountId);
      if (linkedAccount) {
        if (linked.type === "transfer") {
          const isLinkedOutgoing = linked.notes?.startsWith("Transferencia a");
          linkedAccount.balance = Math.round(
            Math.round(linkedAccount.balance) +
              (isLinkedOutgoing ? linked.amount : -linked.amount),
          );
        } else {
          const linkedReversal =
            linked.type === "income" ? -linked.amount : linked.amount;
          linkedAccount.balance = Math.round(
            Math.round(linkedAccount.balance) + linkedReversal,
          );
        }
        await linkedAccount.save();
      }
      await linked.deleteOne();
    }
  }

  await transaction.deleteOne();

  res.status(200).json({ success: true, data: {} });
};

// @route   GET /api/transactions/categories
// @desc    Get all transaction categories (default + user custom)
// @access  Private
export const getTransactionCategories = async (req: Request, res: Response) => {
  let categories = await Category.find({ userId: req.user?.id }).sort({
    createdAt: 1,
  });

  // If user has no categories, seed the default ones
  if (categories.length === 0) {
    const defaultCats = TRANSACTION_CATEGORIES.map((c) => ({
      userId: req.user?.id,
      value: c.value,
      label: c.label,
      icon: c.icon,
      isDefault: true,
    }));
    categories = (await Category.insertMany(defaultCats)) as any;
  }

  // Also check if there are any old custom categories in Transaction collection not in Category collection
  const distinctTxnCats = await Transaction.distinct("category", {
    userId: req.user?.id,
  });
  const existingValues = new Set(categories.map((c) => c.value));

  for (const catValue of distinctTxnCats) {
    if (!existingValues.has(catValue)) {
      // Create a Category entry for this legacy custom category
      const newCat = await Category.create({
        userId: req.user?.id,
        value: catValue,
        label: catValue.charAt(0).toUpperCase() + catValue.slice(1),
        icon: "📁",
        isDefault: false,
      });
      categories.push(newCat);
      existingValues.add(catValue);
    }
  }

  res
    .status(200)
    .json({ success: true, count: categories.length, data: categories });
};

// @route   POST /api/transactions/categories
// @desc    Create new category
// @access  Private
export const createCategory = async (req: Request, res: Response) => {
  const { label, icon } = req.body;

  if (!label || !label.trim()) {
    return res
      .status(400)
      .json({
        success: false,
        error: "El nombre de la categoría es requerido",
      });
  }

  const value = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (!value) {
    return res
      .status(400)
      .json({ success: false, error: "Nombre de categoría inválido" });
  }

  // Check if value already exists for user
  const existing = await Category.findOne({ userId: req.user?.id, value });
  if (existing) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Ya existe una categoría con ese nombre",
      });
  }

  const category = await Category.create({
    userId: req.user?.id,
    value,
    label: label.trim(),
    icon: icon ? icon.trim() : "📁",
    isDefault: false,
  });

  res.status(201).json({ success: true, data: category });
};

// @route   PUT /api/transactions/categories/:id
// @desc    Update category
// @access  Private
export const updateCategory = async (req: Request, res: Response) => {
  const { label, icon } = req.body;
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user?.id,
  });

  if (!category) {
    return res
      .status(404)
      .json({ success: false, error: "Categoría no encontrada" });
  }

  if (label && label.trim()) {
    category.label = label.trim();
  }
  if (icon && icon.trim()) {
    category.icon = icon.trim();
  }

  await category.save();

  res.status(200).json({ success: true, data: category });
};

// @route   DELETE /api/transactions/categories/:id
// @desc    Delete category
// @access  Private
export const deleteCategory = async (req: Request, res: Response) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user?.id,
  });

  if (!category) {
    return res
      .status(404)
      .json({ success: false, error: "Categoría no encontrada" });
  }

  if (category.isDefault) {
    return res
      .status(400)
      .json({
        success: false,
        error:
          "No se pueden eliminar las categorías predeterminadas del sistema",
      });
  }

  await category.deleteOne();

  res.status(200).json({ success: true, data: {} });
};

// @route   PUT /api/transactions/:id
// @desc    Update a transaction (adjusts account balances accordingly)
// @access  Private
export const updateTransaction = async (req: Request, res: Response) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user?.id,
  });
  if (!transaction) {
    return res
      .status(404)
      .json({ success: false, error: "Transaction not found" });
  }

  // Transfers are not editable via this endpoint
  if (transaction.type === "transfer") {
    return res
      .status(400)
      .json({
        success: false,
        error: "Las transferencias no se pueden editar directamente",
      });
  }

  const oldAccountId = transaction.accountId.toString();
  const oldAmount = transaction.amount;
  const oldType = transaction.type;

  let {
    amount,
    originalCurrency,
    originalAmount,
    exchangeRate,
    accountId: newAccountId,
    ...rest
  } = req.body;

  originalCurrency = (originalCurrency || "CLP").toUpperCase();
  originalAmount = parseFloat(originalAmount) || parseFloat(amount);

  if (!originalAmount || originalAmount <= 0) {
    return res
      .status(400)
      .json({ success: false, error: "El monto debe ser mayor a 0" });
  }

  let finalAmountCLP = 0;
  let finalExchangeRate = parseFloat(exchangeRate) || 1;

  if (originalCurrency === "CLP") {
    finalAmountCLP = Math.round(originalAmount);
    finalExchangeRate = 1;
  } else {
    if (!req.body.exchangeRate) {
      const conv = await convertToCLP(originalAmount, originalCurrency);
      finalAmountCLP = conv.amountCLP;
      finalExchangeRate = conv.exchangeRate;
    } else {
      finalAmountCLP = Math.round(originalAmount * finalExchangeRate);
    }
  }

  const resolvedAccountId = newAccountId || oldAccountId;

  // Verify the new account belongs to the user
  const newAccount = await Account.findOne({
    _id: resolvedAccountId,
    userId: req.user?.id,
  });
  if (!newAccount) {
    return res.status(404).json({ success: false, error: "Account not found" });
  }

  // ── Revert old balance ──────────────────────────────────────────────────
  const oldAccount =
    resolvedAccountId !== oldAccountId
      ? await Account.findOne({ _id: oldAccountId, userId: req.user?.id })
      : newAccount;

  if (oldAccount) {
    // Undo the old transaction effect on the old account
    const oldReversal = oldType === "income" ? -oldAmount : oldAmount;
    oldAccount.balance = Math.round(Math.round(oldAccount.balance) + oldReversal);
    await oldAccount.save();
  }

  // ── Apply new balance ───────────────────────────────────────────────────
  const newType = rest.type || oldType;
  const newChange = newType === "income" ? finalAmountCLP : -finalAmountCLP;

  // If account changed, newAccount is already the fresh doc; otherwise it's the same as oldAccount (already reverted)
  newAccount.balance = Math.round(Math.round(newAccount.balance) + newChange);
  await newAccount.save();

  // ── Update the transaction ──────────────────────────────────────────────
  const updated = await Transaction.findByIdAndUpdate(
    transaction._id,
    {
      ...rest,
      accountId: resolvedAccountId,
      originalCurrency,
      originalAmount,
      exchangeRate: finalExchangeRate,
      amount: finalAmountCLP,
    },
    { new: true, runValidators: true },
  );

  res.status(200).json({ success: true, data: updated });
};
