'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Site {
  id: string; domain: string; displayName: string;
  createdAt: string;
  scanRuns: Array<{ id: string; status: string; createdAt: string; cookiesFound: number; }>;
  _count: { cookies: number; consentRecords: number; };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { done: 'success', running: 'info', failed: 'danger', pending: 'warning' };
  return (
    <span className={`badge badge-${map[status] || 'neutral'}`}>
      <span className={`status-dot status-${status}`} style={{ width: 6, height: 6, display: 'inline-block', borderRadius: '50%', background: 'currentColor', marginRight: 4 }} />
      {status}
    </span>
  );
}

export default function OverviewPage() {
  const { user, org } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.getSites().then(res => { setSites(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const totalCookies = sites.reduce((a, s) => a + s._count.cookies, 0);
  const totalConsent = sites.reduce((a, s) => a + s._count.consentRecords, 0);
  const failedScans = sites.filter(s => s.scanRuns[0]?.status === 'failed').length;

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setAdding(true); setError('');
    try {
      const res = await api.createSite(domain.trim());
      setSites(prev => [res.data, ...prev]);
      setDomain(''); setShowAdd(false);
    } catch (err: any) {
      setError(err.message);
    } finally { setAdding(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Overview</div>
          <div className="page-subtitle">Welcome back, {user?.name} · {org?.name}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          ＋ Add Site
        </button>
      </div>

      <div className="page-content">
        {showAdd && (
          <div className="card mb-4" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>Add a Website</div>
            <form onSubmit={handleAddSite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                className="form-input"
                style={{ flex: 1, minWidth: 260 }}
                placeholder="e.g. example.com or https://example.com"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                id="new-site-domain"
              />
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? 'Adding…' : 'Add Site'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </form>
            {error && <div className="alert alert-danger mt-2">{error}</div>}
          </div>
        )}

        <div className="stats-grid">
          {[
            { label: 'Total Sites', value: sites.length, icon: '🌐', color: 'var(--accent)' },
            { label: 'Total Cookies Found', value: totalCookies, icon: '🍪', color: 'var(--success)' },
            { label: 'Consent Records', value: totalConsent, icon: '✅', color: 'var(--info)' },
            { label: 'Failed Scans', value: failedScans, icon: '⚠️', color: failedScans > 0 ? 'var(--danger)' : 'var(--success)' },
          ].map(s => (
            <div className="stat-card" key={s.label} style={{ '--stat-color': s.color } as React.CSSProperties}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{loading ? '—' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Your Websites</div>
              <div className="card-subtitle">{sites.length} site{sites.length !== 1 ? 's' : ''} configured</div>
            </div>
            <Link href="/sites" className="btn btn-ghost btn-sm">View all →</Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          ) : sites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌐</div>
              <div className="empty-title">No sites yet</div>
              <div className="empty-desc">Add your first website to start scanning for cookies.</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Last Scan</th>
                    <th>Cookies</th>
                    <th>Consent Records</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map(site => (
                    <tr key={site.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{site.displayName || site.domain}</div>
                        <div className="td-muted">{site.domain}</div>
                      </td>
                      <td>
                        {site.scanRuns[0] ? (
                          <StatusBadge status={site.scanRuns[0].status} />
                        ) : (
                          <span className="badge badge-neutral">Never scanned</span>
                        )}
                      </td>
                      <td><span style={{ fontWeight: 700 }}>{site._count.cookies}</span></td>
                      <td><span style={{ fontWeight: 700 }}>{site._count.consentRecords}</span></td>
                      <td>
                        <Link href={`/sites/${site.id}`} className="btn btn-secondary btn-sm">
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
