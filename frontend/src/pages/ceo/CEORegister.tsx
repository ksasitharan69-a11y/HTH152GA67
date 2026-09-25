import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Toast } from '../../components/SharedComponents';
import ThemeToggle from '../../components/ThemeToggle';

export default function CEORegister() {
  const navigate = useNavigate();
  const { registerCEO, verifyCEO } = useApp();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [step, setStep] = useState<'register' | 'otp' | 'done'>('register');
  const [otp, setOtp] = useState('');
  const [backendOtp, setBackendOtp] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password || !form.companyName) {
      setError('Please fill in all required fields');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must contain at least 6 characters');
      return;
    }

    try {
      const res = await registerCEO(form);
      setBackendOtp(res.otp_preview || '');
      setStep('otp');
      setToast({
        message: res.otp_preview
          ? `Verification code sent to ${form.email} (Testing OTP: ${res.otp_preview})`
          : `Verification code sent to ${form.email}`,
        type: 'info'
      });
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await verifyCEO(form.email, otp);
      setStep('done');
      setToast({ message: 'Organization verified and registered', type: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Invalid verification code. Please check the code.');
    }
  };

  return (
    <div className="auth-centered-wrapper">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="auth-form-card">
        {step === 'done' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem', color: 'var(--verified)' }}>
                <CheckCircle2 size={44} />
              </div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Organization Established
              </h1>
              <p className="text-secondary" style={{ fontSize: '0.9375rem', marginBottom: '2rem' }}>
                Your corporate account for <strong>{form.companyName}</strong> has been verified.
              </p>
              <button className="btn btn-primary btn-block" onClick={() => navigate('/ceo/login')}>
                Continue to Administrator Sign In
              </button>
            </div>
          ) : step === 'otp' ? (
            <div>
              <button className="btn btn-ghost btn-sm mb-3" onClick={() => setStep('register')}>
                <ArrowLeft size={14} /> Back
              </button>
              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  Email Verification
                </h1>
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Enter the 6-digit confirmation code sent to <strong>{form.email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label className="form-label" htmlFor="otp-input">Verification Code</label>
                  <input
                    id="otp-input"
                    type="text"
                    className="form-input"
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    maxLength={6}
                    style={{ textAlign: 'center', fontSize: '1.375rem', letterSpacing: '0.35em', fontFamily: 'var(--font-mono)' }}
                    autoFocus
                  />
                  {backendOtp && <p className="form-hint">Testing code: <strong>{backendOtp}</strong></p>}
                </div>

                {error && <p className="form-error mb-2">{error}</p>}

                <button type="submit" className="btn btn-primary btn-block">
                  Confirm & Establish Workspace
                </button>
              </form>
            </div>
          ) : (
            <div>
              <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/ceo/login')}>
                <ArrowLeft size={14} /> Back to Sign In
              </button>

              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  Register Organization
                </h1>
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Create an administrator profile for your company workspace.
                </p>
              </div>

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ceo-name">Executive Name <span className="required">*</span></label>
                  <input
                    id="ceo-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sarah Jenkins"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="company-name">Organization Name <span className="required">*</span></label>
                  <input
                    id="company-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Acme Corporation"
                    value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ceo-email-reg">Work Email <span className="required">*</span></label>
                  <input
                    id="ceo-email-reg"
                    type="email"
                    className="form-input"
                    placeholder="sarah@acme.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ceo-pwd-reg">Password <span className="required">*</span></label>
                  <input
                    id="ceo-pwd-reg"
                    type="password"
                    className="form-input"
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                </div>

                {error && <p className="form-error mb-2">{error}</p>}

                <button type="submit" className="btn btn-primary btn-block">
                  Register Organization
                </button>
              </form>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
                Already registered? <Link to="/ceo/login" style={{ fontWeight: 600 }}>Sign in</Link>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
