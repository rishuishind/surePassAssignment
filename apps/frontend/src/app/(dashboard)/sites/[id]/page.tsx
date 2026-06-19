'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type TabId = 'scan' | 'cookies' | 'banner' | 'consent' | 'policy';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'scan', label: 'Scan', icon: '🔍' },
  { id: 'cookies', label: 'Cookie Inventory', icon: '🍪' },
  { id: 'banner', label: 'Banner Builder', icon: '🎨' },
  { id: 'consent', label: 'Consent Log', icon: '📋' },
  { id: 'policy', label: 'Cookie Policy', icon: '📄' },
];

const CATEGORY_COLORS: Record<string, string> = {
  necessary: 'badge-necessary', functional: 'badge-functional',
  analytics: 'badge-analytics', marketing: 'badge-marketing', uncategorized: 'badge-uncategorized',
};

// ─── Scan Tab ─────────────────────────────────────────────────────────────────
function ScanTab({ siteId }: { siteId: string }) {
  const [scans, setScans] = useState<any[]>([]);
  const [activeScan, setActiveScan] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<any[]>([]);

  const fetchScans = useCallback(async () => {
    const res = await api.getScans(siteId);
    setScans(res.data);
    const running = res.data.find((s: any) => s.status === 'running' || s.status === 'pending');
    if (running) {
      setActiveScan(running);
      setScanning(true);
    }
  }, [siteId]);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  useEffect(() => {
    if (!scanning || !activeScan) return;
    const poll = setInterval(async () => {
      const res = await api.getScan(activeScan.id);
      setActiveScan(res.data);
      setLogs(res.data.logs || []);
      if (res.data.status === 'done' || res.data.status === 'failed') {
        setScanning(false);
        fetchScans();
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [scanning, activeScan, fetchScans]);

  const handleScan = async () => {
    setError(''); setScanning(true); setLogs([]);
    try {
      const res = await api.triggerScan(siteId);
      setActiveScan(res.data);
    } catch (err: any) {
      setError(err.message); setScanning(false);
    }
  };

  const showScan = async (scan: any) => {
    const res = await api.getScan(scan.id);
    setActiveScan(res.data);
    setLogs(res.data.logs || []);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Run a Scan</div>
            <div className="card-subtitle">Crawl the site with a headless browser to discover cookies</div>
          </div>
          <button className="btn btn-primary" onClick={handleScan} disabled={scanning} id="trigger-scan-btn">
            {scanning ? <><div className="loading-spinner" style={{ width: 14, height: 14 }} /> Scanning…</> : '▶ Start Scan'}
          </button>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}

        {activeScan && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Status', value: <span className={`badge badge-${activeScan.status === 'done' ? 'success' : activeScan.status === 'failed' ? 'danger' : activeScan.status === 'running' ? 'info' : 'warning'}`}>{activeScan.status}</span> },
                { label: 'Pages Visited', value: activeScan.pagesVisited },
                { label: 'Cookies Found', value: activeScan.cookiesFound },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {activeScan.errorMessage && (
              <div className="alert alert-danger" style={{ marginBottom: 12 }}>{activeScan.errorMessage}</div>
            )}

            <div className="card-title" style={{ fontSize: 13, marginBottom: 8 }}>Scan Logs</div>
            <div className="log-viewer">
              {logs.length === 0 && scanning && <div className="log-info">Initializing scanner…</div>}
              {logs.map((log: any) => (
                <div key={log.id} className={`log-line log-${log.level}`}>
                  <span className="log-time">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  <span>{log.url ? `[${log.url.substring(0, 50)}] ` : ''}{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Scan History</div>
        {scans.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No scans yet</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Date</th><th>Status</th><th>Pages</th><th>Cookies</th><th></th></tr>
              </thead>
              <tbody>
                {scans.map((scan: any) => (
                  <tr key={scan.id} style={{ cursor: 'pointer' }} onClick={() => showScan(scan)}>
                    <td className="td-muted">{new Date(scan.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${scan.status === 'done' ? 'success' : scan.status === 'failed' ? 'danger' : scan.status === 'running' ? 'info' : 'warning'}`}>
                        {scan.status}
                      </span>
                    </td>
                    <td>{scan.pagesVisited}</td>
                    <td>{scan.cookiesFound}</td>
                    <td><button className="btn btn-ghost btn-sm">View Logs</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cookies Tab ──────────────────────────────────────────────────────────────
function CookiesTab({ siteId }: { siteId: string }) {
  const [cookies, setCookies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);

  const fetchCookies = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '30' };
    if (search) params.search = search;
    if (category !== 'all') params.category = category;
    if (type !== 'all') params.type = type;
    const res = await api.getCookies(siteId, params);
    setCookies(res.data);
    setMeta(res.meta);
    setLoading(false);
  }, [siteId, search, category, type, page]);

  useEffect(() => { fetchCookies(); }, [fetchCookies]);

  const saveEdit = async (id: string) => {
    await api.patchCookie(id, { category: editVal });
    setEditing(null);
    fetchCookies();
  };

  const effectiveCat = (c: any) => c.manualCategory ?? c.autoCategory;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by name, domain, description…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-select" style={{ width: 160 }} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
          <option value="all">All Categories</option>
          <option value="necessary">Necessary</option>
          <option value="functional">Functional</option>
          <option value="analytics">Analytics</option>
          <option value="marketing">Marketing</option>
          <option value="uncategorized">Uncategorized</option>
        </select>
        <select className="form-select" style={{ width: 140 }} value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
          <option value="all">All Types</option>
          <option value="first-party">1st Party</option>
          <option value="third-party">3rd Party</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta.total} cookies found</div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
        </div>
      ) : cookies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍪</div>
          <div className="empty-title">No cookies found</div>
          <div className="empty-desc">Run a scan first to discover cookies, or adjust your filters.</div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Category</th><th>Type</th><th>Domain</th>
                  <th>Duration</th><th>Secure</th><th>httpOnly</th>
                  <th>Confidence</th><th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {cookies.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{c.name}</div>
                      {c.isManuallyReviewed && <span className="badge badge-info" style={{ fontSize: 9, marginTop: 3 }}>Reviewed</span>}
                    </td>
                    <td>
                      {editing === c.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select
                            className="form-select"
                            style={{ fontSize: 12, padding: '4px 6px', width: 130 }}
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                          >
                            {['necessary','functional','analytics','marketing','uncategorized'].map(cat =>
                              <option key={cat} value={cat}>{cat}</option>
                            )}
                          </select>
                          <button className="btn btn-primary btn-sm" onClick={() => saveEdit(c.id)}>✓</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✗</button>
                        </div>
                      ) : (
                        <span
                          className={`badge ${CATEGORY_COLORS[effectiveCat(c)]}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => { setEditing(c.id); setEditVal(effectiveCat(c)); }}
                          title="Click to edit"
                        >
                          {effectiveCat(c)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${c.isFirstParty ? 'badge-success' : 'badge-warning'}`}>
                        {c.isFirstParty ? '1st' : '3rd'}
                      </span>
                    </td>
                    <td className="td-muted font-mono" style={{ fontSize: 11 }}>{c.domain}</td>
                    <td className="td-muted">{c.durationLabel || '—'}</td>
                    <td>{c.secure ? '🔒' : '—'}</td>
                    <td>{c.httpOnly ? '🛡️' : '—'}</td>
                    <td>
                      <span className={`badge badge-${c.autoConfidence === 'high' ? 'success' : c.autoConfidence === 'medium' ? 'warning' : c.autoConfidence === 'low' ? 'danger' : 'neutral'}`}>
                        {c.autoConfidence}
                      </span>
                    </td>
                    <td className="td-muted">{new Date(c.lastSeenAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="pagination-info">Page {page} of {meta.totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Banner Tab ───────────────────────────────────────────────────────────────
function BannerTab({ siteId }: { siteId: string }) {
  const [config, setConfig] = useState<any>({
    title: 'We value your privacy',
    description: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.',
    acceptLabel: 'Accept All',
    rejectLabel: 'Reject All',
    preferencesLabel: 'Manage Preferences',
    position: 'bottom',
    primaryColor: '#3B82F6',
    backgroundColor: '#1E293B',
    textColor: '#F1F5F9',
    buttonTextColor: '#FFFFFF',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [snippet, setSnippet] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getBanner(siteId).then(res => {
      if (res.data) setConfig(res.data);
    }).catch(() => {});
    api.getSnippet(siteId).then(res => setSnippet(res.data.snippet)).catch(() => {});
  }, [siteId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.saveBanner(siteId, config);
      setSaved(true);
      const snippetRes = await api.getSnippet(siteId);
      setSnippet(snippetRes.data.snippet);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const update = (key: string, val: string) => setConfig((c: any) => ({ ...c, [key]: val }));

  return (
    <div className="banner-builder">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Banner Content</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'title', label: 'Title', placeholder: 'We use cookies' },
              { key: 'acceptLabel', label: 'Accept Button', placeholder: 'Accept All' },
              { key: 'rejectLabel', label: 'Reject Button', placeholder: 'Reject All' },
              { key: 'preferencesLabel', label: 'Preferences Button', placeholder: 'Manage Preferences' },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <input
                  className="form-input"
                  value={config[f.key] || ''}
                  onChange={e => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={config.description || ''}
                onChange={e => update('description', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Appearance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Position</label>
              <select className="form-select" value={config.position || 'bottom'} onChange={e => update('position', e.target.value)}>
                <option value="bottom">Bottom Bar</option>
                <option value="top">Top Bar</option>
                <option value="modal">Center Modal</option>
                <option value="corner">Bottom Corner</option>
              </select>
            </div>
            {[
              { key: 'primaryColor', label: 'Accent Color' },
              { key: 'backgroundColor', label: 'Background Color' },
              { key: 'textColor', label: 'Text Color' },
              { key: 'buttonTextColor', label: 'Button Text Color' },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="color-swatch">
                    <input type="color" value={config[f.key] || '#000000'} onChange={e => update(f.key, e.target.value)} />
                  </div>
                  <input className="form-input" value={config[f.key] || ''} onChange={e => update(f.key, e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={save} disabled={saving} id="save-banner-btn">
          {saving ? 'Saving…' : saved ? '✓ Saved!' : '💾 Save Banner Config'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Live Preview</div>
          <div className="banner-preview-frame">
            <div className="preview-browser-bar">
              <div className="browser-dot" /><div className="browser-dot" /><div className="browser-dot" />
              <div className="preview-url">yourwebsite.com</div>
            </div>
            <div className="preview-site-content">
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Welcome to Your Website</div>
              <p>This is a preview of how your website content looks beneath the cookie consent banner.</p>
            </div>

            {/* Inline preview banner */}
            <div style={{
              position: config.position === 'modal' ? 'absolute' : 'absolute',
              ...(config.position === 'bottom' ? { bottom: 0, left: 0, right: 0 } :
                 config.position === 'top' ? { top: 42, left: 0, right: 0 } :
                 config.position === 'modal' ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', maxWidth: 320, width: '90%', borderRadius: 10 } :
                 { bottom: 12, left: 12, maxWidth: 260, borderRadius: 10 }),
              background: config.backgroundColor,
              borderTop: config.position === 'bottom' ? `2px solid ${config.primaryColor}` : 'none',
              borderLeft: ['modal','corner'].includes(config.position) ? `3px solid ${config.primaryColor}` : 'none',
              borderRadius: ['modal','corner'].includes(config.position) ? 10 : 0,
              padding: '14px 16px',
              fontSize: 11,
              color: config.textColor,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 5 }}>{config.title}</div>
              <div style={{ opacity: 0.8, marginBottom: 10, lineHeight: 1.4 }}>{config.description?.substring(0, 80)}…</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button style={{ background: config.primaryColor, color: config.buttonTextColor, border: 'none', padding: '5px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'default' }}>
                  {config.acceptLabel}
                </button>
                <button style={{ background: 'transparent', color: config.textColor, border: '1px solid rgba(255,255,255,0.3)', padding: '5px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'default' }}>
                  {config.rejectLabel}
                </button>
                <button style={{ background: 'transparent', color: config.primaryColor, border: `1px solid ${config.primaryColor}`, padding: '5px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'default' }}>
                  {config.preferencesLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        {snippet && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Embed Snippet</div>
              <button className="btn btn-secondary btn-sm" onClick={copy}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <div className="card-subtitle" style={{ marginBottom: 12 }}>
              Paste this into the {'<head>'} of your website
            </div>
            <div className="code-block">{snippet}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Consent Tab ──────────────────────────────────────────────────────────────
function ConsentTab({ siteId }: { siteId: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [action, setAction] = useState('all');
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    api.getConsentStats(siteId).then(res => setStats(res.data)).catch(() => {});
  }, [siteId]);

  const fetch = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page) };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (action !== 'all') params.action = action;
    const res = await api.getConsent(siteId, params);
    setRecords(res.data);
    setMeta(res.meta);
    setLoading(false);
  }, [siteId, startDate, endDate, action, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const exportCSV = async () => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await api.exportConsent(siteId, params);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `consent-records.csv`; a.click();
  };

  const statsMap: Record<string, number> = {};
  stats.forEach((s: any) => { statsMap[s.action] = s._count; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Accepted', key: 'accepted', color: 'var(--success)', icon: '✅' },
          { label: 'Rejected', key: 'rejected', color: 'var(--danger)', icon: '❌' },
          { label: 'Customized', key: 'customized', color: 'var(--warning)', icon: '⚙️' },
        ].map(s => (
          <div className="stat-card" key={s.key} style={{ '--stat-color': s.color } as React.CSSProperties}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{statsMap[s.key] || 0}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="search-bar">
        <input type="date" className="form-input" style={{ width: 160 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span style={{ color: 'var(--text-muted)' }}>to</span>
        <input type="date" className="form-input" style={{ width: 160 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        <select className="form-select" style={{ width: 140 }} value={action} onChange={e => setAction(e.target.value)}>
          <option value="all">All Actions</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="customized">Customized</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 Export CSV</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No consent records yet</div>
          <div className="empty-desc">Consent events will appear here when visitors interact with your banner.</div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Visitor ID</th><th>Action</th><th>Categories</th><th>Banner Version</th><th>Source</th><th>Timestamp</th></tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-mono td-muted" style={{ fontSize: 11 }}>{r.visitorId}</td>
                    <td>
                      <span className={`badge badge-${r.action === 'accepted' ? 'success' : r.action === 'rejected' ? 'danger' : 'warning'}`}>
                        {r.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {JSON.parse(r.categoriesAllowed || '[]').map((cat: string) => (
                          <span key={cat} className={`badge ${CATEGORY_COLORS[cat] || 'badge-neutral'}`} style={{ fontSize: 10 }}>{cat}</span>
                        ))}
                      </div>
                    </td>
                    <td className="td-muted">v{r.bannerVersion ?? '—'}</td>
                    <td className="td-muted">{r.source}</td>
                    <td className="td-muted">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="pagination-info">{meta.total} records · Page {page} of {meta.totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Policy Tab ───────────────────────────────────────────────────────────────
function PolicyTab({ siteId }: { siteId: string }) {
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPolicy(siteId).then(res => { setPolicy(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, [siteId]);

  const download = () => {
    if (!policy) return;
    let text = `Cookie Policy — ${policy.siteDomain}\nGenerated: ${new Date(policy.generatedAt).toLocaleDateString()}\n\n`;
    policy.sections.forEach((s: any) => {
      text += `\n## ${s.label} Cookies\n${'─'.repeat(40)}\n`;
      s.cookies.forEach((c: any) => {
        text += `\n${c.name}\n  Provider: ${c.domain}\n  Type: ${c.type}\n  Duration: ${c.duration}\n  Purpose: ${c.description}\n`;
      });
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `cookie-policy-${policy.siteDomain}.txt`;
    a.click();
  };

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><div className="loading-spinner" /></div>;
  if (!policy || policy.sections.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon">📄</div>
      <div className="empty-title">No cookies to generate a policy from</div>
      <div className="empty-desc">Run a scan first to discover cookies, then return here.</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Cookie Policy — {policy.siteDomain}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Generated {new Date(policy.generatedAt).toLocaleDateString()} · {policy.totalCookies} cookies</div>
        </div>
        <button className="btn btn-secondary" onClick={download}>📥 Download .txt</button>
      </div>

      {policy.sections.map((section: any) => (
        <div key={section.category} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span className={`badge ${CATEGORY_COLORS[section.category]}`} style={{ fontSize: 12, padding: '3px 12px' }}>{section.label}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{section.cookies.length} cookie{section.cookies.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Name</th><th>Provider</th><th>Type</th><th>Duration</th><th>Purpose</th></tr>
              </thead>
              <tbody>
                {section.cookies.map((c: any) => (
                  <tr key={c.name}>
                    <td className="font-mono" style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</td>
                    <td className="td-muted">{c.domain}</td>
                    <td><span className={`badge ${c.type === 'First-party' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10 }}>{c.type}</span></td>
                    <td className="td-muted">{c.duration || <span style={{ color: 'var(--danger)' }}>Unknown</span>}</td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 300 }}>
                      {c.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Site Page ───────────────────────────────────────────────────────────
export default function SitePage() {
  const params = useParams();
  const siteId = params.id as string;
  const [site, setSite] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('scan');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSite(siteId).then(res => { setSite(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, [siteId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="loading-spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (!site) return (
    <div className="page-content">
      <div className="empty-state"><div className="empty-title">Site not found</div></div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link href="/">Overview</Link>
            <span className="breadcrumb-sep">/</span>
            <span>Sites</span>
          </div>
          <div className="page-title">{site.displayName || site.domain}</div>
          <div className="page-subtitle">🌐 {site.domain} · {site._count?.cookies || 0} cookies · {site._count?.consentRecords || 0} consent records</div>
        </div>
      </div>

      <div style={{ padding: '0 32px' }}>
        <div className="tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">
        {activeTab === 'scan' && <ScanTab siteId={siteId} />}
        {activeTab === 'cookies' && <CookiesTab siteId={siteId} />}
        {activeTab === 'banner' && <BannerTab siteId={siteId} />}
        {activeTab === 'consent' && <ConsentTab siteId={siteId} />}
        {activeTab === 'policy' && <PolicyTab siteId={siteId} />}
      </div>
    </>
  );
}
