import { chromium, Cookie as PlaywrightCookie } from 'playwright';
import { prisma } from '../utils/prisma';
import { classifyCookie } from '../classifier/classifier';

interface ScannerCookie {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expires: number; // unix timestamp, -1 = session
  maxAge?: number;
  value: string; // we capture but won't store
}

const MAX_PAGES = parseInt(process.env.SCANNER_MAX_PAGES || '20');
const TIMEOUT_MS = parseInt(process.env.SCANNER_TIMEOUT_MS || '30000');

async function addLog(scanRunId: string, level: string, message: string, url?: string) {
  await prisma.scanLog.create({
    data: { scanRunId, level, message, url },
  });
}

function isFirstParty(cookieDomain: string, siteDomain: string): boolean {
  const clean = cookieDomain.replace(/^\./, '').toLowerCase();
  const site = siteDomain.toLowerCase();
  return clean === site || clean.endsWith(`.${site}`);
}

function parseSameSiteUrl(url: string, base: string): string | null {
  try {
    const parsed = new URL(url);
    const baseUrl = new URL(base);
    if (parsed.hostname !== baseUrl.hostname) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export async function runScan(scanRunId: string, siteId: string, domain: string): Promise<void> {
  const startUrl = `https://${domain}`;

  await prisma.scanRun.update({
    where: { id: scanRunId },
    data: { status: 'running', startedAt: new Date() },
  });

  await addLog(scanRunId, 'info', `Starting scan for ${domain}`, startUrl);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; CookieConsentScanner/1.0; +https://cookieconsent.dev/bot)',
      ignoreHTTPSErrors: true,
    });

    const visitedUrls = new Set<string>();
    const urlQueue: string[] = [startUrl];
    const allCookies = new Map<string, ScannerCookie & { foundOnPages: string[] }>();
    let pagesVisited = 0;

    while (urlQueue.length > 0 && pagesVisited < MAX_PAGES) {
      const currentUrl = urlQueue.shift()!;
      if (visitedUrls.has(currentUrl)) continue;
      visitedUrls.add(currentUrl);

      const page = await context.newPage();
      try {
        await addLog(scanRunId, 'info', `Visiting page ${pagesVisited + 1}`, currentUrl);

        // Intercept responses to catch Set-Cookie headers
        const responseHeaders = new Map<string, string>();
        page.on('response', (response) => {
          const setCookie = response.headers()['set-cookie'];
          if (setCookie) responseHeaders.set(response.url(), setCookie);
        });

        const response = await page.goto(currentUrl, {
          waitUntil: 'networkidle',
          timeout: TIMEOUT_MS,
        });

        if (response?.status() && response.status() >= 400) {
          await addLog(scanRunId, 'warn', `HTTP ${response.status()} for ${currentUrl}`, currentUrl);
          await page.close();
          continue;
        }

        // Wait a bit for JS to set cookies
        await page.waitForTimeout(1500);

        // Collect all cookies from the browser context
        const pageCookies: PlaywrightCookie[] = await context.cookies();
        pagesVisited++;

        for (const c of pageCookies) {
          const key = `${c.name}:::${c.domain}`;
          if (allCookies.has(key)) {
            allCookies.get(key)!.foundOnPages.push(currentUrl);
          } else {
            allCookies.set(key, {
              name: c.name,
              domain: c.domain,
              path: c.path || '/',
              secure: c.secure,
              httpOnly: c.httpOnly,
              sameSite: c.sameSite || 'None',
              expires: c.expires,
              value: c.value,
              foundOnPages: [currentUrl],
            });
          }
        }

        // Discover same-site links for further crawling
        if (pagesVisited < MAX_PAGES) {
          const links = await page.$$eval('a[href]', (anchors) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            anchors.map((a) => (a as any).href as string).filter(Boolean)
          );
          for (const link of links) {
            const normalized = parseSameSiteUrl(link, startUrl);
            if (normalized && !visitedUrls.has(normalized) && !urlQueue.includes(normalized)) {
              urlQueue.push(normalized);
            }
          }
        }

        await addLog(scanRunId, 'info', `Found ${pageCookies.length} cookies on page`, currentUrl);
      } catch (pageErr: unknown) {
        const msg = pageErr instanceof Error ? pageErr.message : String(pageErr);
        if (msg.includes('Timeout')) {
          await addLog(scanRunId, 'warn', `Timeout loading page: ${msg}`, currentUrl);
        } else if (msg.includes('net::ERR_')) {
          await addLog(scanRunId, 'warn', `Network error: ${msg}`, currentUrl);
        } else {
          await addLog(scanRunId, 'error', `Error on page: ${msg}`, currentUrl);
        }
      } finally {
        await page.close();
      }
    }

    await browser.close();

    // Persist discovered cookies
    let newCookieCount = 0;
    for (const [, cookieData] of allCookies) {
      const fp = isFirstParty(cookieData.domain, domain);

      // Calculate expiry
      let expiresAt: Date | null = null;
      let maxAge: number | null = null;
      if (cookieData.expires && cookieData.expires > 0) {
        expiresAt = new Date(cookieData.expires * 1000);
        maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      }

      const classification = classifyCookie({
        name: cookieData.name,
        domain: cookieData.domain,
        siteDomain: domain,
        isFirstParty: fp,
        maxAge,
        expiresAt,
        httpOnly: cookieData.httpOnly,
        secure: cookieData.secure,
      });

      // Upsert cookie (preserve manual overrides)
      const existing = await prisma.discoveredCookie.findUnique({
        where: { siteId_name_domain: { siteId, name: cookieData.name, domain: cookieData.domain } },
      });

      const cookieRecord = await prisma.discoveredCookie.upsert({
        where: { siteId_name_domain: { siteId, name: cookieData.name, domain: cookieData.domain } },
        create: {
          siteId,
          name: cookieData.name,
          domain: cookieData.domain,
          path: cookieData.path,
          isFirstParty: fp,
          secure: cookieData.secure,
          httpOnly: cookieData.httpOnly,
          sameSite: cookieData.sameSite,
          expiresAt,
          maxAge,
          durationLabel: classification.durationLabel,
          autoCategory: classification.category,
          autoConfidence: classification.confidence,
          autoSource: classification.source,
          autoReason: classification.reason,
          firstSeenScanId: scanRunId,
          lastSeenScanId: scanRunId,
        },
        update: {
          // Update metadata — do NOT touch manual overrides
          path: cookieData.path,
          secure: cookieData.secure,
          httpOnly: cookieData.httpOnly,
          sameSite: cookieData.sameSite,
          expiresAt,
          maxAge,
          durationLabel: classification.durationLabel,
          autoCategory: classification.category,
          autoConfidence: classification.confidence,
          autoSource: classification.source,
          autoReason: classification.reason,
          lastSeenScanId: scanRunId,
          lastSeenAt: new Date(),
        },
      });

      if (!existing) newCookieCount++;

      // Record cookie seen in this scan (with pages)
      await prisma.cookieSeenInScan.upsert({
        where: { scanRunId_cookieId: { scanRunId, cookieId: cookieRecord.id } },
        create: {
          scanRunId,
          cookieId: cookieRecord.id,
          pageUrl: cookieData.foundOnPages[0],
        },
        update: { pageUrl: cookieData.foundOnPages[0] },
      });
    }

    await prisma.scanRun.update({
      where: { id: scanRunId },
      data: {
        status: 'done',
        completedAt: new Date(),
        pagesVisited,
        cookiesFound: allCookies.size,
      },
    });

    await addLog(scanRunId, 'info', `Scan complete. Visited ${pagesVisited} pages, found ${allCookies.size} unique cookies (${newCookieCount} new).`);
  } catch (err: unknown) {
    if (browser) await browser.close().catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.scanRun.update({
      where: { id: scanRunId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: msg,
      },
    });
    await addLog(scanRunId, 'error', `Scan failed: ${msg}`);
  }
}
