import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

export const healthRouter = Router();
healthRouter.use(authenticate);

healthRouter.get('/', async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const [
    failedScans,
    recentScans,
    uncategorizedCount,
    recentErrors,
    totalSites,
    totalCookies,
  ] = await Promise.all([
    prisma.scanRun.count({
      where: { site: { organizationId: orgId }, status: 'failed' },
    }),
    prisma.scanRun.findMany({
      where: { site: { organizationId: orgId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { site: { select: { domain: true } } },
    }),
    prisma.discoveredCookie.count({
      where: { site: { organizationId: orgId }, autoCategory: 'uncategorized', manualCategory: null },
    }),
    prisma.scanLog.findMany({
      where: { level: 'error', scanRun: { site: { organizationId: orgId } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { scanRun: { select: { id: true, siteId: true } } },
    }),
    prisma.site.count({ where: { organizationId: orgId } }),
    prisma.discoveredCookie.count({ where: { site: { organizationId: orgId } } }),
  ]);

  return res.json({
    success: true,
    data: {
      totalSites,
      totalCookies,
      failedScans,
      uncategorizedCount,
      recentScans,
      recentErrors,
      status: failedScans === 0 ? 'healthy' : 'degraded',
    },
  });
});
