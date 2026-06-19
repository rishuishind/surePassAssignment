import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

export const bannersRouter = Router();
bannersRouter.use(authenticate);

const bannerSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  acceptLabel: z.string().optional(),
  rejectLabel: z.string().optional(),
  preferencesLabel: z.string().optional(),
  position: z.enum(['bottom', 'top', 'modal', 'corner']).optional(),
  primaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  buttonTextColor: z.string().optional(),
  categoryConfigs: z.array(z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    enabled: z.boolean().optional(),
  })).optional(),
});

// Get banner config for a site
bannersRouter.get('/sites/:siteId', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const banner = await prisma.bannerConfig.findFirst({
    where: { siteId: site.id, isActive: true },
    orderBy: { version: 'desc' },
  });

  if (!banner) {
    // Return default config
    return res.json({
      success: true,
      data: null,
      meta: { hasConfig: false },
    });
  }

  return res.json({
    success: true,
    data: { ...banner, categoryConfigs: JSON.parse(banner.categoryConfigs) },
  });
});

// Save/update banner config (bumps version)
bannersRouter.put('/sites/:siteId', async (req: AuthRequest, res: Response) => {
  try {
    const body = bannerSchema.parse(req.body);
    const site = await prisma.site.findFirst({
      where: { id: req.params.siteId, organizationId: req.user!.organizationId },
    });
    if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

    // Deactivate previous configs
    await prisma.bannerConfig.updateMany({
      where: { siteId: site.id, isActive: true },
      data: { isActive: false },
    });

    // Get next version
    const lastConfig = await prisma.bannerConfig.findFirst({
      where: { siteId: site.id },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastConfig?.version ?? 0) + 1;

    const banner = await prisma.bannerConfig.create({
      data: {
        siteId: site.id,
        version: nextVersion,
        isActive: true,
        title: body.title ?? 'We use cookies',
        description: body.description ?? 'We use cookies to enhance your experience.',
        acceptLabel: body.acceptLabel ?? 'Accept All',
        rejectLabel: body.rejectLabel ?? 'Reject All',
        preferencesLabel: body.preferencesLabel ?? 'Manage Preferences',
        position: body.position ?? 'bottom',
        primaryColor: body.primaryColor ?? '#3B82F6',
        backgroundColor: body.backgroundColor ?? '#1E293B',
        textColor: body.textColor ?? '#F1F5F9',
        buttonTextColor: body.buttonTextColor ?? '#FFFFFF',
        categoryConfigs: JSON.stringify(body.categoryConfigs ?? []),
      },
    });

    return res.json({
      success: true,
      data: { ...banner, categoryConfigs: JSON.parse(banner.categoryConfigs) },
      message: `Banner config saved (version ${nextVersion})`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    return res.status(500).json({ success: false, error: 'Failed to save banner config' });
  }
});

// Get embed snippet
bannersRouter.get('/sites/:siteId/snippet', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
  const snippet = `<!-- Cookie Consent Banner by CookieGuard -->
<script 
  src="${backendUrl}/embed/banner.js" 
  data-site-id="${site.id}"
  data-api-url="${backendUrl}"
  async>
</script>`;

  return res.json({ success: true, data: { snippet, siteId: site.id, backendUrl } });
});

// List banner config history
bannersRouter.get('/sites/:siteId/history', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const configs = await prisma.bannerConfig.findMany({
    where: { siteId: site.id },
    orderBy: { version: 'desc' },
  });
  return res.json({ success: true, data: configs });
});
