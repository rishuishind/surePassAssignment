-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "displayName" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pagesVisited" INTEGER NOT NULL DEFAULT 0,
    "cookiesFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanRun_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanRunId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanLog_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "ScanRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscoveredCookie" (
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
    CONSTRAINT "DiscoveredCookie_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CookieSeenInScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanRunId" TEXT NOT NULL,
    "cookieId" TEXT NOT NULL,
    "pageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CookieSeenInScan_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "ScanRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CookieSeenInScan_cookieId_fkey" FOREIGN KEY ("cookieId") REFERENCES "DiscoveredCookie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BannerConfig" (
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
    CONSTRAINT "BannerConfig_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
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
    CONSTRAINT "ConsentRecord_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConsentRecord_bannerConfigId_fkey" FOREIGN KEY ("bannerConfigId") REFERENCES "BannerConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Site_domain_organizationId_key" ON "Site"("domain", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredCookie_siteId_name_domain_key" ON "DiscoveredCookie"("siteId", "name", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "CookieSeenInScan_scanRunId_cookieId_key" ON "CookieSeenInScan"("scanRunId", "cookieId");
