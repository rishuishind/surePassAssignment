import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { createObjectCsvStringifier } from 'csv-writer';

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

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: 'Record ID' },
      { id: 'visitorId', title: 'Visitor ID' },
      { id: 'action', title: 'Action' },
      { id: 'categoriesAllowed', title: 'Categories Allowed' },
      { id: 'bannerVersion', title: 'Banner Version' },
      { id: 'source', title: 'Source' },
      { id: 'createdAt', title: 'Timestamp' },
    ],
  });

  const csvRecords = records.map(r => ({
    id: r.id,
    visitorId: r.visitorId,
    action: r.action,
    categoriesAllowed: r.categoriesAllowed,
    bannerVersion: r.bannerVersion ?? 'N/A',
    source: r.source,
    createdAt: r.createdAt.toISOString(),
  }));

  const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvRecords);

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
