import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { runScan } from '../scanner/scanner';

export const scansRouter = Router();
scansRouter.use(authenticate);

// Trigger a new scan for a site
scansRouter.post('/sites/:siteId/trigger', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  // Check for already-running scan
  const running = await prisma.scanRun.findFirst({
    where: { siteId: site.id, status: { in: ['pending', 'running'] } },
  });
  if (running) {
    return res.status(409).json({ success: false, error: 'A scan is already in progress for this site' });
  }

  const scanRun = await prisma.scanRun.create({
    data: { siteId: site.id, status: 'pending' },
  });

  // Run scan asynchronously (in-process job)
  setImmediate(() => {
    runScan(scanRun.id, site.id, site.domain).catch(console.error);
  });

  return res.status(202).json({ success: true, data: scanRun, message: 'Scan started' });
});

// List scans for a site
scansRouter.get('/sites/:siteId', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const scans = await prisma.scanRun.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return res.json({ success: true, data: scans });
});

// Get single scan with logs
scansRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const scan = await prisma.scanRun.findFirst({
    where: { id: req.params.id },
    include: {
      logs: { orderBy: { createdAt: 'asc' } },
      site: true,
    },
  });
  if (!scan) return res.status(404).json({ success: false, error: 'Scan not found' });

  // Verify org access
  const site = await prisma.site.findFirst({
    where: { id: scan.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(403).json({ success: false, error: 'Unauthorized' });

  return res.json({ success: true, data: scan });
});
