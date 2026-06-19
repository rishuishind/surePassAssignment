const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cookieguard_token');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'API error');
  }
  return json;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiFetch<any>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { name: string; email: string; password: string; organizationName: string }) =>
    apiFetch<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiFetch<any>('/api/auth/me'),

  // Sites
  getSites: () => apiFetch<any>('/api/sites'),
  createSite: (domain: string, displayName?: string) =>
    apiFetch<any>('/api/sites', { method: 'POST', body: JSON.stringify({ domain, displayName }) }),
  getSite: (id: string) => apiFetch<any>(`/api/sites/${id}`),
  deleteSite: (id: string) => apiFetch<any>(`/api/sites/${id}`, { method: 'DELETE' }),

  // Scans
  triggerScan: (siteId: string) =>
    apiFetch<any>(`/api/scans/sites/${siteId}/trigger`, { method: 'POST' }),
  getScans: (siteId: string) => apiFetch<any>(`/api/scans/sites/${siteId}`),
  getScan: (scanId: string) => apiFetch<any>(`/api/scans/${scanId}`),

  // Cookies
  getCookies: (siteId: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/api/cookies/sites/${siteId}${qs}`);
  },
  getCookie: (id: string) => apiFetch<any>(`/api/cookies/${id}`),
  patchCookie: (id: string, data: { category?: string; description?: string }) =>
    apiFetch<any>(`/api/cookies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  overrideCookie: (id: string, data: { category?: string; description?: string }) =>
    apiFetch<any>(`/api/cookies/${id}/override`, { method: 'POST', body: JSON.stringify(data) }),
  resetOverride: (id: string) =>
    apiFetch<any>(`/api/cookies/${id}/override`, { method: 'DELETE' }),

  // Banners
  getBanner: (siteId: string) => apiFetch<any>(`/api/banners/sites/${siteId}`),
  saveBanner: (siteId: string, config: any) =>
    apiFetch<any>(`/api/banners/sites/${siteId}`, { method: 'PUT', body: JSON.stringify(config) }),
  getSnippet: (siteId: string) => apiFetch<any>(`/api/banners/sites/${siteId}/snippet`),
  getBannerHistory: (siteId: string) => apiFetch<any>(`/api/banners/sites/${siteId}/history`),

  // Consent
  getConsent: (siteId: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/api/consent/sites/${siteId}${qs}`);
  },
  getConsentStats: (siteId: string) => apiFetch<any>(`/api/consent/sites/${siteId}/stats`),
  exportConsent: (siteId: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const token = getToken();
    return fetch(`${API_URL}/api/consent/sites/${siteId}/export${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Policy
  getPolicy: (siteId: string) => apiFetch<any>(`/api/policy/sites/${siteId}`),

  // Health
  getHealth: () => apiFetch<any>('/api/health'),
};

export { API_URL };
