'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login, register, user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: 'demo@acmecorp.com', password: 'password123', organizationName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Already logged in → redirect to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [user, loading, router]);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setSubmitting(false); }
  };

  // Show spinner while checking auth
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
        <div className="loading-spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  // Don't flash login form if already redirecting
  if (user) return null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #3B82F6, #6366f1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 0 24px rgba(59,130,246,0.3)' }}>🍪</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>CookieGuard</div>
        </div>
        <div className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create an account'}</div>
        <div className="auth-subtitle">
          {mode === 'login' ? 'Sign in to your cookie consent dashboard' : 'Get started with CookieGuard'}
        </div>

        {mode === 'login' && (
          <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 12 }}>
            💡 Demo credentials: <strong>demo@acmecorp.com</strong> / <strong>password123</strong>
          </div>
        )}

        {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input id="reg-name" className="form-input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Jane Smith" required />
              </div>
              <div className="form-group">
                <label className="form-label">Organization Name</label>
                <input id="reg-org" className="form-input" value={form.organizationName} onChange={e => update('organizationName', e.target.value)} placeholder="Acme Corp" required />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input id="login-email" type="email" className="form-input" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="login-password" type="password" className="form-input" value={form.password} onChange={e => update('password', e.target.value)} placeholder="••••••••" required />
          </div>
          <button id="login-submit" type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={submitting}>
            {submitting ? 'Signing in…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <>Don&apos;t have an account? <span className="auth-link" onClick={() => setMode('register')}>Register</span></>
          ) : (
            <>Already have an account? <span className="auth-link" onClick={() => setMode('login')}>Sign in</span></>
          )}
        </div>
      </div>
    </div>
  );
}
