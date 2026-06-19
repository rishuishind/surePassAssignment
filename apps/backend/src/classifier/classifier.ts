/**
 * Cookie Classifier Module
 * Implements a 4-tier rule engine:
 * 1. Known-cookie database match (high confidence)
 * 2. Name prefix/exact pattern rules (medium-high)
 * 3. Domain/provider heuristics (medium)
 * 4. Duration heuristics (low)
 * 5. Fallback → Uncategorized
 */

export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing' | 'uncategorized';
export type ClassificationSource = 'known_db' | 'name_pattern' | 'domain_heuristic' | 'duration_heuristic' | 'unknown';
export type ClassificationConfidence = 'high' | 'medium' | 'low' | 'none';

export interface ClassificationResult {
  category: CookieCategory;
  confidence: ClassificationConfidence;
  source: ClassificationSource;
  reason: string;
}

export interface CookieInput {
  name: string;
  domain: string;
  siteDomain: string;
  isFirstParty: boolean;
  maxAge?: number | null;
  expiresAt?: Date | null;
  httpOnly?: boolean;
  secure?: boolean;
}

// ─── Tier 1: Known-cookie database ────────────────────────────────────────────
// A curated set of well-known cookies from public datasets
const KNOWN_COOKIES: Record<string, { category: CookieCategory; description: string }> = {
  // Google Analytics
  '_ga': { category: 'analytics', description: 'Google Analytics tracking cookie to distinguish users.' },
  '_gid': { category: 'analytics', description: 'Google Analytics cookie that stores and updates a unique value for each page visited.' },
  '_gat': { category: 'analytics', description: 'Google Analytics cookie used to throttle request rate.' },
  '_gat_UA': { category: 'analytics', description: 'Google Analytics cookie for throttling requests.' },
  '__utma': { category: 'analytics', description: 'Google Analytics cookie used to distinguish users and sessions.' },
  '__utmb': { category: 'analytics', description: 'Google Analytics cookie used to determine new sessions/visits.' },
  '__utmc': { category: 'analytics', description: 'Google Analytics cookie used to determine new sessions.' },
  '__utmz': { category: 'analytics', description: 'Google Analytics cookie that stores the traffic source or campaign.' },
  '__utmt': { category: 'analytics', description: 'Google Analytics cookie used to throttle request rate.' },
  // Google Ads / Marketing
  '_gcl_au': { category: 'marketing', description: 'Google AdSense cookie for experimenting with advertisement efficiency.' },
  '_gcl_aw': { category: 'marketing', description: 'Google Click Identifier cookie for ad conversion tracking.' },
  'IDE': { category: 'marketing', description: 'Google DoubleClick cookie for targeting and advertising.' },
  'DSID': { category: 'marketing', description: 'Google DoubleClick cookie for user identification in ads.' },
  'id': { category: 'marketing', description: 'Google DoubleClick ad targeting cookie.' },
  // Facebook / Meta
  '_fbp': { category: 'marketing', description: 'Facebook Pixel cookie to identify browsers across websites for advertising.' },
  '_fbc': { category: 'marketing', description: 'Facebook Click Identifier for ad tracking.' },
  'fr': { category: 'marketing', description: 'Facebook cookie for delivering, measuring, and improving ad relevancy.' },
  'datr': { category: 'marketing', description: 'Facebook security and anti-spam cookie.' },
  'sb': { category: 'marketing', description: 'Facebook browser identifier for anti-spam.' },
  // Hotjar
  '_hjSessionUser': { category: 'analytics', description: 'Hotjar cookie to identify a new user\'s first session.' },
  '_hjSession': { category: 'analytics', description: 'Hotjar cookie holding current session data.' },
  '_hjAbsoluteSessionInProgress': { category: 'analytics', description: 'Hotjar cookie to detect first pageview in a session.' },
  '_hjIncludedInSessionSample': { category: 'analytics', description: 'Hotjar cookie to record whether user is included in data sampling.' },
  '_hjFirstSeen': { category: 'analytics', description: 'Hotjar cookie to identify a new user\'s first session.' },
  // Intercom
  'intercom-id': { category: 'functional', description: 'Intercom cookie to identify anonymous visitors.' },
  'intercom-session': { category: 'functional', description: 'Intercom session identifier.' },
  'intercom-device-id': { category: 'functional', description: 'Intercom cookie for device identification.' },
  // Stripe
  '__stripe_mid': { category: 'necessary', description: 'Stripe cookie for fraud prevention.' },
  '__stripe_sid': { category: 'necessary', description: 'Stripe session cookie for secure payments.' },
  // HubSpot
  '__hstc': { category: 'analytics', description: 'HubSpot main cookie for visitor tracking.' },
  '__hssc': { category: 'analytics', description: 'HubSpot session cookie.' },
  '__hssrc': { category: 'analytics', description: 'HubSpot cookie to determine if a new session was started.' },
  'hubspotutk': { category: 'analytics', description: 'HubSpot cookie to keep track of a visitor\'s identity.' },
  // LinkedIn
  'bcookie': { category: 'marketing', description: 'LinkedIn browser identifier for ad tracking.' },
  'bscookie': { category: 'marketing', description: 'LinkedIn secure browser cookie.' },
  'lidc': { category: 'marketing', description: 'LinkedIn cookie for data center selection.' },
  'li_gc': { category: 'marketing', description: 'LinkedIn cookie for guest consent.' },
  // Twitter/X
  'guest_id': { category: 'marketing', description: 'Twitter cookie for tracking anonymous visitors for advertising.' },
  'personalization_id': { category: 'marketing', description: 'Twitter cookie for personalised content and advertising.' },
  // Cloudflare
  '__cfduid': { category: 'necessary', description: 'Cloudflare security cookie for bot detection.' },
  '__cf_bm': { category: 'necessary', description: 'Cloudflare Bot Management cookie.' },
  'cf_clearance': { category: 'necessary', description: 'Cloudflare challenge clearance cookie.' },
  // CSRF / Security
  'csrftoken': { category: 'necessary', description: 'CSRF protection token.' },
  '_csrf': { category: 'necessary', description: 'Cross-Site Request Forgery protection cookie.' },
  'XSRF-TOKEN': { category: 'necessary', description: 'CSRF token for form protection.' },
  // Session
  'sessionid': { category: 'necessary', description: 'User session identifier.' },
  'PHPSESSID': { category: 'necessary', description: 'PHP session identifier.' },
  'JSESSIONID': { category: 'necessary', description: 'Java EE web server session identifier.' },
  'ASP.NET_SessionId': { category: 'necessary', description: 'ASP.NET session identifier.' },
  // Auth
  'remember_me': { category: 'functional', description: 'Remember me login persistence cookie.' },
  'auth_token': { category: 'necessary', description: 'Authentication token.' },
  // Consent
  'cookie_consent': { category: 'necessary', description: 'Stores cookie consent preferences.' },
  'cookieconsent_status': { category: 'necessary', description: 'Stores cookie consent status.' },
  'gdpr_consent': { category: 'necessary', description: 'GDPR consent record.' },
  // Mixpanel
  'mp_': { category: 'analytics', description: 'Mixpanel analytics tracking cookie.' },
  // Segment
  'ajs_user_id': { category: 'analytics', description: 'Segment analytics user identifier.' },
  'ajs_anonymous_id': { category: 'analytics', description: 'Segment analytics anonymous identifier.' },
  // Amplitude
  'amplitude_id': { category: 'analytics', description: 'Amplitude analytics tracking cookie.' },
};

