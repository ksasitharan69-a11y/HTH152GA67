import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, RequirementBadge, StatusBadge, EmptyState, ScoreRing } from '../../components/SharedComponents';
import type { MatchStatus } from '../../types';
import {
  ArrowLeft, Play, ShieldAlert,
  ChevronDown, ChevronUp, FileText, CheckCircle2,
  Clock, GitCompare, MessageSquare
} from 'lucide-react';

export default function ApplicationReview() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const {
    auth,
    applications,
    vacancies,
    runRound1Matching,
    generateAssessmentQuestions,
    recordHRDecision
  } = useApp();

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, auth.user, navigate]);

  if (!auth.isAuthenticated || !auth.user) {
    return null;
  }

  const app = applications.find(a => a.id === applicationId);
  const vacancy = app ? vacancies.find(v => v.id === app.vacancyId) : null;

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [expandedReqs, setExpandedReqs] = useState<Record<string, boolean>>({});
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [hrNotes, setHrNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | MatchStatus>('ALL');

  if (!app || !vacancy) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <EmptyState
            icon={<FileText size={28} style={{ color: 'var(--text-muted)' }} />}
            title="Candidate Record Not Found"
            text="The requested applicant profile could not be located in this workspace."
            action={
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/hr/dashboard')}>
                Return to HR Dashboard
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const round1 = app.round1Match;
  const round2 = app.round2Assessment;
  const finalAnalysis = app.finalAnalysis;
  const otherApplications = applications.filter(a => a.vacancyId === app.vacancyId && a.id !== app.id);

  // Toggle single requirement expand
  const toggleReq = (id: string) => {
    setExpandedReqs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand or collapse all
  const toggleAll = (expand: boolean) => {
    if (!round1) return;
    const update: Record<string, boolean> = {};
    round1.requirements.forEach(r => {
      update[r.requirementId] = expand;
    });
    setExpandedReqs(update);
  };

  const handleRunRound1 = () => {
    try {
      runRound1Matching(app.id);
      setToast({ message: 'Round 1: Resume–JD matching & evidence extraction completed.', type: 'success' });
    } catch {
      setToast({ message: 'Error processing resume. Check resume content.', type: 'error' });
    }
  };

  const handleHRDecision = (decision: 'Shortlisted' | 'Under HR Review' | 'Rejected' | 'Selected') => {
    recordHRDecision(app.id, decision, hrNotes, auth.user?.name || 'HR Reviewer');
    if ((decision === 'Shortlisted' || decision === 'Selected') && !app.round2Assessment) {
      try {
        generateAssessmentQuestions(app.id);
      } catch (err) {
        console.error(err);
      }
    }
    setToast({ message: `Candidate successfully marked as "${decision}"`, type: 'success' });
    setHrNotes('');
  };

  const filteredRequirements = round1?.requirements.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  }) || [];

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content page-content-wide">
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/hr/vacancy/${app.vacancyId}`)}>
            <ArrowLeft size={14} /> Back to {vacancy.title} Applications
          </button>
          {otherApplications.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowComparisonModal(true)}>
              <GitCompare size={14} /> Compare with {otherApplications.length} Other Applicant{otherApplications.length > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* ==================== CANDIDATE HEADER ==================== */}
        <div className="card mb-4" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {app.candidateName || app.candidateEmail}
                </h1>
                <StatusBadge status={app.status} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <span>Role Applied: <strong>{app.role}</strong></span>
                <span>Department: <strong>{vacancy.department}</strong></span>
                <span>Company: <strong>{app.companyName}</strong></span>
                <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowResumeModal(true)}>
                <FileText size={14} /> View Original Resume
              </button>
              {!round1 && (
                <button className="btn btn-primary btn-sm" onClick={handleRunRound1}>
                  <Play size={14} /> Run Round 1 Matching
                </button>
              )}
            </div>
          </div>

          {/* Scores Overview Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginTop: '1.75rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            {/* Round 1 Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <ScoreRing score={round1 ? round1.overallScore : 0} size={70} strokeWidth={6} />
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ROUND 1</span>
                <h4 style={{ margin: '0.1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Resume-JD Match</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {round1 ? `${round1.strengths.length} verified matches` : 'Pending analysis'}
                </span>
              </div>
            </div>

            {/* Round 2 Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <ScoreRing score={round2?.overallScore || 0} size={70} strokeWidth={6} />
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ROUND 2</span>
                <h4 style={{ margin: '0.1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>AI Tech Assessment</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {round2?.status === 'completed' ? `${round2.questions.length} questions evaluated` : 'Pending candidate submission'}
                </span>
              </div>
            </div>

            {/* Combined Final Fit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--accent-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <ScoreRing score={finalAnalysis?.overallFitScore || 0} size={70} strokeWidth={6} />
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SYNTHESIS</span>
                <h4 style={{ margin: '0.1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)' }}>Overall Fit Score</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {finalAnalysis ? 'Explainable AI Analysis' : 'Awaiting 2 rounds'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== ROUND 1: REQUIREMENT-LEVEL MATCHING & EVIDENCE ==================== */}
        <section className="card mb-4" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>ROUND 1</span>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 600, margin: 0 }}>
                  Requirement-Level Match & Evidence
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Every requirement is individually evaluated against resume evidence using semantic analysis.
              </p>
            </div>

            {/* Filter pills & Expand All */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: 'var(--surface-secondary)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                {(['ALL', 'MATCH', 'PARTIAL', 'UNVERIFIED', 'GAP'] as const).map(s => (
                  <button
                    key={s}
                    className={`btn btn-ghost btn-sm ${filterStatus === s ? 'active' : ''}`}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.55rem',
                      fontWeight: filterStatus === s ? 700 : 500,
                      background: filterStatus === s ? 'var(--surface)' : 'transparent',
                      boxShadow: filterStatus === s ? 'var(--shadow-subtle)' : 'none'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button className="btn btn-ghost btn-sm" onClick={() => toggleAll(true)} style={{ fontSize: '0.75rem' }}>
                Expand All
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleAll(false)} style={{ fontSize: '0.75rem' }}>
                Collapse All
              </button>
            </div>
          </div>

          {!round1 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Round 1 analysis has not yet been triggered for this candidate.
              </p>
              <button className="btn btn-primary btn-sm" onClick={handleRunRound1}>
                <Play size={14} /> Run Round 1 Resume–JD Matching
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredRequirements.map(req => {
                const isExpanded = !!expandedReqs[req.requirementId];

                return (
                  <div
                    key={req.requirementId}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface)',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => toggleReq(req.requirementId)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.9rem 1.25rem',
                        cursor: 'pointer',
                        background: isExpanded ? 'var(--surface-secondary)' : 'var(--surface)',
                        borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <RequirementBadge status={req.status} />
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{req.requirement}</strong>
                          {req.category && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.65rem' }}>
                              {req.category} · {req.type || 'Required'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Confidence: {Math.round((req.confidence || 0.85) * 100)}%
                        </span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Expandable Evidence Body */}
                    {isExpanded && (
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--surface-secondary)' }}>
                        {/* Evidence Citation */}
                        <div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            SUPPORTING RESUME EVIDENCE
                          </span>
                          <div style={{
                            marginTop: '0.35rem',
                            padding: '0.75rem 1rem',
                            background: req.evidence ? 'var(--surface)' : 'var(--surface-secondary)',
                            borderLeft: req.evidence ? '3px solid var(--accent)' : '3px solid var(--border)',
                            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                            fontFamily: req.evidence ? 'var(--font-body)' : 'inherit',
                            fontSize: '0.875rem',
                            color: req.evidence ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontStyle: req.evidence ? 'italic' : 'normal'
                          }}>
                            {req.evidence || 'No supporting evidence found in the provided resume.'}
                          </div>
                        </div>

                        {/* Source Location */}
                        {req.source && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>Source Section:</span>
                            <code style={{ background: 'var(--surface-secondary)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>
                              {req.source}
                            </code>
                          </div>
                        )}

                        {/* AI Reasoning */}
                        <div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            AI REASONING & CLASSIFICATION RATIONALE
                          </span>
                          <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                            {req.reasoning}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ==================== ROUND 2: AI TECHNICAL ASSESSMENT ==================== */}
        <section className="card mb-4" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--verified)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>ROUND 2</span>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 600, margin: 0 }}>
                  AI Technical Assessment & Answer Evaluation
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Personalized questions generated from role requirements, resume claims, and identified partial/gap areas.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(`/hr/assessment/quiz-debugging/${app.id}`)}
                title="View Round 2 Quiz and Debugging interview scores"
              >
                Quiz & Debugging Scores (HR Only)
              </button>

              {round2 && (
                <span className="badge" style={{
                  background: round2.status === 'completed' ? 'var(--verified-bg)' : 'var(--partial-bg)',
                  color: round2.status === 'completed' ? 'var(--verified)' : 'var(--partial)',
                  border: '1px solid var(--border)'
                }}>
                  {round2.status === 'completed' ? 'Evaluation Complete' : 'Awaiting Candidate Submission'}
                </span>
              )}
            </div>
          </div>

          {!round2 || round2.questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>
                Personalized assessment will be generated once candidate enters the assessment phase.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {round2.questions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.25rem',
                    background: 'var(--surface)'
                  }}
                >
                  {/* Question header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.65rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        QUESTION {idx + 1} · {q.targetSkill.toUpperCase()} ({q.category.replace('_', ' ')})
                      </span>
                      <h4 style={{ margin: '0.25rem 0 0', fontSize: '0.975rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {q.question}
                      </h4>
                    </div>

                    {q.evaluation && (
                      <div style={{
                        textAlign: 'right',
                        minWidth: '60px',
                        background: q.evaluation.score >= 7 ? 'var(--verified-bg)' : 'var(--partial-bg)',
                        color: q.evaluation.score >= 7 ? 'var(--verified)' : 'var(--partial)',
                        padding: '0.35rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {q.evaluation.score} / {q.evaluation.maxScore}
                      </div>
                    )}
                  </div>

                  {/* Candidate Answer */}
                  <div style={{ marginTop: '0.85rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      CANDIDATE ANSWER
                    </span>
                    <div style={{
                      marginTop: '0.35rem',
                      padding: '0.75rem 1rem',
                      background: 'var(--surface-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem',
                      color: q.candidateAnswer ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontStyle: q.candidateAnswer ? 'normal' : 'italic',
                      lineHeight: 1.55
                    }}>
                      {q.candidateAnswer || 'Awaiting candidate answer submission.'}
                    </div>
                  </div>

                  {/* AI Evaluation */}
                  {q.evaluation && (
                    <div style={{
                      marginTop: '0.85rem',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong>AI Evaluation Reasoning:</strong> {q.evaluation.reasoning}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--verified)' }}>
                        <strong>Demonstrated Strength:</strong> {q.evaluation.strengths}
                      </div>
                      {q.evaluation.weaknesses && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--gap)' }}>
                          <strong>Identified Weakness:</strong> {q.evaluation.weaknesses}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ==================== FINAL EXPLAINABLE CANDIDATE ANALYSIS ==================== */}
        {finalAnalysis && (
          <section className="card mb-4" style={{ padding: '1.75rem 2rem', border: '1.5px solid var(--border-strong)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>FINAL REPORT</span>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 600, margin: 0 }}>
                Explainable Candidate Analysis
              </h2>
            </div>

            <div style={{
              background: 'var(--accent-light)',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              marginBottom: '1.25rem'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                AI Recommendation
              </span>
              <p style={{ margin: '0.25rem 0 0', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {finalAnalysis.recommendation}
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {finalAnalysis.summary}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Strengths */}
              <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--verified)', textTransform: 'uppercase' }}>
                  Verified Strengths
                </span>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {finalAnalysis.keyStrengths.map((s, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Skill Gaps */}
              <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gap)', textTransform: 'uppercase' }}>
                  Skill Gaps & Unverified Claims
                </span>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {finalAnalysis.skillGaps.length > 0 ? (
                    finalAnalysis.skillGaps.map((g, i) => (
                      <li key={i} style={{ marginBottom: '0.3rem' }}>{g}</li>
                    ))
                  ) : (
                    <li style={{ color: 'var(--text-muted)' }}>No critical mandatory skill gaps detected.</li>
                  )}
                </ul>
              </div>

              {/* Concerns for HR */}
              <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--partial)', textTransform: 'uppercase' }}>
                  Areas for Interview Clarification
                </span>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {finalAnalysis.concerns.map((c, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ==================== HR FINAL DECISION BAR ==================== */}
        <section className="card mb-4" style={{ padding: '1.75rem 2rem', background: 'var(--surface-secondary)', border: '1.5px solid var(--accent)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              HR Final Decision
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              The AI supports decision-making with explainable evidence. Final recruitment authorization resides solely with the human HR reviewer.
            </p>
          </div>

          {app.hrDecision && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--verified)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Current Recorded Decision: <span style={{ color: 'var(--accent)' }}>{app.hrDecision.decision}</span>
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  Decided by {app.hrDecision.decidedBy} on {new Date(app.hrDecision.decidedAt).toLocaleString()}
                </span>
              </div>
              {app.hrDecision.notes && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Reviewer Justification:</strong> {app.hrDecision.notes}
                </p>
              )}
            </div>
          )}

          {/* Decision Notes Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              HR Reviewer Notes / Justification (Logged to immutable audit trail)
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Provide context or rationale for this candidate status decision..."
              value={hrNotes}
              onChange={e => setHrNotes(e.target.value)}
            />
          </div>

          {/* Decision Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => handleHRDecision('Shortlisted')}
              style={{ background: 'var(--accent)' }}
            >
              Shortlist Candidate
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleHRDecision('Selected')}
              style={{ background: 'var(--verified-bg)', color: 'var(--verified)', borderColor: 'var(--verified-border)' }}
            >
              Select for Offer
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleHRDecision('Under HR Review')}
            >
              Keep Under Review
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleHRDecision('Rejected')}
            >
              Reject Application
            </button>
          </div>
        </section>

        {/* ==================== AUDIT TRAIL ==================== */}
        <section className="card" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={18} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
              Explainable Decision Audit Trail
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Immutable trace answering: "How did the system and reviewers arrive at this candidate outcome?"
          </p>

          <div className="audit-timeline">
            {app.auditTrail.map((entry) => (
              <div key={entry.id} className="audit-entry">
                <div className="audit-entry-header">
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {entry.action}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  {entry.details}
                </p>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Actor: <strong>{entry.actor}</strong> ({entry.actorRole})
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ==================== RESUME TEXT MODAL ==================== */}
      <Modal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        title={`Uploaded Resume — ${app.candidateName || app.candidateEmail}`}
        wide
      >
        <div style={{
          maxHeight: '60vh',
          overflowY: 'auto',
          background: 'var(--surface-secondary)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          color: 'var(--text-primary)'
        }}>
          {app.resumeContent || 'No resume content text available.'}
        </div>
      </Modal>

      {/* ==================== CANDIDATE COMPARISON MODAL ==================== */}
      <Modal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        title={`Candidate Comparison — ${vacancy.title}`}
        wide
      >
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Requirement-level side-by-side comparison for transparent hiring calibration.
          </p>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Job Requirement</th>
                  <th style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    {app.candidateName} (Current)
                  </th>
                  {otherApplications.map(other => (
                    <th key={other.id}>{other.candidateName || other.candidateEmail}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Round 1 Resume Match</strong></td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{round1?.overallScore || 0}%</td>
                  {otherApplications.map(other => (
                    <td key={other.id} style={{ fontWeight: 600 }}>{other.round1Match?.overallScore || 0}%</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Round 2 Assessment</strong></td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{round2?.overallScore || 0}%</td>
                  {otherApplications.map(other => (
                    <td key={other.id} style={{ fontWeight: 600 }}>{other.round2Assessment?.overallScore || 0}%</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Final Fit Score</strong></td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{finalAnalysis?.overallFitScore || 0}%</td>
                  {otherApplications.map(other => (
                    <td key={other.id} style={{ fontWeight: 600 }}>{other.finalAnalysis?.overallFitScore || 0}%</td>
                  ))}
                </tr>
                {/* Individual requirements */}
                {(vacancy.structuredRequirements || []).map(req => (
                  <tr key={req.id}>
                    <td>{req.name}</td>
                    <td style={{ background: 'var(--accent-light)' }}>
                      {round1?.requirements.find(r => r.requirement === req.name) ? (
                        <RequirementBadge status={round1.requirements.find(r => r.requirement === req.name)!.status} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    {otherApplications.map(other => {
                      const matchReq = other.round1Match?.requirements.find(r => r.requirement === req.name);
                      return (
                        <td key={other.id}>
                          {matchReq ? (
                            <RequirementBadge status={matchReq.status} />
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
