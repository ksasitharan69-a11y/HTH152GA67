import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <h1 className="home-brand">
          HireProof<span className="home-brand-ai">AI</span>
        </h1>
        <p className="home-tagline">
          Don't Just Match. Prove. Verify. Explain.
        </p>
        <p className="home-description">
          A recruitment workspace that evaluates candidates against job requirements,
          provides evidence for every matching decision, identifies gaps, and supports
          human reviewers with traceable reasoning.
        </p>
      </header>

      {/* Workflow */}
      <section className="home-workflow">
        <div className="home-workflow-title">How it works</div>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span className="workflow-step-number">01</span>
            <div className="workflow-step-content">
              <div className="workflow-step-label">Match</div>
              <div className="workflow-step-desc">
                Does the candidate's resume appear to satisfy each job requirement?
              </div>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">02</span>
            <div className="workflow-step-content">
              <div className="workflow-step-label">Prove</div>
              <div className="workflow-step-desc">
                What specific evidence from the resume supports each claim?
              </div>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">03</span>
            <div className="workflow-step-content">
              <div className="workflow-step-label">Verify</div>
              <div className="workflow-step-desc">
                Can the candidate demonstrate the skill through an assessment or evidence upload?
              </div>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">04</span>
            <div className="workflow-step-content">
              <div className="workflow-step-label">Explain</div>
              <div className="workflow-step-desc">
                Why did the system reach this conclusion? Every decision is traceable.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Entry Points */}
      <section className="home-roles">
        <div className="home-roles-title">Sign in</div>
        <div className="role-entries">
          <button className="role-entry" onClick={() => navigate('/ceo/login')}>
            <div className="role-entry-info">
              <span className="role-entry-name">CEO</span>
              <span className="role-entry-desc">Manage your company and HR accounts</span>
            </div>
            <ChevronRight size={16} className="role-entry-arrow" />
          </button>
          <button className="role-entry" onClick={() => navigate('/hr/login')}>
            <div className="role-entry-info">
              <span className="role-entry-name">HR</span>
              <span className="role-entry-desc">Post vacancies and review candidates</span>
            </div>
            <ChevronRight size={16} className="role-entry-arrow" />
          </button>
          <button className="role-entry" onClick={() => navigate('/candidate/login')}>
            <div className="role-entry-info">
              <span className="role-entry-name">Candidate</span>
              <span className="role-entry-desc">Browse roles and apply with your resume</span>
            </div>
            <ChevronRight size={16} className="role-entry-arrow" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer-brand">HireProof AI</div>
        <p>Evidence-based candidate evaluation</p>
      </footer>
    </div>
  );
}
