import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

export const sitesRouter = Router();
sitesRouter.use(authenticate);

const createSiteSchema = z.object({
  domain: z.string().min(1),
  displayName: z.string().optional(),
});

// Normalize a domain/URL to a clean domain string
function normalizeDomain(input: string): string {
  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return input.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

sitesRouter.get('/', async (req: AuthRequest, res: Response) => {
  const sites = await prisma.site.findMany({
    where: { organizationId: req.user!.organizationId },
    include: {
      scanRuns: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: { select: { cookies: true, consentRecords: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: sites });
});

sitesRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const body = createSiteSchema.parse(req.body);
    const domain = normalizeDomain(body.domain);

    if (!domain || domain.length < 3) {
      return res.status(400).json({ success: false, error: 'Invalid domain' });
    }

    const existing = await prisma.site.findUnique({
      where: { domain_organizationId: { domain, organizationId: req.user!.organizationId } },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Site already exists in your organization' });
    }

    const site = await prisma.site.create({
      data: {
        domain,
        displayName: body.displayName || domain,
        organizationId: req.user!.organizationId,
      },
    });
    return res.status(201).json({ success: true, data: site });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    return res.status(500).json({ success: false, error: 'Failed to create site' });
  }
});

sitesRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
    include: {
      scanRuns: { orderBy: { createdAt: 'desc' }, take: 10 },
      bannerConfigs: { where: { isActive: true }, take: 1 },
      _count: { select: { cookies: true, consentRecords: true } },
    },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });
  return res.json({ success: true, data: site });
});

sitesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  await prisma.site.delete({ where: { id: site.id } });
  return res.json({ success: true, message: 'Site deleted' });
});

// Overview stats for home dashboard
sitesRouter.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const [cookies, consentCount, lastScan] = await Promise.all([
    prisma.discoveredCookie.groupBy({
      by: ['autoCategory'],
      where: { siteId: site.id },
      _count: true,
    }),
    prisma.consentRecord.count({ where: { siteId: site.id } }),
    prisma.scanRun.findFirst({ where: { siteId: site.id }, orderBy: { createdAt: 'desc' } }),
  ]);

  return res.json({ success: true, data: { cookies, consentCount, lastScan } });
});
