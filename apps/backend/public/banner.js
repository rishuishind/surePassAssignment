/**
 * CookieGuard Consent Banner - Embeddable Script
 * Install on any page:
 *   <script src="http://localhost:4000/embed/banner.js" data-site-id="SITE_ID" data-api-url="http://localhost:4000" async></script>
 *
 * The script will:
 * 1. Fetch the banner configuration from the API
 * 2. Render the consent banner
 * 3. Handle Accept / Reject / Preferences interactions
 * 4. Post consent events back to the API
 * 5. Store consent choice in localStorage to avoid reshowing
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'cookieguard_consent';
  var VISITOR_KEY = 'cookieguard_visitor_id';

  // Get script tag attributes
  var scriptEl = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var SITE_ID = scriptEl.getAttribute('data-site-id');
  var API_URL = (scriptEl.getAttribute('data-api-url') || 'http://localhost:4000').replace(/\/$/, '');

  if (!SITE_ID) {
    console.warn('[CookieGuard] Missing data-site-id attribute on script tag');
    return;
  }

  // Generate or retrieve anonymous visitor ID
  function getVisitorId() {
    var id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = 'v-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  }

  // Check if consent already given
  function getStoredConsent() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch(e) {
      return null;
    }
  }

  function storeConsent(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Post consent to API
  function recordConsent(action, categoriesAllowed, config) {
    var body = {
      siteId: SITE_ID,
      bannerConfigId: config.id,
      bannerVersion: config.version,
      visitorId: getVisitorId(),
      action: action,
      categoriesAllowed: categoriesAllowed,
      source: 'embedded_banner',
      userAgent: navigator.userAgent
    };

    fetch(API_URL + '/api/public/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(function(err) {
      console.warn('[CookieGuard] Failed to record consent:', err);
    });

    storeConsent({ action: action, categoriesAllowed: categoriesAllowed, bannerVersion: config.version, timestamp: Date.now() });
  }

  // Inject CSS styles
  function injectStyles(config) {
    var style = document.createElement('style');
    style.textContent = '\n' +
      '#cookieguard-banner {\n' +
      '  position: fixed;\n' +
      '  z-index: 2147483647;\n' +
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n' +
      '  font-size: 14px;\n' +
      '  line-height: 1.5;\n' +
      '  box-sizing: border-box;\n' +
      '  animation: cg-slide-in 0.3s ease-out;\n' +
      '}\n' +
      '#cookieguard-banner * { box-sizing: border-box; }\n' +

      // Position variants
      '#cookieguard-banner.cg-bottom { bottom: 0; left: 0; right: 0; }\n' +
      '#cookieguard-banner.cg-top { top: 0; left: 0; right: 0; }\n' +
      '#cookieguard-banner.cg-modal { top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 560px; width: 90%; border-radius: 12px; }\n' +
      '#cookieguard-banner.cg-corner { bottom: 24px; left: 24px; max-width: 380px; border-radius: 12px; }\n' +

      '.cg-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2147483646; }\n' +

      '.cg-content {\n' +
      '  background: ' + config.backgroundColor + ';\n' +
      '  color: ' + config.textColor + ';\n' +
      '  padding: 20px 24px;\n' +
      '  border-top: 3px solid ' + config.primaryColor + ';\n' +
      '}\n' +
      '#cookieguard-banner.cg-modal .cg-content, #cookieguard-banner.cg-corner .cg-content {\n' +
      '  border-top: none;\n' +
      '  border-left: 4px solid ' + config.primaryColor + ';\n' +
      '  border-radius: 12px;\n' +
      '}\n' +

      '.cg-title { font-size: 16px; font-weight: 700; margin: 0 0 8px; color: ' + config.textColor + '; }\n' +
      '.cg-description { margin: 0 0 16px; opacity: 0.85; }\n' +

      '.cg-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }\n' +
      '.cg-btn {\n' +
      '  padding: 8px 18px;\n' +
      '  border: none;\n' +
      '  border-radius: 6px;\n' +
      '  font-size: 13px;\n' +
      '  font-weight: 600;\n' +
      '  cursor: pointer;\n' +
      '  transition: opacity 0.15s, transform 0.1s;\n' +
      '}\n' +
      '.cg-btn:hover { opacity: 0.9; transform: translateY(-1px); }\n' +
      '.cg-btn-accept { background: ' + config.primaryColor + '; color: ' + config.buttonTextColor + '; }\n' +
      '.cg-btn-reject { background: transparent; color: ' + config.textColor + '; border: 1.5px solid rgba(255,255,255,0.25); }\n' +
      '.cg-btn-prefs { background: transparent; color: ' + config.primaryColor + '; border: 1.5px solid ' + config.primaryColor + '; }\n' +

      '.cg-prefs-panel { margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; display: none; }\n' +
      '.cg-prefs-panel.open { display: block; }\n' +
      '.cg-category { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }\n' +
      '.cg-category-info { flex: 1; }\n' +
      '.cg-category-label { font-weight: 600; font-size: 13px; }\n' +
      '.cg-category-desc { font-size: 12px; opacity: 0.7; margin-top: 2px; }\n' +
      '.cg-toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; margin-top: 2px; }\n' +
      '.cg-toggle input { opacity: 0; width: 0; height: 0; }\n' +
      '.cg-slider {\n' +
      '  position: absolute; cursor: pointer; inset: 0;\n' +
      '  background: rgba(255,255,255,0.2); border-radius: 20px;\n' +
      '  transition: 0.2s;\n' +
      '}\n' +
      '.cg-slider:before {\n' +
      '  content: "";\n' +
      '  position: absolute; width: 14px; height: 14px;\n' +
      '  left: 3px; bottom: 3px;\n' +
      '  background: white; border-radius: 50%; transition: 0.2s;\n' +
      '}\n' +
      '.cg-toggle input:checked + .cg-slider { background: ' + config.primaryColor + '; }\n' +
      '.cg-toggle input:checked + .cg-slider:before { transform: translateX(16px); }\n' +
      '.cg-toggle input:disabled + .cg-slider { opacity: 0.6; cursor: not-allowed; }\n' +

      '.cg-save-prefs {\n' +
      '  margin-top: 12px;\n' +
      '  width: 100%;\n' +
      '  padding: 9px;\n' +
      '  background: ' + config.primaryColor + ';\n' +
      '  color: ' + config.buttonTextColor + ';\n' +
      '  border: none; border-radius: 6px;\n' +
      '  font-weight: 600; cursor: pointer; font-size: 13px;\n' +
      '}\n' +

      '@keyframes cg-slide-in {\n' +
      '  from { opacity: 0; transform: translateY(20px); }\n' +
      '  to { opacity: 1; transform: translateY(0); }\n' +
      '}\n' +
      '#cookieguard-banner.cg-top { animation-name: cg-slide-in-top; }\n' +
      '@keyframes cg-slide-in-top {\n' +
      '  from { opacity: 0; transform: translateY(-20px); }\n' +
      '  to { opacity: 1; transform: translateY(0); }\n' +
      '}\n';
    document.head.appendChild(style);
  }

  // Build default category list
  function buildCategories(configCats) {
    var defaults = [
      { id: 'necessary', label: 'Necessary', description: 'Required for the website to function. Cannot be disabled.', required: true },
      { id: 'functional', label: 'Functional', description: 'Enable enhanced features and personalization.', required: false },
      { id: 'analytics', label: 'Analytics', description: 'Help us understand how visitors use the site.', required: false },
      { id: 'marketing', label: 'Marketing', description: 'Used to deliver relevant advertisements.', required: false },
    ];
    if (configCats && configCats.length > 0) {
      return configCats.map(function(cat) {
        var def = defaults.find(function(d) { return d.id === cat.id; }) || {};
        return Object.assign({}, def, cat);
      });
    }
    return defaults;
  }

  // Render the banner
  function renderBanner(config) {
    var position = config.position || 'bottom';
    var categories = buildCategories(config.categoryConfigs);
    var prefsOpen = false;

    // Create overlay for modal
    var overlay = null;
    if (position === 'modal') {
      overlay = document.createElement('div');
      overlay.className = 'cg-overlay';
      document.body.appendChild(overlay);
    }

    var banner = document.createElement('div');
    banner.id = 'cookieguard-banner';
    banner.className = 'cg-' + position;

    // Build categories HTML
    var catsHtml = categories.map(function(cat) {
      var isRequired = cat.required || cat.id === 'necessary';
      return '<div class="cg-category">' +
        '<div class="cg-category-info">' +
          '<div class="cg-category-label">' + escapeHtml(cat.label || cat.id) + (isRequired ? ' <span style="font-size:11px;opacity:0.6">(Always on)</span>' : '') + '</div>' +
          '<div class="cg-category-desc">' + escapeHtml(cat.description || '') + '</div>' +
        '</div>' +
        '<label class="cg-toggle">' +
          '<input type="checkbox" data-cat="' + cat.id + '" ' + (isRequired ? 'checked disabled' : 'checked') + '>' +
          '<span class="cg-slider"></span>' +
        '</label>' +
      '</div>';
    }).join('');

    banner.innerHTML =
      '<div class="cg-content">' +
        '<div class="cg-title">' + escapeHtml(config.title) + '</div>' +
        '<div class="cg-description">' + escapeHtml(config.description) + '</div>' +
        '<div class="cg-actions">' +
          '<button class="cg-btn cg-btn-accept" id="cg-accept">' + escapeHtml(config.acceptLabel) + '</button>' +
          '<button class="cg-btn cg-btn-reject" id="cg-reject">' + escapeHtml(config.rejectLabel) + '</button>' +
          '<button class="cg-btn cg-btn-prefs" id="cg-prefs-toggle">' + escapeHtml(config.preferencesLabel) + '</button>' +
        '</div>' +
        '<div class="cg-prefs-panel" id="cg-prefs-panel">' +
          catsHtml +
          '<button class="cg-save-prefs" id="cg-save-prefs">Save My Preferences</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(banner);

    function removeBanner() {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    // Accept All
    document.getElementById('cg-accept').addEventListener('click', function() {
      var all = categories.map(function(c) { return c.id; });
      recordConsent('accepted', all, config);
      removeBanner();
    });

    // Reject All (keep only necessary)
    document.getElementById('cg-reject').addEventListener('click', function() {
      recordConsent('rejected', ['necessary'], config);
      removeBanner();
    });

    // Toggle preferences panel
    document.getElementById('cg-prefs-toggle').addEventListener('click', function() {
      prefsOpen = !prefsOpen;
      var panel = document.getElementById('cg-prefs-panel');
      panel.className = 'cg-prefs-panel' + (prefsOpen ? ' open' : '');
    });

    // Save preferences
    document.getElementById('cg-save-prefs').addEventListener('click', function() {
      var checkboxes = banner.querySelectorAll('[data-cat]');
      var allowed = [];
      checkboxes.forEach(function(cb) {
        if (cb.checked) allowed.push(cb.getAttribute('data-cat'));
      });
      recordConsent('customized', allowed, config);
      removeBanner();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Main init
  function init() {
    // Don't show if consent already stored (and banner version matches)
    var stored = getStoredConsent();
    if (stored) {
      return; // Already consented
    }

    fetch(API_URL + '/api/public/banner/' + SITE_ID)
      .then(function(res) { return res.json(); })
      .then(function(json) {
        if (!json.success || !json.data) {
          console.warn('[CookieGuard] No banner configured for site:', SITE_ID);
          return;
        }
        var config = json.data;
        injectStyles(config);
        renderBanner(config);
      })
      .catch(function(err) {
        console.warn('[CookieGuard] Failed to load banner config:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
