import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const generateToken = (id: string, email: string, username: string, isAdmin: boolean, allowedApps: string[]) => {
  return jwt.sign(
    { id, email, username, isAdmin, allowedApps },
    process.env.JWT_SECRET as string,
    { expiresIn: '30d' }
  );
};

export const register = async (req: Request, res: Response) => {
  return res.status(403).json({ success: false, error: 'Registration is closed. Please contact an administrator.' });
  
  /* Original logic commented out
  const { username, email, password } = req.body;

  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    return res.status(400).json({ success: false, error: 'User already exists' });
  }

  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password,
    allowedApps: ['gastos'], // Given by default for development
    isAdmin: false,
  });

  const token = generateToken(user._id.toString(), user.email, user.username, user.isAdmin, user.allowedApps);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      allowedApps: user.allowedApps,
    },
  });
  */
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Please provide email and password' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = generateToken(user._id.toString(), user.email, user.username, user.isAdmin, user.allowedApps);

  res.status(200).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      allowedApps: user.allowedApps,
    },
  });
};

export const getMe = async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.id);
  res.status(200).json({ success: true, data: user });
};
