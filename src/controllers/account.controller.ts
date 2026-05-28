import { Request, Response } from "express";
import Account from "../models/Account";
import Transaction from "../models/Transaction";

// @route   GET /api/accounts
// @desc    Get all accounts for the current user
// @access  Private (gastos app)
export const getAccounts = async (req: Request, res: Response) => {
  const accounts = await Account.find({ userId: req.user?.id }).sort({
    name: 1,
  });
  res
    .status(200)
    .json({ success: true, count: accounts.length, data: accounts });
};

// @route   GET /api/accounts/:id
// @desc    Get single account
// @access  Private (gastos app)
export const getAccount = async (req: Request, res: Response) => {
  const account = await Account.findOne({
    _id: req.params.id,
    userId: req.user?.id,
  });
  if (!account)
    return res.status(404).json({ success: false, error: "Account not found" });
  res.status(200).json({ success: true, data: account });
};

// @route   POST /api/accounts
// @desc    Create new account
// @access  Private (gastos app)
export const createAccount = async (req: Request, res: Response) => {
  req.body.userId = req.user?.id;
  const account = await Account.create(req.body);
  res.status(201).json({ success: true, data: account });
};

// @route   PUT /api/accounts/:id
// @desc    Update account
// @access  Private (gastos app)
export const updateAccount = async (req: Request, res: Response) => {
  const account = await Account.findOneAndUpdate(
    { _id: req.params.id, userId: req.user?.id },
    req.body,
    { new: true, runValidators: true },
  );
  if (!account)
    return res.status(404).json({ success: false, error: "Account not found" });
  res.status(200).json({ success: true, data: account });
};

// @route   DELETE /api/accounts/:id
// @desc    Delete account
// @access  Private (gastos app)
export const deleteAccount = async (req: Request, res: Response) => {
  const account = await Account.findOneAndDelete({
    _id: req.params.id,
    userId: req.user?.id,
  });
  if (!account)
    return res.status(404).json({ success: false, error: "Account not found" });
  res.status(200).json({ success: true, data: {} });
};

