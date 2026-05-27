import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { sendResetPasswordEmail } from '../services/email.service';

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

// @route   POST /api/auth/forgot-password
// @desc    Request password recovery token
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Por favor ingresa un email" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // For security reasons, don't confirm or deny user existence
    return res.status(200).json({
      success: true,
      message: "Si el correo está registrado, te enviaremos un enlace de recuperación.",
    });
  }

  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

  try {
    await sendResetPasswordEmail(user.email, user.username, resetUrl);
    res.status(200).json({
      success: true,
      message: "Si el correo está registrado, te enviaremos un enlace de recuperación.",
    });
  } catch (err) {
    console.error("Failed to send reset email:", err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(500).json({
      success: false,
      error: "Error al enviar el correo de recuperación. Por favor intenta de nuevo.",
    });
  }
};

// @route   POST /api/auth/reset-password
// @desc    Reset password using recovery token
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ success: false, error: "Token y contraseña requeridos" });
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+password +resetPasswordToken +resetPasswordExpires");

  if (!user) {
    return res.status(400).json({ success: false, error: "Token de recuperación inválido o expirado" });
  }

  // Update password (pre-save hook will hash it)
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Contraseña reestablecida correctamente.",
  });
};
