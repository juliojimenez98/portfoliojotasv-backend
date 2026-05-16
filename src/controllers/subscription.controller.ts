import { Request, Response } from 'express';
import Subscription from '../models/Subscription';
import Account from '../models/Account';

// @route   GET /api/subscriptions
// @desc    Get all subscriptions
// @access  Private
export const getSubscriptions = async (req: Request, res: Response) => {
  const subscriptions = await Subscription.find({ userId: req.user?.id }).sort({ name: 1 });
  res.status(200).json({ success: true, count: subscriptions.length, data: subscriptions });
};

// @route   POST /api/subscriptions
// @desc    Create new subscription
// @access  Private
export const createSubscription = async (req: Request, res: Response) => {
  req.body.userId = req.user?.id;
  
  // Verify account belongs to user
  const account = await Account.findOne({ _id: req.body.accountId, userId: req.user?.id });
  if (!account) {
    return res.status(404).json({ success: false, error: 'Account not found or belongs to another user' });
  }

  const subscription = await Subscription.create(req.body);
  res.status(201).json({ success: true, data: subscription });
};

// @route   PUT /api/subscriptions/:id
// @desc    Update subscription
// @access  Private
export const updateSubscription = async (req: Request, res: Response) => {
  const subscription = await Subscription.findOneAndUpdate(
    { _id: req.params.id, userId: req.user?.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!subscription) return res.status(404).json({ success: false, error: 'Subscription not found' });
  res.status(200).json({ success: true, data: subscription });
};

// @route   DELETE /api/subscriptions/:id
// @desc    Delete subscription
// @access  Private
export const deleteSubscription = async (req: Request, res: Response) => {
  const subscription = await Subscription.findOneAndDelete({ _id: req.params.id, userId: req.user?.id });
  if (!subscription) return res.status(404).json({ success: false, error: 'Subscription not found' });
  res.status(200).json({ success: true, data: {} });
};
