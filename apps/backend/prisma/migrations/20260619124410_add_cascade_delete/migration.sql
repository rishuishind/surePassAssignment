-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BannerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL DEFAULT 'We use cookies',
    "description" TEXT NOT NULL DEFAULT 'We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.',
    "acceptLabel" TEXT NOT NULL DEFAULT 'Accept All',
    "rejectLabel" TEXT NOT NULL DEFAULT 'Reject All',
    "preferencesLabel" TEXT NOT NULL DEFAULT 'Manage Preferences',
    "position" TEXT NOT NULL DEFAULT 'bottom',
    "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "backgroundColor" TEXT NOT NULL DEFAULT '#1E293B',
    "textColor" TEXT NOT NULL DEFAULT '#F1F5F9',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "categoryConfigs" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BannerConfig_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BannerConfig" ("acceptLabel", "backgroundColor", "buttonTextColor", "categoryConfigs", "createdAt", "description", "id", "isActive", "position", "preferencesLabel", "primaryColor", "rejectLabel", "siteId", "textColor", "title", "updatedAt", "version") SELECT "acceptLabel", "backgroundColor", "buttonTextColor", "categoryConfigs", "createdAt", "description", "id", "isActive", "position", "preferencesLabel", "primaryColor", "rejectLabel", "siteId", "textColor", "title", "updatedAt", "version" FROM "BannerConfig";
DROP TABLE "BannerConfig";
ALTER TABLE "new_BannerConfig" RENAME TO "BannerConfig";
CREATE TABLE "new_ConsentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "bannerConfigId" TEXT,
    "bannerVersion" INTEGER,
    "visitorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "categoriesAllowed" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'embedded_banner',
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentRecord_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsentRecord_bannerConfigId_fkey" FOREIGN KEY ("bannerConfigId") REFERENCES "BannerConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConsentRecord" ("action", "bannerConfigId", "bannerVersion", "categoriesAllowed", "createdAt", "id", "ipHash", "siteId", "source", "userAgent", "visitorId") SELECT "action", "bannerConfigId", "bannerVersion", "categoriesAllowed", "createdAt", "id", "ipHash", "siteId", "source", "userAgent", "visitorId" FROM "ConsentRecord";
DROP TABLE "ConsentRecord";
ALTER TABLE "new_ConsentRecord" RENAME TO "ConsentRecord";
CREATE TABLE "new_CookieSeenInScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanRunId" TEXT NOT NULL,
    "cookieId" TEXT NOT NULL,
    "pageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CookieSeenInScan_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "ScanRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CookieSeenInScan_cookieId_fkey" FOREIGN KEY ("cookieId") REFERENCES "DiscoveredCookie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CookieSeenInScan" ("cookieId", "createdAt", "id", "pageUrl", "scanRunId") SELECT "cookieId", "createdAt", "id", "pageUrl", "scanRunId" FROM "CookieSeenInScan";
DROP TABLE "CookieSeenInScan";
ALTER TABLE "new_CookieSeenInScan" RENAME TO "CookieSeenInScan";
CREATE UNIQUE INDEX "CookieSeenInScan_scanRunId_cookieId_key" ON "CookieSeenInScan"("scanRunId", "cookieId");
CREATE TABLE "new_DiscoveredCookie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "path" TEXT,
    "isFirstParty" BOOLEAN NOT NULL DEFAULT true,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "httpOnly" BOOLEAN NOT NULL DEFAULT false,
    "sameSite" TEXT,
    "expiresAt" DATETIME,
    "maxAge" INTEGER,
    "durationLabel" TEXT,
    "autoCategory" TEXT NOT NULL DEFAULT 'uncategorized',
    "autoConfidence" TEXT NOT NULL DEFAULT 'none',
    "autoSource" TEXT NOT NULL DEFAULT 'unknown',
    "autoReason" TEXT,
    "manualCategory" TEXT,
    "manualDescription" TEXT,
    "isManuallyReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" DATETIME,
    "firstSeenScanId" TEXT,
    "lastSeenScanId" TEXT,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscoveredCookie_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DiscoveredCookie" ("autoCategory", "autoConfidence", "autoReason", "autoSource", "createdAt", "domain", "durationLabel", "expiresAt", "firstSeenAt", "firstSeenScanId", "httpOnly", "id", "isFirstParty", "isManuallyReviewed", "lastSeenAt", "lastSeenScanId", "manualCategory", "manualDescription", "maxAge", "name", "path", "reviewedAt", "sameSite", "secure", "siteId", "updatedAt") SELECT "autoCategory", "autoConfidence", "autoReason", "autoSource", "createdAt", "domain", "durationLabel", "expiresAt", "firstSeenAt", "firstSeenScanId", "httpOnly", "id", "isFirstParty", "isManuallyReviewed", "lastSeenAt", "lastSeenScanId", "manualCategory", "manualDescription", "maxAge", "name", "path", "reviewedAt", "sameSite", "secure", "siteId", "updatedAt" FROM "DiscoveredCookie";
DROP TABLE "DiscoveredCookie";
ALTER TABLE "new_DiscoveredCookie" RENAME TO "DiscoveredCookie";
CREATE UNIQUE INDEX "DiscoveredCookie_siteId_name_domain_key" ON "DiscoveredCookie"("siteId", "name", "domain");
CREATE TABLE "new_ScanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanRunId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanLog_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "ScanRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScanLog" ("createdAt", "id", "level", "message", "scanRunId", "url") SELECT "createdAt", "id", "level", "message", "scanRunId", "url" FROM "ScanLog";
DROP TABLE "ScanLog";
ALTER TABLE "new_ScanLog" RENAME TO "ScanLog";
CREATE TABLE "new_ScanRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pagesVisited" INTEGER NOT NULL DEFAULT 0,
    "cookiesFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanRun_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScanRun" ("completedAt", "cookiesFound", "createdAt", "errorMessage", "id", "pagesVisited", "siteId", "startedAt", "status") SELECT "completedAt", "cookiesFound", "createdAt", "errorMessage", "id", "pagesVisited", "siteId", "startedAt", "status" FROM "ScanRun";
DROP TABLE "ScanRun";
ALTER TABLE "new_ScanRun" RENAME TO "ScanRun";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
