import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

export const cookiesRouter = Router();
cookiesRouter.use(authenticate);

// Get cookie inventory for a site
cookiesRouter.get('/sites/:siteId', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const { search, category, type, page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter
  const where: Record<string, unknown> = { siteId: site.id };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { domain: { contains: search } },
      { autoReason: { contains: search } },
      { manualDescription: { contains: search } },
    ];
  }

  if (category && category !== 'all') {
    if (category === 'uncategorized') {
      where.OR = [
        { manualCategory: 'uncategorized' },
        { AND: [{ manualCategory: null }, { autoCategory: 'uncategorized' }] },
      ];
    } else {
      where.OR = [
        { manualCategory: category },
        { AND: [{ manualCategory: null }, { autoCategory: category }] },
      ];
    }
  }

  if (type === 'first-party') where.isFirstParty = true;
  if (type === 'third-party') where.isFirstParty = false;

  const [cookies, total] = await Promise.all([
    prisma.discoveredCookie.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.discoveredCookie.count({ where }),
  ]);

  return res.json({
    success: true,
    data: cookies,
    meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  });
});

// Get single cookie detail
cookiesRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const cookie = await prisma.discoveredCookie.findUnique({
    where: { id: req.params.id },
    include: {
      seenIns: {
        include: { scanRun: { select: { id: true, createdAt: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
  if (!cookie) return res.status(404).json({ success: false, error: 'Cookie not found' });

  const site = await prisma.site.findFirst({
    where: { id: cookie.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(403).json({ success: false, error: 'Unauthorized' });

  return res.json({ success: true, data: cookie });
});

const overrideSchema = z.object({
  category: z.enum(['necessary', 'functional', 'analytics', 'marketing', 'uncategorized']).optional(),
  description: z.string().optional(),
});

// Set manual override
cookiesRouter.post('/:id/override', async (req: AuthRequest, res: Response) => {
  try {
    const body = overrideSchema.parse(req.body);
    const cookie = await prisma.discoveredCookie.findUnique({ where: { id: req.params.id } });
    if (!cookie) return res.status(404).json({ success: false, error: 'Cookie not found' });

    const site = await prisma.site.findFirst({
      where: { id: cookie.siteId, organizationId: req.user!.organizationId },
    });
    if (!site) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const updated = await prisma.discoveredCookie.update({
      where: { id: cookie.id },
      data: {
        manualCategory: body.category ?? cookie.manualCategory,
        manualDescription: body.description ?? cookie.manualDescription,
        isManuallyReviewed: true,
        reviewedAt: new Date(),
      },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    return res.status(500).json({ success: false, error: 'Update failed' });
  }
});

// Reset manual override
cookiesRouter.delete('/:id/override', async (req: AuthRequest, res: Response) => {
  const cookie = await prisma.discoveredCookie.findUnique({ where: { id: req.params.id } });
  if (!cookie) return res.status(404).json({ success: false, error: 'Cookie not found' });

  const site = await prisma.site.findFirst({
    where: { id: cookie.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(403).json({ success: false, error: 'Unauthorized' });

  const updated = await prisma.discoveredCookie.update({
    where: { id: cookie.id },
    data: {
      manualCategory: null,
      manualDescription: null,
      isManuallyReviewed: false,
      reviewedAt: null,
    },
  });
  return res.json({ success: true, data: updated });
});

// Inline category edit (PATCH)
cookiesRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const body = overrideSchema.parse(req.body);
    const cookie = await prisma.discoveredCookie.findUnique({ where: { id: req.params.id } });
    if (!cookie) return res.status(404).json({ success: false, error: 'Cookie not found' });

    const site = await prisma.site.findFirst({
      where: { id: cookie.siteId, organizationId: req.user!.organizationId },
    });
    if (!site) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const updated = await prisma.discoveredCookie.update({
      where: { id: cookie.id },
      data: {
        manualCategory: body.category ?? cookie.manualCategory,
        manualDescription: body.description ?? cookie.manualDescription,
        isManuallyReviewed: true,
        reviewedAt: new Date(),
      },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    return res.status(500).json({ success: false, error: 'Update failed' });
  }
});