// @route   POST /api/accounts/:id/deposit
// @desc    Deposit money into an account (or restore international credit quota)
// @access  Private (gastos app)
//
// Body:
//   amount          – CLP amount to add to balance (regular credit payment)
//   description     – optional label
//   internationalAmountUSD – if present, restore this many USD to internationalBalance
//   exchangeRate    – CLP per 1 USD paid (required when internationalAmountUSD is set)
export const depositToAccount = async (req: Request, res: Response) => {
  const { amount, description, internationalAmountUSD, exchangeRate, fromAccountId } =
    req.body;

  // internationalAmountUSD path: paying off international quota
  if (internationalAmountUSD != null) {
    if (internationalAmountUSD <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "El monto USD debe ser mayor a 0" });
    }
    const amountCLP = amount != null ? Math.round(amount) : (exchangeRate ? Math.round(internationalAmountUSD * exchangeRate) : 0);
    if (amountCLP <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "El monto en CLP debe ser mayor a 0" });
    }
    const finalExchangeRate = exchangeRate || (internationalAmountUSD > 0 ? amountCLP / internationalAmountUSD : 0);
    if (finalExchangeRate <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "La tasa de cambio o el monto en CLP es requerido" });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user?.id,
    });
    if (!account)
      return res
        .status(404)
        .json({ success: false, error: "Account not found" });

    if (account.type !== "credit_card") {
      return res.status(400).json({
        success: false,
        error: "El cupo internacional solo se aplica a tarjetas de crédito",
      });
    }

    let fromAccount = null;
    if (fromAccountId) {
      fromAccount = await Account.findOne({
        _id: fromAccountId,
        userId: req.user?.id,
      });
      if (!fromAccount) {
        return res.status(404).json({ success: false, error: "Cuenta de origen no encontrada" });
      }
    }

    const balanceBefore = Math.round(account.balance);
    const intlBalanceBefore = account.internationalBalance ?? 0;

    // Restore international quota
    const newIntlBalance = Math.min(
      account.internationalCreditLimit ?? 0,
      intlBalanceBefore + internationalAmountUSD,
    );
    account.internationalBalance = newIntlBalance;

    // Also restore main CLP balance by the equivalent CLP amount
    account.balance = Math.round(account.balance + amountCLP);
    await account.save();

    if (fromAccount) {
      const balanceBeforeFrom = Math.round(fromAccount.balance);
      fromAccount.balance = Math.round(fromAccount.balance - amountCLP);
      await fromAccount.save();

      // Create transaction for source account (recorded as transfer to prevent double counting expenses)
      await Transaction.create({
        accountId: fromAccount._id,
        userId: req.user?.id,
        description: description || `Pago cupo internacional tarjeta ${account.name}`,
        amount: amountCLP,
        originalAmount: internationalAmountUSD,
        originalCurrency: "USD",
        exchangeRate: finalExchangeRate,
        type: "transfer",
        category: "transfer",
        date: new Date(),
        notes: `Pago de cupo internacional a tarjeta "${account.name}"`,
        balanceBefore: balanceBeforeFrom,
      });
    }

    await Transaction.create({
      accountId: account._id,
      userId: req.user?.id,
      description: description || `Pago cupo internacional`,
      amount: amountCLP,
      originalAmount: internationalAmountUSD,
      originalCurrency: "USD",
      exchangeRate: finalExchangeRate,
      type: fromAccount ? "transfer" : "income",
      category: fromAccount ? "transfer" : "other",
      date: new Date(),
      notes: `Pago de $${internationalAmountUSD} USD a cupo internacional (1 USD = ${finalExchangeRate.toLocaleString("es-CL")} CLP)${fromAccount ? ` desde ${fromAccount.name}` : ""}`,
      balanceBefore,
    });

    return res.status(200).json({ success: true, data: account });
  }

  // Regular deposit path
  if (!amount || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, error: "Amount must be greater than 0" });
  }

  const account = await Account.findOne({
    _id: req.params.id,
    userId: req.user?.id,
  });
  if (!account)
    return res.status(404).json({ success: false, error: "Account not found" });

  // Only allow credit cards to receive abonos, unless it's a salary deposit
  const isSalary = description && typeof description === "string" && description.toLowerCase().includes("sueldo");
  if (account.type !== "credit_card" && !isSalary) {
    return res.status(400).json({
      success: false,
      error: "Solo se puede abonar a tarjetas de crédito. Para otras cuentas, utiliza transferencias.",
    });
  }

  let fromAccount = null;
  if (fromAccountId) {
    fromAccount = await Account.findOne({
      _id: fromAccountId,
      userId: req.user?.id,
    });
    if (!fromAccount) {
      return res.status(404).json({ success: false, error: "Cuenta de origen no encontrada" });
    }
  }

  // Update balance
  const balanceBeforeDeposit = Math.round(account.balance);
  account.balance = Math.round(Math.round(account.balance) + amount);
  await account.save();

  if (fromAccount) {
    const balanceBeforeFrom = Math.round(fromAccount.balance);
    fromAccount.balance = Math.round(fromAccount.balance - amount);
    await fromAccount.save();

    // Create transaction for source account (recorded as transfer to prevent double counting expenses)
    await Transaction.create({
      accountId: fromAccount._id,
      userId: req.user?.id,
      description: description || `Pago tarjeta de crédito ${account.name}`,
      amount,
      type: "transfer",
      category: "transfer",
      date: new Date(),
      notes: `Pago de tarjeta de crédito "${account.name}"`,
      balanceBefore: balanceBeforeFrom,
    });
  }

  // Create a transaction record for the deposit
  await Transaction.create({
    accountId: account._id,
    userId: req.user?.id,
    description: description || "Depósito",
    amount,
    type: fromAccount ? "transfer" : "income",
    category: fromAccount ? "transfer" : "other",
    date: new Date(),
    notes: fromAccount 
      ? `Abono desde cuenta "${fromAccount.name}"` 
      : `Abono a cuenta "${account.name}"`,
    balanceBefore: balanceBeforeDeposit,
  });

  res.status(200).json({ success: true, data: account });
};

