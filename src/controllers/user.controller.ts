import { Request, Response } from 'express';
import User from '../models/User';
import { sendInvitationEmail } from '../services/email.service';

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response) => {
  const users = await User.find({}).select('-password');
  res.status(200).json({ success: true, count: users.length, data: users });
};

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
export const getUser = async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.status(200).json({ success: true, data: user });
};

// @route   POST /api/users
// @desc    Create user (Admin manually creates a user)
// @access  Private/Admin
export const createUser = async (req: Request, res: Response) => {
  const { username, email, password, isAdmin, allowedApps } = req.body;

  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    return res.status(400).json({ success: false, error: 'User already exists' });
  }

  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password,
    isAdmin: isAdmin || false,
    allowedApps: allowedApps || [],
  });

  // Ensure password is not returned
  const userResponse = {
    _id: user._id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    allowedApps: user.allowedApps,
  };

  // Send invitation email in the background (non-blocking)
  sendInvitationEmail(user.email, user.username, password).catch((emailErr) => {
    console.error("Failed to send invitation email in background:", emailErr);
  });

  res.status(201).json({ success: true, data: userResponse });
};

// @route   PUT /api/users/:id
// @desc    Update user (roles/apps)
// @access  Private/Admin
export const updateUser = async (req: Request, res: Response) => {
  // Prevent updating password through this route for security
  if (req.body.password) {
    delete req.body.password;
  }

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.status(200).json({ success: true, data: user });
};

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response) => {
  // Prevent admin from deleting themselves
  if (req.params.id === req.user?.id) {
    return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.status(200).json({ success: true, data: {} });
};
