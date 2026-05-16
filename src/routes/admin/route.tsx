import { createFileRoute, redirect, Outlet, Link } from '@tanstack/react-router';
import { getUserRole } from '../../lib/api';

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const role = getUserRole();
    if (role !== 'admin') {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#f3f4f6' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', background: '#1e1b4b', color: 'white', padding: '2rem 1rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', paddingLeft: '0.5rem', color: '#a5b4fc', letterSpacing: '1px', fontWeight: 'bold' }}>
          ADMIN PORTAL
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link
            to="/admin"
            style={{
              padding: '0.875rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'white',
              background: 'rgba(255,255,255,0.15)',
              fontWeight: 500
            }}
          >
            📊 Rubric Management
          </Link>
          <div style={{ padding: '0.875rem 1rem', color: '#6b7280', cursor: 'not-allowed', fontSize: '0.95rem' }}>
            👥 User Quotas (Dev)
          </div>
          <div style={{ padding: '0.875rem 1rem', color: '#6b7280', cursor: 'not-allowed', fontSize: '0.95rem' }}>
            📚 Content Moderation (Dev)
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}