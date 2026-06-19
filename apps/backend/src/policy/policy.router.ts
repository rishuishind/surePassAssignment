import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

export const policyRouter = Router();
policyRouter.use(authenticate);

const CATEGORY_ORDER = ['necessary', 'functional', 'analytics', 'marketing', 'uncategorized'];

// Generate cookie policy for a site
policyRouter.get('/sites/:siteId', async (req: AuthRequest, res: Response) => {
  const site = await prisma.site.findFirst({
    where: { id: req.params.siteId, organizationId: req.user!.organizationId },
  });
  if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

  const cookies = await prisma.discoveredCookie.findMany({
    where: { siteId: site.id },
    orderBy: [{ autoCategory: 'asc' }, { name: 'asc' }],
  });

  // Group by effective category (manual override takes precedence)
  const grouped: Record<string, typeof cookies> = {};
  for (const c of cookies) {
    const cat = c.manualCategory ?? c.autoCategory;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  }

  const sections = CATEGORY_ORDER
    .filter(cat => grouped[cat]?.length > 0)
    .map(cat => ({
      category: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      cookies: grouped[cat].map(c => ({
        name: c.name,
        domain: c.domain,
        type: c.isFirstParty ? 'First-party' : 'Third-party',
        duration: c.durationLabel ?? 'Unknown',
        description: c.manualDescription ?? c.autoReason ?? 'No description available.',
        category: (c.manualCategory ?? c.autoCategory),
        secure: c.secure,
        httpOnly: c.httpOnly,
      })),
    }));

  const policy = {
    siteDomain: site.domain,
    generatedAt: new Date().toISOString(),
    totalCookies: cookies.length,
    sections,
  };

  return res.json({ success: true, data: policy });
});