// @route   POST /api/accounts/transfer
// @desc    Transfer money between accounts
// @access  Private (gastos app)
export const transferBetweenAccounts = async (req: Request, res: Response) => {
  const { fromAccountId, toAccountId, amount, description } = req.body;

  if (!fromAccountId || !toAccountId) {
    return res.status(400).json({
      success: false,
      error: "Both source and destination accounts are required",
    });
  }
  if (fromAccountId === toAccountId) {
    return res
      .status(400)
      .json({ success: false, error: "Cannot transfer to the same account" });
  }
  if (!amount || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, error: "Amount must be greater than 0" });
  }

  const fromAccount = await Account.findOne({
    _id: fromAccountId,
    userId: req.user?.id,
  });
  const toAccount = await Account.findOne({
    _id: toAccountId,
    userId: req.user?.id,
  });

  if (!fromAccount)
    return res
      .status(404)
      .json({ success: false, error: "Source account not found" });
  if (!toAccount)
    return res
      .status(404)
      .json({ success: false, error: "Destination account not found" });

  if (toAccount.type === "credit_card") {
    return res.status(400).json({
      success: false,
      error: "No se puede transferir a una tarjeta de crédito. Utiliza la función de abonar.",
    });
  }

  // Execute transfer (no balance check — credit cards can be negative)
  const balanceBeforeFrom = Math.round(fromAccount.balance);
  const balanceBeforeTo = Math.round(toAccount.balance);
  fromAccount.balance = Math.round(Math.round(fromAccount.balance) - amount);
  toAccount.balance = Math.round(Math.round(toAccount.balance) + amount);

  await fromAccount.save();
  await toAccount.save();

  const transferDesc =
    description ||
    `Transferencia de "${fromAccount.name}" a "${toAccount.name}"`;

  // Record outgoing transaction
  const outgoing = await Transaction.create({
    accountId: fromAccount._id,
    userId: req.user?.id,
    description: transferDesc,
    amount,
    originalAmount: amount,
    originalCurrency: "CLP",
    exchangeRate: 1,
    type: "transfer",
    category: "transfer",
    date: new Date(),
    notes: `Transferencia a "${toAccount.name}"`,
    balanceBefore: balanceBeforeFrom,
  });

  // Record incoming transaction
  const incoming = await Transaction.create({
    accountId: toAccount._id,
    userId: req.user?.id,
    description: transferDesc,
    amount,
    originalAmount: amount,
    originalCurrency: "CLP",
    exchangeRate: 1,
    type: "transfer",
    category: "transfer",
    date: new Date(),
    notes: `Transferencia desde "${fromAccount.name}"`,
    balanceBefore: balanceBeforeTo,
  });

  // Link both transactions to each other
  outgoing.linkedTransactionId = incoming._id;
  incoming.linkedTransactionId = outgoing._id;
  await outgoing.save();
  await incoming.save();

  res.status(200).json({
    success: true,
    data: {
      from: fromAccount,
      to: toAccount,
    },
  });
};

// @route   GET /api/accounts/recalculate-balances/preview
// @desc    Preview what rounding would do to each account balance (no changes applied)
// @access  Private
export const previewRoundBalances = async (req: Request, res: Response) => {
  const accounts = await Account.find({ userId: req.user?.id });
  const results = accounts.map((account) => {
    const oldBalance = account.balance;
    const newBalance = Math.round(oldBalance);
    return {
      accountId: account._id.toString(),
      name: account.name,
      oldBalance,
      newBalance,
      diff: newBalance - oldBalance,
      hasChange: oldBalance !== newBalance,
    };
  });
  res.status(200).json({ success: true, data: results });
};

// @route   POST /api/accounts/recalculate-balances
// @desc    Round all account balances to nearest integer to eliminate floating-point drift.
//          This ONLY rounds the existing stored balance — it does NOT recalculate from transactions.
// @access  Private
export const recalculateBalances = async (req: Request, res: Response) => {
  const accounts = await Account.find({ userId: req.user?.id });
  const results: {
    accountId: string;
    name: string;
    oldBalance: number;
    newBalance: number;
    diff: number;
  }[] = [];

  for (const account of accounts) {
    const oldBalance = account.balance;
    const newBalance = Math.round(oldBalance);

    if (oldBalance !== newBalance) {
      account.balance = newBalance;
      await account.save();
    }

    results.push({
      accountId: account._id.toString(),
      name: account.name,
      oldBalance,
      newBalance,
      diff: newBalance - oldBalance,
    });
  }

  res.status(200).json({ success: true, data: results });
};
