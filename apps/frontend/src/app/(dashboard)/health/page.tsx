'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHealth().then(res => { setHealth(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="loading-spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Health & Logs</div>
          <div className="page-subtitle">Scanner performance, errors, and system status</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: health?.status === 'healthy' ? 'var(--success-dim)' : 'var(--danger-dim)',
          color: health?.status === 'healthy' ? 'var(--success)' : 'var(--danger)',
          padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600,
        }}>
          <span>{health?.status === 'healthy' ? '✅' : '⚠️'}</span>
          {health?.status === 'healthy' ? 'System Healthy' : 'Degraded'}
        </div>
      </div>

      <div className="page-content">
        <div className="stats-grid">
          {[
            { label: 'Total Sites', value: health?.totalSites, icon: '🌐', color: 'var(--accent)' },
            { label: 'Total Cookies', value: health?.totalCookies, icon: '🍪', color: 'var(--success)' },
            { label: 'Failed Scans', value: health?.failedScans, icon: '❌', color: health?.failedScans > 0 ? 'var(--danger)' : 'var(--success)' },
            { label: 'Uncategorized Cookies', value: health?.uncategorizedCount, icon: '❓', color: health?.uncategorizedCount > 0 ? 'var(--warning)' : 'var(--success)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ '--stat-color': s.color } as React.CSSProperties}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.value ?? '—'}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Recent Scans</div>
            {health?.recentScans?.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-desc">No scans yet</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {health?.recentScans?.map((scan: any) => (
                  <div key={scan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{scan.site?.domain}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(scan.createdAt).toLocaleString()}</div>
                    </div>
                    <span className={`badge badge-${scan.status === 'done' ? 'success' : scan.status === 'failed' ? 'danger' : scan.status === 'running' ? 'info' : 'warning'}`}>
                      {scan.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Recent Errors</div>
            {health?.recentErrors?.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div className="empty-icon" style={{ fontSize: 24 }}>✅</div>
                <div className="empty-desc">No errors recorded</div>
              </div>
            ) : (
              <div className="log-viewer">
                {health?.recentErrors?.map((err: any, i: number) => (
                  <div key={i} className="log-line log-error">
                    <span className="log-time">{new Date(err.createdAt).toLocaleTimeString()}</span>
                    <span>{err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
