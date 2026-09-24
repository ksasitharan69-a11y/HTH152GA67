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
      setError('Password must contain at least 6 characters');
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
      setToast({ message: 'Profile verified and registered', type: 'success' });
    } else {
      setError('Invalid code. Please enter the demo code shown.');
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
            "Eliminate opaque hiring black boxes."
          </h2>
          <p className="auth-editorial-sub">
            When you apply through HireProof, your resume is analyzed with exact citations
            to requirements. Where evidence is missing, you get the opportunity to prove your skill.
          </p>

          <div className="auth-editorial-steps">
            <span className="auth-editorial-step-item">Transparent requirement checklist</span>
            <span className="auth-editorial-step-item">Practical assessments to verify unconfirmed skills</span>
            <span className="auth-editorial-step-item">Direct links to your GitHub and LinkedIn work</span>
          </div>
        </div>

        <div className="auth-editorial-footer">
          Candidate Registration · Verified Applications
        </div>
      </div>

      {/* Right Column Form */}
      <div className="auth-form-side">
        <div className="auth-form-card">
          {step === 'done' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem', color: 'var(--verified)' }}>
                <CheckCircle2 size={44} />
              </div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Profile Verified
              </h1>
              <p className="text-secondary" style={{ fontSize: '0.9375rem', marginBottom: '2rem' }}>
                Your candidate profile is ready. You can now explore openings and submit evidence-based applications.
              </p>
              <button className="btn btn-primary btn-block" onClick={() => navigate('/candidate/login')}>
                Sign In to Candidate Portal
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
                  <label className="form-label" htmlFor="cand-otp-in">Verification Code</label>
                  <input
                    id="cand-otp-in"
                    type="text"
                    className="form-input"
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    maxLength={6}
                    style={{ textAlign: 'center', fontSize: '1.375rem', letterSpacing: '0.35em', fontFamily: 'var(--font-mono)' }}
                    autoFocus
                  />
                  <p className="form-hint">Demo code for testing: <strong>{generatedOtp}</strong></p>
                </div>

                {error && <p className="form-error mb-2">{error}</p>}

                <button type="submit" className="btn btn-primary btn-block">
                  Verify & Complete Profile
                </button>
              </form>
            </div>
          ) : (
            <div>
              <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/candidate/login')}>
                <ArrowLeft size={14} /> Back to Sign In
              </button>

              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  Create Candidate Profile
                </h1>
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Browse roles and submit verifiable proof of your technical abilities.
                </p>
              </div>

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label" htmlFor="cand-name">Full Name</label>
                  <input
                    id="cand-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alex Morgan"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cand-email">Work / Personal Email <span className="required">*</span></label>
                  <input
                    id="cand-email"
                    type="email"
                    className="form-input"
                    placeholder="alex@domain.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cand-pwd">Password <span className="required">*</span></label>
                  <input
                    id="cand-pwd"
                    type="password"
                    className="form-input"
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cand-gh">GitHub Profile (Optional Evidence Source)</label>
                  <input
                    id="cand-gh"
                    type="url"
                    className="form-input"
                    placeholder="https://github.com/username"
                    value={form.githubProfile}
                    onChange={e => setForm({ ...form, githubProfile: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cand-li">LinkedIn Profile (Optional Evidence Source)</label>
                  <input
                    id="cand-li"
                    type="url"
                    className="form-input"
                    placeholder="https://linkedin.com/in/username"
                    value={form.linkedinProfile}
                    onChange={e => setForm({ ...form, linkedinProfile: e.target.value })}
                  />
                </div>

                {error && <p className="form-error mb-2">{error}</p>}

                <button type="submit" className="btn btn-primary btn-block">
                  Register Profile
                </button>
              </form>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
                Already registered? <Link to="/candidate/login" style={{ fontWeight: 600 }}>Sign in</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
