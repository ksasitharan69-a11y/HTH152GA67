import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Toast } from '../../components/SharedComponents';

export default function CEORegister() {
  const navigate = useNavigate();
  const { registerCEO, verifyCEO } = useApp();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [step, setStep] = useState<'register' | 'otp' | 'done'>('register');
  const [otp, setOtp] = useState('');
  const [generatedOtp] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [ceoId, setCeoId] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password || !form.companyName) {
      setError('Please fill in all fields');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const ceo = registerCEO(form);
    setCeoId(ceo.id);
    setStep('otp');
    setToast({ message: `OTP sent to ${form.email} (Demo OTP: ${generatedOtp})`, type: 'info' });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === generatedOtp) {
      verifyCEO(ceoId);
      setStep('done');
      setToast({ message: 'Email verified. Account created successfully.', type: 'success' });
    } else {
      setError('Invalid OTP code. Please enter the demo code shown below.');
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
            Registration Complete
          </h1>
          <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '0.9375rem' }}>
            Your organization account for <strong>{form.companyName}</strong> has been verified and registered.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/ceo/login')}>
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
            <p>Enter the 6-digit verification code sent to <strong>{form.email}</strong></p>
          </div>

          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-code">Verification Code</label>
              <input
                id="otp-code"
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
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/ceo/login')}>
          <ArrowLeft size={15} /> Back to Sign In
        </button>

        <div className="auth-header">
          <h1>Register Organization</h1>
          <p>Create a CEO account to establish your workspace</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="reg-name"
              type="text"
              className="form-input"
              placeholder="e.g. Sarah Jenkins"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-company">
              Company Name <span className="required">*</span>
            </label>
            <input
              id="reg-company"
              type="text"
              className="form-input"
              placeholder="e.g. Acme Corporation"
              value={form.companyName}
              onChange={e => setForm({ ...form, companyName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Work Email <span className="required">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="sarah@acme.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              Password <span className="required">*</span>
            </label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {error && <p className="form-error mb-2">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block">
            Register Account
          </button>
        </form>

        <div className="auth-footer">
          Already registered? <Link to="/ceo/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
