import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeft } from 'lucide-react';
import { Toast } from '../../components/SharedComponents';

export default function HRLogin() {
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
      setError('Please provide your work email and password.');
      return;
    }
    const success = login('hr', email, password);
    if (success) {
      setToast({ message: 'Authentication successful', type: 'success' });
      setTimeout(() => navigate('/hr/dashboard'), 350);
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
            "Every requirement should have an explanation."
          </h2>
          <p className="auth-editorial-sub">
            The workspace for recruiters and hiring managers who review evidence,
            not just resume keywords.
          </p>

          <div className="auth-editorial-steps">
            <span className="auth-editorial-step-item">01 · Structured evidence citation</span>
            <span className="auth-editorial-step-item">02 · Skill verification challenges</span>
            <span className="auth-editorial-step-item">03 · Traceable human reviewer override</span>
          </div>
        </div>

        <div className="auth-editorial-footer">
          Recruitment Operations Portal · Enterprise Edition
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
              HR Reviewer Sign In
            </h1>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Access vacancies, candidate assessments, and evidence verifications.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="hr-email">Work Email</label>
              <input
                id="hr-email"
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="hr-password">Password</label>
              <input
                id="hr-password"
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
              Sign In to Workspace
            </button>
          </form>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            HR reviewer accounts are provisioned by your CEO. Contact your organization administrator if you need access.
          </div>
        </div>
      </div>
    </div>
  );
}
