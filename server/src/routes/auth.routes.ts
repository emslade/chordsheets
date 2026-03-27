import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

router.post('/register', (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Registration is currently disabled' });
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const result = await pool.query(
      'SELECT id, email, display_name, password, created_at, updated_at FROM users WHERE email = $1',
      [body.email]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id, user.email);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT id, email, display_name, created_at, updated_at FROM users WHERE id = $1',
    [req.userId]
  );

  const user = result.rows[0];
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
});

export default router;
