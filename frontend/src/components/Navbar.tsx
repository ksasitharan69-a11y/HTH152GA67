import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LogOut, Home } from 'lucide-react';

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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        <span className="navbar-logo">HireProof AI</span>
      </div>

      <div className="navbar-actions">
        {auth.isAuthenticated && (
          <>
            <div className="navbar-user">
              <div className="navbar-user-avatar">{getUserInitials()}</div>
              <div className="navbar-user-info">
                <span className="navbar-user-name">{getUserName()}</span>
                <span className="navbar-user-role">{auth.role}</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              if (auth.role === 'ceo') navigate('/ceo/dashboard');
              else if (auth.role === 'hr') navigate('/hr/dashboard');
              else navigate('/candidate/dashboard');
            }}>
              <Home size={15} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              <LogOut size={15} />
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
