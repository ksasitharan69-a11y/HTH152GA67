import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, UserCheck, Briefcase } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* Editorial Navigation */}
      <header className="home-header">
        <div className="home-brand">
          <span className="brand-title">HIREPROOF</span>
          <span className="brand-subtitle">Explainable Candidate–Role Fit Engine</span>
        </div>
      </header>

      {/* Main Content: Short Intro + 3 Login Portals */}
      <main className="home-main">
        <div className="home-intro-text">
          <h1 className="home-heading">Explainable Candidate–Role Fit Engine</h1>
          <p className="home-subheading">
            An explainable recruitment platform that evaluates candidate–role fit through verifiable resume evidence
            and personalized technical assessments — giving HR transparent reasoning for final decisions.
          </p>
        </div>

        {/* Portal Login Options */}
        <div className="portals-grid">
          {/* HR Portal */}
          <div className="portal-card featured">
            <div className="portal-icon">
              <UserCheck size={22} />
            </div>
            <div className="portal-header">
              <span className="portal-label">Recruiter & Reviewer</span>
              <h2 className="portal-title">HR Workspace</h2>
            </div>
            <p className="portal-desc">
              Review requirement-level evidence breakdowns, inspect personalized technical assessments, compare applicants, and record final hiring decisions.
            </p>
            <div className="portal-credentials">
              <span className="cred-label">Login Credentials:</span>
              <code>rahul@abc.com / password123</code>
            </div>
            <div className="portal-actions">
              <button className="btn btn-primary w-full" onClick={() => navigate('/hr/login')}>
                <span>Sign in as HR</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Candidate Portal */}
          <div className="portal-card">
            <div className="portal-icon">
              <Briefcase size={22} />
            </div>
            <div className="portal-header">
              <span className="portal-label">Applicant Portal</span>
              <h2 className="portal-title">Candidate Workspace</h2>
            </div>
            <p className="portal-desc">
              Browse published vacancies by company and department, upload your resume, take your personalized AI Technical Assessment, and track application status.
            </p>
            <div className="portal-credentials">
              <span className="cred-label">Login Credentials:</span>
              <code>candidate@test.com / password123</code>
            </div>
            <div className="portal-actions split">
              <button className="btn btn-primary" onClick={() => navigate('/candidate/login')}>
                <span>Sign In</span>
                <ArrowRight size={14} />
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/candidate/register')}>
                <span>Register</span>
              </button>
            </div>
          </div>

          {/* CEO Portal */}
          <div className="portal-card">
            <div className="portal-icon">
              <Building2 size={22} />
            </div>
            <div className="portal-header">
              <span className="portal-label">Executive Administration</span>
              <h2 className="portal-title">CEO Workspace</h2>
            </div>
            <p className="portal-desc">
              Register your company, establish departments, create and provision authorized HR accounts, and oversee organization-wide recruitment standards.
            </p>
            <div className="portal-credentials">
              <span className="cred-label">Login Credentials:</span>
              <code>ceo@abc.com / password123</code>
            </div>
            <div className="portal-actions split">
              <button className="btn btn-primary" onClick={() => navigate('/ceo/login')}>
                <span>Sign In</span>
                <ArrowRight size={14} />
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/ceo/register')}>
                <span>Register Company</span>
              </button>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
