import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeft } from 'lucide-react';
import { Toast } from '../../components/SharedComponents';

export default function CEOLogin() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide your administrator email and password.');
      return;
    }

    const success = login('ceo', email, password);
    if (success) {
      setToast({ message: 'Authentication successful', type: 'success' });
      setTimeout(() => navigate('/ceo/dashboard'), 350);
    } else {
      setError('Invalid credentials. Please verify your email and password.');
      setToast({ message: 'Authentication failed', type: 'error' });
    }
  };

  return (
    <div className="auth-split-wrapper">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Editorial Left Column */}
      <div className="auth-editorial-side">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span className="auth-editorial-logo">HireProof</span>
          <span className="navbar-badge" style={{ marginLeft: '0.4rem' }}>AI</span>
        </div>

        <div className="auth-editorial-quote">
          <h2 className="auth-editorial-title">
            "Governance and accountability in hiring standards."
          </h2>
          <p className="auth-editorial-sub">
            Establish your company workspace, delegate department recruitment privileges,
            and monitor evidence-backed hiring velocity.
          </p>

          <div className="auth-editorial-steps">
            <span className="auth-editorial-step-item">Company & department management</span>
            <span className="auth-editorial-step-item">HR reviewer credential delegation</span>
            <span className="auth-editorial-step-item">Full traceability across vacancies</span>
          </div>
        </div>

        <div className="auth-editorial-footer">
          Executive Administration Portal
        </div>
      </div>

      {/* Right Column Form */}
      <div className="auth-form-side">
        <div className="auth-form-card">
          <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/')}>
            <ArrowLeft size={14} /> Back to Overview
          </button>

          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              CEO Administrator Sign In
            </h1>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Sign in to manage company departments and reviewer privileges.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="ceo-email">Executive Email</label>
              <input
                id="ceo-email"
                type="email"
                className="form-input"
                placeholder="ceo@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ceo-password">Password</label>
              <input
                id="ceo-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <p className="form-error mb-2">{error}</p>}

            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '0.5rem' }}>
              Sign In to Organization
            </button>
          </form>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
            Need to register a new company workspace?{' '}
            <Link to="/ceo/register" style={{ fontWeight: 600 }}>Create organization account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
