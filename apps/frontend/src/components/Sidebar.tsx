'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/', label: 'Overview', icon: '⬛' },
  { href: '/sites', label: 'Sites', icon: '🌐' },
  { href: '/health', label: 'Health & Logs', icon: '🩺' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, org, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🍪</div>
        <div className="logo-text">CookieGuard</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" onClick={logout} title="Click to logout">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-org">{org?.name || 'Organization'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
