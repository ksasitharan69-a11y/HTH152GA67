import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Toast } from '../../components/SharedComponents';

export default function CandidateRegister() {
  const navigate = useNavigate();
  const { registerCandidate, verifyCandidate } = useApp();
  const [form, setForm] = useState({ email: '', password: '', githubProfile: '', linkedinProfile: '', name: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [step, setStep] = useState<'register' | 'otp' | 'done'>('register');
  const [otp, setOtp] = useState('');
  const [generatedOtp] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [candidateId, setCandidateId] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Email and password are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const candidate = registerCandidate(form);
    setCandidateId(candidate.id);
    setStep('otp');
    setToast({ message: `Verification code sent to ${form.email} (Demo code: ${generatedOtp})`, type: 'info' });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === generatedOtp) {
      verifyCandidate(candidateId);
      setStep('done');
      setToast({ message: 'Email verified. Account created successfully.', type: 'success' });
    } else {
      setError('Invalid code. Please enter the demo code shown below.');
    }
  };

  if (step === 'done') {
    return (
      <div className="auth-page">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="auth-card card text-center">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem', color: 'var(--verified)' }}>
            <CheckCircle2 size={44} />
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
            Account Created
          </h1>
          <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '0.9375rem' }}>
            Your candidate profile is verified. You can now apply for openings and submit evidence.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/candidate/login')}>
            Continue to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="auth-page">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="auth-card card">
          <button className="btn btn-ghost btn-sm mb-3" onClick={() => setStep('register')}>
            <ArrowLeft size={15} /> Back
          </button>
          <div className="auth-header">
            <h1>Email Verification</h1>
            <p>Enter the 6-digit code sent to <strong>{form.email}</strong></p>
          </div>
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="cand-otp">Verification Code</label>
              <input
                id="cand-otp"
                type="text"
                className="form-input"
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.35em', fontFamily: 'var(--font-mono)' }}
                autoFocus
              />
              <p className="form-hint">Demo code: <strong>{generatedOtp}</strong></p>
            </div>
            {error && <p className="form-error mb-2">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block">
              Verify and Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="auth-card card">
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/candidate/login')}>
          <ArrowLeft size={15} /> Back to Sign In
        </button>
        <div className="auth-header">
          <h1>Candidate Registration</h1>
          <p>Create an account to browse openings and apply with verifiable evidence</p>
        </div>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="c-name">Full Name</label>
            <input
              id="c-name"
              type="text"
              className="form-input"
              placeholder="e.g. Alex Morgan"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-email">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="c-email"
              type="email"
              className="form-input"
              placeholder="alex@domain.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-pwd">
              Password <span className="required">*</span>
            </label>
            <input
              id="c-pwd"
              type="password"
              className="form-input"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-github">GitHub Profile URL</label>
            <input
              id="c-github"
              type="url"
              className="form-input"
              placeholder="https://github.com/username"
              value={form.githubProfile}
              onChange={e => setForm({ ...form, githubProfile: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-linkedin">LinkedIn Profile URL</label>
            <input
              id="c-linkedin"
              type="url"
              className="form-input"
              placeholder="https://linkedin.com/in/username"
              value={form.linkedinProfile}
              onChange={e => setForm({ ...form, linkedinProfile: e.target.value })}
            />
          </div>
          {error && <p className="form-error mb-2">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block">
            Register Account
          </button>
        </form>
        <div className="auth-footer">
          Already registered? <Link to="/candidate/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
