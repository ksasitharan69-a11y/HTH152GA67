import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeft } from 'lucide-react';
import { Toast } from '../../components/SharedComponents';

export default function CandidateLogin() {
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
      setError('Please provide your email and password.');
      return;
    }
    const success = login('candidate', email, password);
    if (success) {
      setToast({ message: 'Authentication successful', type: 'success' });
      setTimeout(() => navigate('/candidate/dashboard'), 350);
    } else {
      setError('Invalid credentials. Please verify your email and password.');
      setToast({ message: 'Authentication failed', type: 'error' });
    }
  };

  return (
    <div className="auth-centered-wrapper">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="auth-form-card">
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> Back to Overview
        </button>

        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            HIREPROOF
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Candidate Sign In
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Track applications, view evidence citations, and complete verifications.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="candidate-email">Email Address</label>
            <input
              id="candidate-email"
              type="email"
              className="form-input"
              placeholder="name@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="candidate-password">Password</label>
            <input
              id="candidate-password"
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
            Sign In to Candidate Portal
          </button>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8125rem', textAlign: 'center' }}>
          New to HireProof?{' '}
          <Link to="/candidate/register" style={{ fontWeight: 600 }}>Create candidate profile</Link>
        </div>
      </div>
    </div>
  );
}