// ─── Tier 2: Name pattern rules ───────────────────────────────────────────────
interface NamePattern {
  pattern: RegExp;
  category: CookieCategory;
  confidence: ClassificationConfidence;
  reason: string;
}

const NAME_PATTERNS: NamePattern[] = [
  // Analytics
  { pattern: /^_ga/i, category: 'analytics', confidence: 'high', reason: 'Google Analytics prefix (_ga)' },
  { pattern: /^__utm/i, category: 'analytics', confidence: 'high', reason: 'Google Analytics UTM prefix (__utm)' },
  { pattern: /^_hj/i, category: 'analytics', confidence: 'high', reason: 'Hotjar prefix (_hj)' },
  { pattern: /^__hs/i, category: 'analytics', confidence: 'high', reason: 'HubSpot prefix (__hs)' },
  { pattern: /^hubspot/i, category: 'analytics', confidence: 'medium', reason: 'HubSpot cookie name' },
  { pattern: /^mp_/i, category: 'analytics', confidence: 'high', reason: 'Mixpanel prefix (mp_)' },
  { pattern: /^ajs_/i, category: 'analytics', confidence: 'high', reason: 'Segment analytics prefix (ajs_)' },
  { pattern: /^amplitude/i, category: 'analytics', confidence: 'medium', reason: 'Amplitude analytics prefix' },
  // Marketing
  { pattern: /^_fb/i, category: 'marketing', confidence: 'high', reason: 'Facebook/Meta prefix (_fb)' },
  { pattern: /^_gcl/i, category: 'marketing', confidence: 'high', reason: 'Google Click Identifier prefix (_gcl)' },
  { pattern: /^intercom/i, category: 'functional', confidence: 'high', reason: 'Intercom prefix' },
  // Necessary / Security
  { pattern: /csrf/i, category: 'necessary', confidence: 'high', reason: 'CSRF protection token' },
  { pattern: /xsrf/i, category: 'necessary', confidence: 'high', reason: 'XSRF protection token' },
  { pattern: /^session/i, category: 'necessary', confidence: 'medium', reason: 'Session cookie (name starts with "session")' },
  { pattern: /sessid$/i, category: 'necessary', confidence: 'medium', reason: 'Session ID cookie' },
  { pattern: /^auth[_-]?token/i, category: 'necessary', confidence: 'medium', reason: 'Authentication token' },
  { pattern: /^access[_-]?token/i, category: 'necessary', confidence: 'medium', reason: 'Access token cookie' },
  { pattern: /^refresh[_-]?token/i, category: 'necessary', confidence: 'medium', reason: 'Refresh token cookie' },
  { pattern: /^__stripe/i, category: 'necessary', confidence: 'high', reason: 'Stripe payment prefix (__stripe)' },
  { pattern: /^__cf/i, category: 'necessary', confidence: 'high', reason: 'Cloudflare prefix (__cf)' },
  // Functional
  { pattern: /^lang/i, category: 'functional', confidence: 'medium', reason: 'Language preference cookie' },
  { pattern: /^locale/i, category: 'functional', confidence: 'medium', reason: 'Locale preference cookie' },
  { pattern: /^currency/i, category: 'functional', confidence: 'medium', reason: 'Currency preference cookie' },
  { pattern: /^theme/i, category: 'functional', confidence: 'low', reason: 'Theme preference cookie' },
  { pattern: /^pref/i, category: 'functional', confidence: 'low', reason: 'Preference cookie' },
  { pattern: /remember/i, category: 'functional', confidence: 'medium', reason: '"Remember me" functionality' },
  // Consent
  { pattern: /consent/i, category: 'necessary', confidence: 'high', reason: 'Consent preference storage cookie' },
  { pattern: /cookie[_-]?policy/i, category: 'necessary', confidence: 'high', reason: 'Cookie policy acknowledgement' },
  { pattern: /gdpr/i, category: 'necessary', confidence: 'high', reason: 'GDPR consent cookie' },
];

