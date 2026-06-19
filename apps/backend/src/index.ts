import express from 'express';
import cors from 'cors';
import path from 'path';
import { authRouter } from './auth/auth.router';
import { sitesRouter } from './sites/sites.router';
import { scansRouter } from './scans/scans.router';
import { cookiesRouter } from './cookies/cookies.router';
import { bannersRouter } from './banners/banners.router';
import { consentRouter } from './consent/consent.router';
import { policyRouter } from './policy/policy.router';
import { healthRouter } from './health/health.router';
import { publicRouter } from './embed/public.router';

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: true, // 'null' for local file:// demo pages
  credentials: true,
}));
app.use(express.json());

// Serve the embeddable banner script as a static file
app.use('/embed', express.static(path.join(__dirname, '../public')));

// Public API routes (no auth required)
app.use('/api/public', publicRouter);

// Protected API routes
app.use('/api/auth', authRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/scans', scansRouter);
app.use('/api/cookies', cookiesRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/consent', consentRouter);
app.use('/api/policy', policyRouter);
app.use('/api/health', healthRouter);

// Health check
app.get('/api/ping', (_req, res) => {
  res.json({ success: true, message: 'Cookie Consent API is running', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🍪 Cookie Consent API running on http://localhost:${PORT}`);
  console.log(`📁 Serving embed script at http://localhost:${PORT}/embed/banner.js`);
});

export default app;
