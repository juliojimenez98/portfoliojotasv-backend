import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  allowedApps: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

export const authorize = (...apps: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.isAdmin) {
      return next(); // Admins bypass app restrictions
    }

    const hasAccess = apps.some((app) => req.user?.allowedApps.includes(app));
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'User is not authorized to access this app' });
    }
    next();
  };
};

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};
