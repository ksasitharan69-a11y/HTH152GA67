import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setError('Please fill in all fields');
      return;
    }
    const success = login('hr', email, password);
    if (success) {
      setToast({ message: 'Login successful', type: 'success' });
      setTimeout(() => navigate('/hr/dashboard'), 400);
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
          <h1>HR Reviewer Sign In</h1>
          <p>Access vacancies, candidate assessments, and evidence verifications</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="hr-email">Work Email</label>
            <input
              id="hr-email"
              type="email"
              className="form-input"
              placeholder="hr@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
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
          <button type="submit" className="btn btn-primary btn-block">
            Sign In
          </button>
        </form>
        <div className="auth-footer">
          <p className="text-secondary text-sm" style={{ marginTop: '1rem', lineHeight: 1.5 }}>
            HR reviewer accounts are provisioned by your organization's CEO. Contact your administrator if you need access credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
