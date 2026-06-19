'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.getSites().then(res => { setSites(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setAdding(true); setError('');
    try {
      const res = await api.createSite(domain.trim(), displayName.trim() || undefined);
      setSites(prev => [res.data, ...prev]);
      setDomain(''); setDisplayName(''); setShowAdd(false);
    } catch (err: any) { setError(err.message); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This will remove all scan data.`)) {
      return;
    }
    try {
      await api.deleteSite(id);
      setSites(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error(error);
      alert("Failed to delete site");
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Sites</div>
          <div className="page-subtitle">Manage all your websites and their cookie inventory</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} id="add-site-btn">＋ Add Site</button>
      </div>
      <div className="page-content">
        {showAdd && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>Add Website</div>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input id="site-domain-input" className="form-input" placeholder="Domain (e.g. example.com)" value={domain} onChange={e => setDomain(e.target.value)} style={{ flex: 2, minWidth: 200 }} />
              <input className="form-input" placeholder="Display name (optional)" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
              <button type="submit" className="btn btn-primary" disabled={adding}>{adding ? 'Adding…' : 'Add'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </form>
            {error && <div className="alert alert-danger mt-2">{error}</div>}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
            {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />)}
          </div>
        ) : sites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌐</div>
            <div className="empty-title">No sites yet</div>
            <div className="empty-desc">Add your first website to begin scanning for cookies.</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>Add Your First Site</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
            {sites.map(site => {
              const lastScan = site.scanRuns?.[0];
              const statusColor = { done: 'var(--success)', running: 'var(--accent)', failed: 'var(--danger)', pending: 'var(--warning)' }[lastScan?.status] ?? 'var(--text-muted)';
              return (
                <div key={site.id} className="card" style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 16, right: 16 }}>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', fontSize: 16, padding: '4px 8px' }} onClick={() => handleDelete(site.id, site.domain)}>🗑</button>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{site.displayName || site.domain}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>🌐 {site.domain}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                    <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cookies</div><div style={{ fontWeight: 800, fontSize: 20 }}>{site._count?.cookies ?? 0}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Consent</div><div style={{ fontWeight: 800, fontSize: 20 }}>{site._count?.consentRecords ?? 0}</div></div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Scan</div>
                      <div style={{ color: statusColor, fontWeight: 600, fontSize: 13 }}>{lastScan?.status ?? 'Never'}</div>
                    </div>
                  </div>
                  <Link href={`/sites/${site.id}`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                    Open Dashboard →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
