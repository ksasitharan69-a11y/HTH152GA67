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
      setError('Please fill in all fields');
      return;
    }
    const success = login('candidate', email, password);
    if (success) {
      setToast({ message: 'Login successful', type: 'success' });
      setTimeout(() => navigate('/candidate/dashboard'), 400);
    } else {
      setError('Invalid email or password');
      setToast({ message: 'Invalid credentials', type: 'error' });
    }
  };

  return (
    <div className="auth-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="auth-card card">
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/')}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="auth-header">
          <h1>Candidate Sign In</h1>
          <p>Sign in to view applications, submit evidence, and track verification</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="candidate-email">Email Address</label>
            <input
              id="candidate-email"
              type="email"
              className="form-input"
              placeholder="candidate@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
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
          <button type="submit" className="btn btn-primary btn-block">
            Sign In
          </button>
        </form>
        <div className="auth-footer">
          Don't have an account? <Link to="/candidate/register">Register as candidate</Link>
        </div>
      </div>
    </div>
  );
}
