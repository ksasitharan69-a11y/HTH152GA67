import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, EmptyState, StatusBadge } from '../../components/SharedComponents';
import type { Application } from '../../types';
import {
  ArrowLeft, CheckCircle2, XCircle, BrainCircuit, FileText,
  ChevronRight, Check, AlertCircle, Clock, ShieldCheck, Lock,
  Sparkles, Code2, Users
} from 'lucide-react';

function isRound1Selected(app: Application): boolean {
  if (app.round1Selected === true) return true;
  if (app.round1Selected === false) return false;
  if (app.status === 'Shortlisted' || app.status === 'Selected') return true;
  if (app.status === 'Rejected') return false;
  if (app.round1Match) {
    if (typeof app.round1Match.selectedInRound1 === 'boolean') {
      return app.round1Match.selectedInRound1;
    }
    return app.round1Match.overallScore >= 60;
  }
  return false;
}

function isRound2Selected(app: Application): boolean {
  if (app.status === 'Selected') return true;
  if (app.status === 'Rejected') return false;
  if (app.round2Assessment?.status === 'completed') {
    const score = app.round2Assessment.overallScore || 0;
    return score >= 60;
  }
  return false;
}

export default function VacancyDetail() {
  const { vacancyId } = useParams<{ vacancyId: string }>();
  const navigate = useNavigate();
  const {
    auth, vacancies, getApplicationsByVacancy,
    updateVacancyStatus, generateAssessmentQuestions,
    submitAssessmentAnswers
  } = useApp();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeRoundTab, setActiveRoundTab] = useState<'round1' | 'round2' | 'all'>('round1');
  const [isSimulating, setIsSimulating] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, auth.user, navigate]);

  const vacancy = vacancies.find(v => v.id === vacancyId);
  const applications = vacancyId ? getApplicationsByVacancy(vacancyId) : [];

  // Group applications by round selection status
  const round1Selected = applications.filter(isRound1Selected);
  const round1Unselected = applications.filter(a => !isRound1Selected(a));

  const round2Eligible = round1Selected;
  const round2Completed = round2Eligible.filter(a => a.round2Assessment?.status === 'completed');
  const round2Selected = round2Completed.filter(isRound2Selected);
  const round2Unselected = round2Completed.filter(a => !isRound2Selected(a));
  const round2Pending = round2Eligible.filter(a => a.round2Assessment?.status !== 'completed');

  // Automatic closure at end of last round:
  // If there are candidates in round 2, and all eligible candidates completed round 2, auto-update to closed
  useEffect(() => {
    if (
      vacancy &&
      vacancy.status === 'active' &&
      round2Eligible.length > 0 &&
      round2Eligible.every(a => a.round2Assessment?.status === 'completed')
    ) {
      updateVacancyStatus(vacancy.id, 'closed');
      setToast({
        message: 'All candidates have concluded the final round. Vacancy has been automatically updated to CLOSED and will NOT be shown to candidates.',
        type: 'success'
      });
    }
  }, [vacancy?.status, round2Eligible.length, round2Completed.length]);

  if (!auth.isAuthenticated || !auth.user) {
    return null;
  }

  if (!vacancy) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <EmptyState
            icon={<span style={{ fontSize: '1.5rem', fontWeight: 600 }}>?</span>}
            title="Vacancy Not Found"
            text="The requested job vacancy does not exist or may have been deleted."
            action={
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/hr/dashboard')}>
                Return to Dashboard
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const handleCloseVacancyAtEndOfRound = () => {
    updateVacancyStatus(vacancy.id, 'closed');
    setToast({
      message: 'All rounds concluded. Vacancy updated to CLOSED. Position is now hidden from all candidates.',
      type: 'success'
    });
  };

  const handleReopenVacancy = () => {
    updateVacancyStatus(vacancy.id, 'active');
    setToast({
      message: 'Vacancy reopened and published to candidate portal.',
      type: 'success'
    });
  };

  // Helper to simulate candidate submission for testing
  const handleSimulateRound2 = (appId: string) => {
    setIsSimulating(appId);
    let questions = generateAssessmentQuestions(appId);
    const answers = questions.map(q => ({
      questionId: q.id,
      answer: `Technical solution for ${q.targetSkill}: I implemented asynchronous connection pooling and indexed database queries to optimize response latency under high concurrency.`
    }));

    setTimeout(() => {
      submitAssessmentAnswers(appId, answers);
      setIsSimulating(null);
      setToast({
        message: 'Round 2 Technical Assessment simulated and evaluated in real time!',
        type: 'success'
      });
    }, 500);
  };

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content page-content-wide">
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/hr/dashboard')}>
          <ArrowLeft size={14} /> Back to HR Dashboard
        </button>

        {/* Vacancy Header Card */}
        <div className="card mb-4" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Recruitment Pipeline
                </span>
                <span className={`badge ${vacancy.status === 'active' ? 'badge-verified' : 'badge-gap'}`}>
                  <span className="badge-dot" />
                  {vacancy.status === 'active' ? 'Active Posting' : 'Closed (Hidden from Candidates)'}
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                {vacancy.title}
              </h1>
              <p className="text-secondary text-sm" style={{ marginTop: '0.35rem' }}>
                {vacancy.companyName} · {vacancy.department} Department · Required Exp: {vacancy.requiredExperience || 'Any exp'}
              </p>
            </div>

            {/* Close Vacancy Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {vacancy.status === 'active' ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleCloseVacancyAtEndOfRound}
                  title="Conclude recruitment and update vacancy to closed so candidates cannot see it"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Lock size={13} /> Complete Last Round & Close Vacancy
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleReopenVacancy}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Check size={13} /> Reopen Vacancy
                </button>
              )}
            </div>
          </div>

          {/* Prominent Banner when Vacancy is Closed */}
          {vacancy.status === 'closed' && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1.25rem',
              background: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
              borderLeft: '4px solid var(--gap)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Lock size={18} color="var(--gap)" />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <strong>Vacancy Closed:</strong> All recruitment rounds have concluded. This opening is <strong>hidden</strong> and <strong>not shown to candidates</strong> in the Candidate Portal.
                </span>
              </div>
              <span className="text-muted text-xs">
                Candidates evaluated: {applications.length}
              </span>
            </div>
          )}
        </div>

        {/* Round Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeRoundTab === 'round1' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveRoundTab('round1')}
              style={{ fontSize: '0.85rem' }}
            >
              <span>Round 1: Resume Match</span>
              <span className="badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', marginLeft: '0.35rem', background: 'var(--surface)', color: 'var(--text-primary)' }}>
                {round1Selected.length} Selected / {round1Unselected.length} Unselected
              </span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeRoundTab === 'round2' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveRoundTab('round2')}
              style={{ fontSize: '0.85rem' }}
            >
              <BrainCircuit size={14} />
              <span>Round 2: Technical Assessment (Last Round)</span>
              <span className="badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', marginLeft: '0.35rem', background: 'var(--surface)', color: 'var(--text-primary)' }}>
                {round2Selected.length} Selected / {round2Unselected.length} Unselected
              </span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeRoundTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveRoundTab('all')}
              style={{ fontSize: '0.85rem' }}
            >
              <Users size={14} />
              <span>All Rounds Summary ({applications.length})</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ROUND 1 VIEW: Selected vs Unselected Employees in Round 1 */}
        {/* ======================================================== */}
        {activeRoundTab === 'round1' && (
          <div>
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 className="section-title">Round 1 Evaluation: Resume Match Analysis</h2>
                <p className="section-subtitle">
                  Employees evaluated against mandatory role criteria. Candidates scoring ≥ 60% are selected to advance to Round 2.
                </p>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<FileText size={22} />}
                  title="No Candidates Applied Yet"
                  text="When candidates submit resumes for this position, Round 1 AI matching will categorize them into selected and unselected."
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* 1. SELECTED EMPLOYEES IN ROUND 1 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={18} color="var(--verified)" />
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--verified)' }}>
                      Selected Employees in Round 1 ({round1Selected.length})
                    </h3>
                    <span className="text-muted text-xs">— Qualified for Round 2 Technical Assessment (Score ≥ 60%)</span>
                  </div>

                  {round1Selected.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {round1Selected.map(app => (
                        <div
                          key={app.id}
                          className="card"
                          style={{
                            padding: '1.25rem 1.5rem',
                            borderLeft: '4px solid var(--verified)',
                            background: 'var(--surface)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.65rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                  {app.candidateName || 'Candidate'}
                                </strong>
                                <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>
                                  Selected in Round 1
                                </span>
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  fontSize: '0.9rem',
                                  color: 'var(--verified)'
                                }}>
                                  {app.round1Match?.overallScore}% Match
                                </span>
                              </div>
                              <span className="text-secondary text-xs">{app.candidateEmail} · Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/candidate-reason/${app.id}`)}
                                title="View exact selection reason"
                              >
                                View Reason
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/evidence/${app.id}`)}
                              >
                                Review Evidence
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => navigate(`/hr/assessment/quiz-debugging/${app.id}`)}
                              >
                                Round 2 Scores →
                              </button>
                            </div>
                          </div>

                          {/* Reason why selected */}
                          <div style={{
                            background: 'var(--verified-bg)',
                            border: '1px solid var(--verified-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            color: 'var(--text-primary)'
                          }}>
                            <strong>Selection Reason: </strong>
                            {app.round1Match?.summary ||
                              `Candidate achieved ${app.round1Match?.overallScore}% match, exceeding the 60% qualification threshold with verified evidence in core competencies.`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--surface-secondary)' }}>
                      <span className="text-secondary text-sm">No employees currently selected in Round 1.</span>
                    </div>
                  )}
                </div>

                {/* 2. UNSELECTED EMPLOYEES IN ROUND 1 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <XCircle size={18} color="var(--gap)" />
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--gap)' }}>
                      Unselected Employees in Round 1 ({round1Unselected.length})
                    </h3>
                    <span className="text-muted text-xs">— Did not qualify for Round 2 (Score &lt; 60%)</span>
                  </div>

                  {round1Unselected.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {round1Unselected.map(app => (
                        <div
                          key={app.id}
                          className="card"
                          style={{
                            padding: '1.25rem 1.5rem',
                            borderLeft: '4px solid var(--gap)',
                            background: 'var(--surface)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.65rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                  {app.candidateName || 'Candidate'}
                                </strong>
                                <span className="badge badge-gap" style={{ fontSize: '0.7rem' }}>
                                  Not Selected in Round 1
                                </span>
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  fontSize: '0.9rem',
                                  color: 'var(--gap)'
                                }}>
                                  {app.round1Match?.overallScore || 0}% Match
                                </span>
                              </div>
                              <span className="text-secondary text-xs">{app.candidateEmail} · Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/candidate-reason/${app.id}`)}
                              >
                                View Reason
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/evidence/${app.id}`)}
                              >
                                Review Evidence
                              </button>
                            </div>
                          </div>

                          {/* Reason why unselected */}
                          <div style={{
                            background: 'var(--gap-bg)',
                            border: '1px solid var(--gap-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            color: 'var(--text-primary)'
                          }}>
                            <strong>Rejection / Unselected Reason: </strong>
                            {app.round1Match?.summary ||
                              `Candidate scored ${app.round1Match?.overallScore || 0}%, failing to meet the required 60% qualification benchmark due to unverified competencies.`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--surface-secondary)' }}>
                      <span className="text-secondary text-sm">No unselected employees in Round 1.</span>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ROUND 2 VIEW: Selected vs Unselected Employees in Round 2 */}
        {/* ======================================================== */}
        {activeRoundTab === 'round2' && (
          <div>
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 className="section-title">Round 2 Evaluation: AI Technical Quiz & Debugging Assessment</h2>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                    FINAL ROUND
                  </span>
                </div>
                <p className="section-subtitle">
                  Personalized technical quiz and code debugging challenges. Only authorized HR reviewers can view assessment scores.
                </p>
              </div>
            </div>

            {round2Eligible.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<BrainCircuit size={22} />}
                  title="No Candidates in Round 2"
                  text="Candidates must first be selected in Round 1 (Score ≥ 60%) to advance to the Round 2 Technical Assessment."
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* 1. SELECTED EMPLOYEES IN ROUND 2 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={18} color="var(--verified)" />
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--verified)' }}>
                      Selected Employees in Round 2 ({round2Selected.length})
                    </h3>
                    <span className="text-muted text-xs">— Passed Technical Assessment &amp; Final Evaluation</span>
                  </div>

                  {round2Selected.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {round2Selected.map(app => (
                        <div
                          key={app.id}
                          className="card"
                          style={{
                            padding: '1.25rem 1.5rem',
                            borderLeft: '4px solid var(--verified)',
                            background: 'var(--surface)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.65rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                  {app.candidateName || 'Candidate'}
                                </strong>
                                <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>
                                  Selected in Round 2
                                </span>
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  fontSize: '0.9rem',
                                  color: 'var(--verified)'
                                }}>
                                  Tech Score: {app.round2Assessment?.overallScore}%
                                </span>
                              </div>
                              <span className="text-secondary text-xs">{app.candidateEmail} · Questions Evaluated: {app.round2Assessment?.questions.length}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/candidate-reason/${app.id}`)}
                              >
                                View Reason
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => navigate(`/hr/assessment/quiz-debugging/${app.id}`)}
                              >
                                View Quiz & Debugging Scores →
                              </button>
                            </div>
                          </div>

                          {/* Reason why selected in round 2 */}
                          <div style={{
                            background: 'var(--verified-bg)',
                            border: '1px solid var(--verified-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            color: 'var(--text-primary)'
                          }}>
                            <strong>Round 2 Selection Reason: </strong>
                            {app.round2Assessment?.explanation ||
                              `Candidate scored ${app.round2Assessment?.overallScore}%, demonstrating strong problem-solving proficiency and code debugging accuracy in technical challenges.`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--surface-secondary)' }}>
                      <span className="text-secondary text-sm">No employees currently selected in Round 2.</span>
                    </div>
                  )}
                </div>

                {/* 2. UNSELECTED EMPLOYEES IN ROUND 2 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <XCircle size={18} color="var(--gap)" />
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--gap)' }}>
                      Unselected Employees in Round 2 ({round2Unselected.length})
                    </h3>
                    <span className="text-muted text-xs">— Did not pass Technical Assessment (Score &lt; 60%)</span>
                  </div>

                  {round2Unselected.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {round2Unselected.map(app => (
                        <div
                          key={app.id}
                          className="card"
                          style={{
                            padding: '1.25rem 1.5rem',
                            borderLeft: '4px solid var(--gap)',
                            background: 'var(--surface)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.65rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                  {app.candidateName || 'Candidate'}
                                </strong>
                                <span className="badge badge-gap" style={{ fontSize: '0.7rem' }}>
                                  Not Selected in Round 2
                                </span>
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  fontSize: '0.9rem',
                                  color: 'var(--gap)'
                                }}>
                                  Tech Score: {app.round2Assessment?.overallScore}%
                                </span>
                              </div>
                              <span className="text-secondary text-xs">{app.candidateEmail}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/candidate-reason/${app.id}`)}
                              >
                                View Reason
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/assessment/quiz-debugging/${app.id}`)}
                              >
                                View Quiz & Debugging Scores →
                              </button>
                            </div>
                          </div>

                          {/* Reason why unselected in round 2 */}
                          <div style={{
                            background: 'var(--gap-bg)',
                            border: '1px solid var(--gap-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            color: 'var(--text-primary)'
                          }}>
                            <strong>Round 2 Unselected Reason: </strong>
                            {app.round2Assessment?.explanation ||
                              `Candidate scored ${app.round2Assessment?.overallScore}%, failing to meet the required 60% technical depth benchmark.`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--surface-secondary)' }}>
                      <span className="text-secondary text-sm">No unselected employees in Round 2.</span>
                    </div>
                  )}
                </div>

                {/* 3. PENDING ROUND 2 SUBMISSIONS */}
                {round2Pending.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <Clock size={18} color="var(--partial)" />
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                        Pending Round 2 Assessment ({round2Pending.length})
                      </h3>
                      <span className="text-muted text-xs">— Passed Round 1; awaiting quiz &amp; debugging completion</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {round2Pending.map(app => (
                        <div
                          key={app.id}
                          className="card"
                          style={{
                            padding: '1.25rem 1.5rem',
                            borderLeft: '4px solid var(--partial)',
                            background: 'var(--surface)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                              <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                {app.candidateName || 'Candidate'}
                              </strong>
                              <span className="badge badge-partial" style={{ fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                                Assessment In Progress
                              </span>
                              <div className="text-secondary text-xs" style={{ marginTop: '0.2rem' }}>
                                {app.candidateEmail} · Round 1 Match: {app.round1Match?.overallScore}%
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/assessment/quiz-debugging/${app.id}`)}
                              >
                                View Questions
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSimulateRound2(app.id)}
                                disabled={isSimulating === app.id}
                              >
                                <Code2 size={13} /> {isSimulating === app.id ? 'Evaluating...' : 'Simulate & Evaluate Round 2 (Real Time)'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ALL ROUNDS SUMMARY VIEW */}
        {/* ======================================================== */}
        {activeRoundTab === 'all' && (
          <div>
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 className="section-title">All Rounds Recruitment Summary ({applications.length})</h2>
                <p className="section-subtitle">
                  Progression across Round 1 (Resume Match) and Round 2 (Technical Assessment)
                </p>
              </div>
            </div>

            {applications.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Round 1 (Resume Match)</th>
                      <th>Round 2 (Tech Assessment)</th>
                      <th>Final Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => {
                      const r1Pass = isRound1Selected(app);
                      const r2Pass = isRound2Selected(app);
                      const r2Done = app.round2Assessment?.status === 'completed';

                      return (
                        <tr key={app.id}>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{app.candidateName || 'Candidate'}</strong>
                            <div className="text-muted text-xs">{app.candidateEmail}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                color: r1Pass ? 'var(--verified)' : 'var(--gap)'
                              }}>
                                {app.round1Match?.overallScore}%
                              </span>
                              <span className={`badge ${r1Pass ? 'badge-verified' : 'badge-gap'}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                                {r1Pass ? 'Selected' : 'Unselected'}
                              </span>
                            </div>
                          </td>
                          <td>
                            {r2Done ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  color: r2Pass ? 'var(--verified)' : 'var(--gap)'
                                }}>
                                  {app.round2Assessment?.overallScore}%
                                </span>
                                <span className={`badge ${r2Pass ? 'badge-verified' : 'badge-gap'}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                                  {r2Pass ? 'Selected' : 'Unselected'}
                                </span>
                              </div>
                            ) : r1Pass ? (
                              <span className="badge badge-partial" style={{ fontSize: '0.68rem' }}>
                                Awaiting Submission
                              </span>
                            ) : (
                              <span className="text-muted text-xs">— (Locked)</span>
                            )}
                          </td>
                          <td>
                            <StatusBadge status={app.status} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/candidate-reason/${app.id}`)}
                              >
                                View Reason
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/hr/evidence/${app.id}`)}
                              >
                                Evidence
                              </button>
                              {r1Pass && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => navigate(`/hr/assessment/quiz-debugging/${app.id}`)}
                                >
                                  Tech Scores
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <span className="text-secondary text-sm">No applications submitted for this vacancy yet.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
