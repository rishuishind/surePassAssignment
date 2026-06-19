import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
// Manual CSV builder to avoid external dependency

export const consentRouter = Router();
consentRouter.use(authenticate);

// List consent records
consentRouter.get('/sites/:siteId', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const { startDate, endDate, action, page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = { siteId: site.id };
  if (startDate) where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), lte: new Date(endDate) };
  if (action && action !== 'all') where.action = action;

  const [records, total] = await Promise.all([
    prisma.consentRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      include: { bannerConfig: { select: { version: true } } },
    }),
    prisma.consentRecord.count({ where }),
  ]);

  return res.json({
    success: true,
    data: records,
    meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  });
});

// CSV Export
consentRouter.get('/sites/:siteId/export', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const { startDate, endDate } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { siteId: site.id };
  if (startDate) where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), lte: new Date(endDate) };

  const records = await prisma.consentRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { bannerConfig: { select: { version: true } } },
  });

  const headers = ['Record ID', 'Visitor ID', 'Action', 'Categories Allowed', 'Banner Version', 'Source', 'Timestamp'];
  const rows = records.map(r => [
    r.id,
    r.visitorId,
    r.action,
    r.categoriesAllowed,
    String(r.bannerVersion ?? 'N/A'),
    r.source,
    r.createdAt.toISOString(),
  ]);

  const escapeCSV = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="consent-records-${site.domain}-${Date.now()}.csv"`);
  return res.send(csv);
});

// Consent stats for dashboard
consentRouter.get('/sites/:siteId/stats', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const stats = await prisma.consentRecord.groupBy({
    by: ['action'],
    where: { siteId: site.id },
    _count: true,
  });

  return res.json({ success: true, data: stats });
});
