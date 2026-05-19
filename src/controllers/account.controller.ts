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
// @desc    Deposit money into an account
// @access  Private (gastos app)
export const depositToAccount = async (req: Request, res: Response) => {
  const { amount, description } = req.body;

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

  // Update balance
  account.balance = Math.round(Math.round(account.balance) + amount);
  await account.save();

  // Create a transaction record for the deposit
  await Transaction.create({
    accountId: account._id,
    userId: req.user?.id,
    description: description || "Depósito",
    amount,
    type: "income",
    category: "other",
    date: new Date(),
    notes: `Abono a cuenta "${account.name}"`,
  });

  res.status(200).json({ success: true, data: account });
};

// @route   POST /api/accounts/transfer
// @desc    Transfer money between accounts
// @access  Private (gastos app)
export const transferBetweenAccounts = async (req: Request, res: Response) => {
  const { fromAccountId, toAccountId, amount, description } = req.body;

  if (!fromAccountId || !toAccountId) {
    return res
      .status(400)
      .json({
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

  // Execute transfer (no balance check — credit cards can be negative)
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

// @route   POST /api/accounts/recalculate-balances
// @desc    Recalculate all account balances from transactions (fixes floating-point drift)
// @access  Private
export const recalculateBalances = async (req: Request, res: Response) => {
  const accounts = await Account.find({ userId: req.user?.id });
  const results: { accountId: string; name: string; oldBalance: number; newBalance: number }[] = [];

  for (const account of accounts) {
    const transactions = await Transaction.find({ accountId: account._id });

    let newBalance = 0;
    for (const txn of transactions) {
      if (txn.type === 'income') {
        newBalance += txn.amount;
      } else if (txn.type === 'expense') {
        newBalance -= txn.amount;
      } else if (txn.type === 'transfer') {
        const isOutgoing = txn.notes?.startsWith('Transferencia a');
        if (isOutgoing) {
          newBalance -= txn.amount;
        } else {
          newBalance += txn.amount;
        }
      }
    }

    newBalance = Math.round(newBalance);
    const oldBalance = account.balance;
    account.balance = newBalance;
    await account.save();

    results.push({ accountId: account._id.toString(), name: account.name, oldBalance, newBalance });
  }

  res.status(200).json({ success: true, data: results });
};
