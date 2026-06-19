import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import crypto from 'crypto';

export const publicRouter = Router();

// Public: fetch banner config for embed script
publicRouter.get('/banner/:siteId', async (req: Request, res: Response) => {
  // Allow CORS for any origin (embed on external sites)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const banner = await prisma.bannerConfig.findFirst({
    where: { siteId: req.params.siteId, isActive: true },
    orderBy: { version: 'desc' },
  });

  if (!banner) {
    return res.status(404).json({ success: false, error: 'No banner configured for this site' });
  }

  return res.json({
    success: true,
    data: {
      id: banner.id,
      siteId: banner.siteId,
      version: banner.version,
      title: banner.title,
      description: banner.description,
      acceptLabel: banner.acceptLabel,
      rejectLabel: banner.rejectLabel,
      preferencesLabel: banner.preferencesLabel,
      position: banner.position,
      primaryColor: banner.primaryColor,
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor,
      buttonTextColor: banner.buttonTextColor,
      categoryConfigs: JSON.parse(banner.categoryConfigs),
    },
  });
});

const consentSchema = z.object({
  siteId: z.string(),
  bannerConfigId: z.string().optional(),
  bannerVersion: z.number().optional(),
  visitorId: z.string(),
  action: z.enum(['accepted', 'rejected', 'customized']),
  categoriesAllowed: z.array(z.string()).optional(),
  source: z.string().optional(),
  userAgent: z.string().optional(),
});

// Public: record consent event from embedded banner
publicRouter.post('/consent', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const body = consentSchema.parse(req.body);

    // Verify site exists
    const site = await prisma.site.findUnique({ where: { id: body.siteId } });
    if (!site) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    // Hash IP for privacy
    const ip = req.ip || req.socket.remoteAddress || '';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);

    await prisma.consentRecord.create({
      data: {
        siteId: body.siteId,
        bannerConfigId: body.bannerConfigId,
        bannerVersion: body.bannerVersion,
        visitorId: body.visitorId,
        action: body.action,
        categoriesAllowed: JSON.stringify(body.categoriesAllowed ?? []),
        source: body.source ?? 'embedded_banner',
        ipHash,
        userAgent: body.userAgent ? body.userAgent.substring(0, 200) : null, // truncate
      },
    });

    return res.status(201).json({ success: true, message: 'Consent recorded' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    return res.status(500).json({ success: false, error: 'Failed to record consent' });
  }
});

// CORS preflight
publicRouter.options('*', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204);
});