// ─── Tier 3: Domain/provider heuristics ───────────────────────────────────────
interface DomainRule {
  pattern: RegExp;
  category: CookieCategory;
  confidence: ClassificationConfidence;
  reason: string;
}

const DOMAIN_RULES: DomainRule[] = [
  // Analytics
  { pattern: /google-analytics\.com/i, category: 'analytics', confidence: 'high', reason: 'Cookie set by Google Analytics domain' },
  { pattern: /analytics\.google\.com/i, category: 'analytics', confidence: 'high', reason: 'Cookie from Google Analytics' },
  { pattern: /hotjar\.com/i, category: 'analytics', confidence: 'high', reason: 'Cookie set by Hotjar' },
  { pattern: /mixpanel\.com/i, category: 'analytics', confidence: 'high', reason: 'Cookie set by Mixpanel' },
  { pattern: /segment\.io/i, category: 'analytics', confidence: 'high', reason: 'Cookie set by Segment' },
  { pattern: /amplitude\.com/i, category: 'analytics', confidence: 'high', reason: 'Cookie set by Amplitude' },
  { pattern: /heap\.io/i, category: 'analytics', confidence: 'high', reason: 'Cookie set by Heap analytics' },
  { pattern: /fullstory\.com/i, category: 'analytics', confidence: 'high', reason: 'Cookie set by FullStory' },
  { pattern: /clarity\.ms/i, category: 'analytics', confidence: 'high', reason: 'Cookie set by Microsoft Clarity' },
  // Marketing / Advertising
  { pattern: /doubleclick\.net/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Google DoubleClick advertising' },
  { pattern: /googleadservices\.com/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Google Ad Services' },
  { pattern: /googlesyndication\.com/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Google Ad Syndication' },
  { pattern: /facebook\.com/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Facebook/Meta' },
  { pattern: /fbcdn\.net/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Facebook CDN' },
  { pattern: /linkedin\.com/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by LinkedIn advertising' },
  { pattern: /twitter\.com/i, category: 'marketing', confidence: 'medium', reason: 'Cookie set by Twitter' },
  { pattern: /ads\.yahoo\.com/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Yahoo Ads' },
  { pattern: /bing\.com/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Microsoft Bing Ads' },
  { pattern: /criteo\.com/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Criteo retargeting' },
  { pattern: /outbrain\.com/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Outbrain advertising' },
  { pattern: /taboola\.com/i, category: 'marketing', confidence: 'high', reason: 'Cookie set by Taboola' },
  // Necessary / Infrastructure
  { pattern: /cloudflare\.com/i, category: 'necessary', confidence: 'high', reason: 'Cookie set by Cloudflare security/CDN' },
  { pattern: /stripe\.com/i, category: 'necessary', confidence: 'high', reason: 'Cookie set by Stripe payment processing' },
  // Functional / Support
  { pattern: /intercom\.(io|com)/i, category: 'functional', confidence: 'high', reason: 'Cookie set by Intercom customer support' },
  { pattern: /zendesk\.com/i, category: 'functional', confidence: 'high', reason: 'Cookie set by Zendesk support' },
  { pattern: /freshdesk\.com/i, category: 'functional', confidence: 'high', reason: 'Cookie set by Freshdesk support' },
  { pattern: /hubspot\.com/i, category: 'analytics', confidence: 'high', reason: 'Cookie set by HubSpot CRM' },
];

// ─── Helper functions ──────────────────────────────────────────────────────────
function parseDuration(maxAge?: number | null, expiresAt?: Date | null): string {
  if (maxAge === 0) return 'Session';
  if (!maxAge && !expiresAt) return 'Session';
  const seconds = maxAge ?? Math.floor(((expiresAt?.getTime() ?? 0) - Date.now()) / 1000);
  if (seconds <= 0) return 'Session';
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 86400 * 30) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 86400 * 365) return `${Math.round(seconds / (86400 * 30))} months`;
  return `${Math.round(seconds / (86400 * 365))} years`;
}

// ─── Main classifier ──────────────────────────────────────────────────────────
export function classifyCookie(cookie: CookieInput): ClassificationResult & { durationLabel: string } {
  const name = cookie.name.trim();
  const domain = (cookie.domain || '').toLowerCase().replace(/^\./, '');
  const durationLabel = parseDuration(cookie.maxAge, cookie.expiresAt);
  const isSession = durationLabel === 'Session';

  // Tier 1: Known-cookie DB exact match
  const knownExact = KNOWN_COOKIES[name];
  if (knownExact) {
    return {
      category: knownExact.category,
      confidence: 'high',
      source: 'known_db',
      reason: `Known cookie: ${knownExact.description}`,
      durationLabel,
    };
  }

  // Known DB prefix match (e.g. _ga_XXXXXX)
  for (const [knownName, knownData] of Object.entries(KNOWN_COOKIES)) {
    if (knownName.endsWith('_') && name.startsWith(knownName)) {
      return {
        category: knownData.category,
        confidence: 'high',
        source: 'known_db',
        reason: `Known cookie prefix match: ${knownData.description}`,
        durationLabel,
      };
    }
  }

  // Tier 2: Name pattern rules
  for (const rule of NAME_PATTERNS) {
    if (rule.pattern.test(name)) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        source: 'name_pattern',
        reason: rule.reason,
        durationLabel,
      };
    }
  }

  // Tier 3: Domain heuristics (for third-party cookies)
  if (!cookie.isFirstParty && domain) {
    for (const rule of DOMAIN_RULES) {
      if (rule.pattern.test(domain)) {
        return {
          category: rule.category,
          confidence: rule.confidence,
          source: 'domain_heuristic',
          reason: rule.reason,
          durationLabel,
        };
      }
    }
  }

  // Tier 4: Duration heuristic
  if (isSession && cookie.httpOnly) {
    return {
      category: 'necessary',
      confidence: 'low',
      source: 'duration_heuristic',
      reason: 'Session-scoped httpOnly cookie — likely a server-side session or auth cookie',
      durationLabel,
    };
  }

  if (!cookie.isFirstParty && !isSession) {
    return {
      category: 'marketing',
      confidence: 'low',
      source: 'duration_heuristic',
      reason: 'Long-lived third-party cookie — likely for tracking or advertising',
      durationLabel,
    };
  }

  // Fallback
  return {
    category: 'uncategorized',
    confidence: 'none',
    source: 'unknown',
    reason: 'No classification rule matched — manual review required',
    durationLabel,
  };
}
