import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  organizationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const org = await prisma.organization.create({
      data: { name: body.organizationName },
    });

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        organizationId: org.id,
        role: 'admin',
      },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        organization: { id: org.id, name: org.name },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    console.error('[auth/register]', err);
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { organization: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        organization: { id: user.organization.id, name: user.organization.name },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { organization: true },
  });
  return res.json({
    success: true,
    data: {
      user: { id: user!.id, name: user!.name, email: user!.email, role: user!.role },
      organization: { id: user!.organization.id, name: user!.organization.name },
    },
  });
});
