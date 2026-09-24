import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { auth, logout } = useApp();
  const navigate = useNavigate();

  const getUserInitials = () => {
    if (!auth.user) return '?';
    if ('name' in auth.user && auth.user.name) {
      return auth.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return auth.user.email[0].toUpperCase();
  };

  const getUserName = () => {
    if (!auth.user) return '';
    if ('name' in auth.user && auth.user.name) return auth.user.name;
    return auth.user.email;
  };

  const getDashboardPath = () => {
    if (auth.role === 'ceo') return '/ceo/dashboard';
    if (auth.role === 'hr') return '/hr/dashboard';
    return '/candidate/dashboard';
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate(auth.isAuthenticated ? getDashboardPath() : '/')}>
        <span className="navbar-logo" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '-0.02em' }}>HIREPROOF</span>
      </div>

      <div className="navbar-actions">
        <ThemeToggle />

        {auth.isAuthenticated && (
          <>
            <div className="navbar-user" style={{ paddingLeft: '0.5rem', borderLeft: '1px solid var(--border)' }}>
              <div className="navbar-user-avatar">{getUserInitials()}</div>
              <div className="navbar-user-info" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="navbar-user-name">{getUserName()}</span>
                <span className="navbar-user-role">{auth.role} reviewer</span>
              </div>
            </div>

            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              title="Sign out of workspace"
              style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
