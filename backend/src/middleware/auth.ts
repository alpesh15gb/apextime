import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
<<<<<<< HEAD
import { tenantContext } from '../utils/tenantContext';

=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e

interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
<<<<<<< HEAD
    tenantId: string;
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized - No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'apextime-secret-key-2026';

    const decoded = jwt.verify(token, secret) as {
      id: string;
      username: string;
      role: string;
<<<<<<< HEAD
      tenantId: string;
    };

    req.user = decoded;

    // Provide tenancy context for all downstream operations
    tenantContext.run(decoded.tenantId, () => {
      next();
    });
=======
    };

    req.user = decoded;
    next();
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      return;
    }

    next();
  };
};

export type { AuthRequest };
