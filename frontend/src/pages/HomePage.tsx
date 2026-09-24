import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Editorial Navigation */}
      <nav className="home-nav">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span className="home-logo">HireProof</span>
          <span className="home-logo-sub">AI</span>
        </div>
        <div className="home-nav-meta">
          Evidence-Based Recruitment Operations
        </div>
      </nav>

      {/* Hero Section */}
      <section className="home-hero-section">
        <span className="home-hero-badge">Verifiable Candidate Evaluation</span>
        <h1 className="home-hero-title">
          Recruitment decisions,<br />
          with evidence behind them.
        </h1>
        <p className="home-hero-sub">
          Most recruitment systems tell you whether a resume matches a role.
          HireProof shows why — mapping every claim directly to verifiable proof,
          flagging unverified gaps, and giving hiring teams traceable reasoning.
        </p>

        {/* Direct Role Entry Points */}
        <div className="home-hero-actions">
          <button className="home-role-btn primary" onClick={() => navigate('/hr/login')}>
            <span>Sign in as HR Reviewer</span>
            <span className="home-role-tag">Workspaces & Review</span>
            <ArrowRight size={15} />
          </button>
          <button className="home-role-btn" onClick={() => navigate('/candidate/login')}>
            <span>Sign in as Candidate</span>
            <span className="home-role-tag">Applications & Evidence</span>
            <ArrowRight size={15} />
          </button>
          <button className="home-role-btn" onClick={() => navigate('/ceo/login')}>
            <span>Sign in as CEO</span>
            <span className="home-role-tag">Org Administration</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* Horizontal Workflow Section */}
      <section className="home-workflow-section">
        <div className="home-workflow-divider">
          <h2 className="home-workflow-title">The Evaluation Methodology</h2>
          <span className="home-workflow-desc">Traceable from initial parse to final hiring decision</span>
        </div>

        <div className="home-steps-grid">
          <div className="home-step-col">
            <span className="home-step-num">01</span>
            <h3 className="home-step-heading">MATCH</h3>
            <p className="home-step-body">
              Compare candidate profile directly against mandatory job requirements to establish baseline eligibility.
            </p>
          </div>

          <div className="home-step-col">
            <span className="home-step-num">02</span>
            <h3 className="home-step-heading">PROVE</h3>
            <p className="home-step-body">
              Extract exact source citations, project contributions, and documented experience supporting each claim.
            </p>
          </div>

          <div className="home-step-col">
            <span className="home-step-num">03</span>
            <h3 className="home-step-heading">VERIFY</h3>
            <p className="home-step-body">
              Generate targeted practical challenges or request work samples for skills that lack definitive proof.
            </p>
          </div>

          <div className="home-step-col">
            <span className="home-step-num">04</span>
            <h3 className="home-step-heading">EXPLAIN</h3>
            <p className="home-step-body">
              Maintain an immutable audit trail with explicit reasoning for every verification and human reviewer override.
            </p>
          </div>
        </div>
      </section>

      {/* Editorial Footer */}
      <footer className="home-footer">
        <div>
          <strong>HireProof AI</strong> — Professional Evidence Review Workspace
        </div>
        <div>
          Built for recruiters and hiring managers who demand traceable accuracy.
        </div>
      </footer>
    </div>
  );
}
