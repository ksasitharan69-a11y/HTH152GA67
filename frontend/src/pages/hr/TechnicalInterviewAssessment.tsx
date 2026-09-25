import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useApp } from '../../context/AppContext';
import { Toast, StatusBadge } from '../../components/SharedComponents';
import type { HR, AssessmentQuestion } from '../../types';
import {
  ArrowLeft, BrainCircuit, CheckCircle2, XCircle, Code2,
  AlertCircle, Sparkles, Award, FileText, ChevronRight,
  HelpCircle, Sliders, Check
} from 'lucide-react';

export default function TechnicalInterviewAssessment() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const {
    auth, getApplication, submitAssessmentAnswers,
    recordHRDecision, generateAssessmentQuestions
  } = useApp();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [adjustedScores, setAdjustedScores] = useState<Record<string, number>>({});
  const [hrNotes, setHrNotes] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  const hr = auth.user as HR;

  useEffect(() => {
    // Only HR can view this technical interview assessment score page
    if (!auth.isAuthenticated || auth.role !== 'hr') {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, auth.role, navigate]);

  const application = applicationId ? getApplication(applicationId) : undefined;

  useEffect(() => {
    if (application?.hrDecision?.notes) {
      setHrNotes(application.hrDecision.notes);
    }
  }, [application?.hrDecision?.notes]);

  if (!auth.isAuthenticated || auth.role !== 'hr') {
    return null;
  }

  if (!application) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/hr/dashboard')}>
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
              Application Not Found
            </h2>
            <p className="text-secondary text-sm">
              The requested candidate application ID could not be located in the current workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const round2 = application.round2Assessment;
  const isCompleted = round2?.status === 'completed';
  const round1Score = application.round1Match?.overallScore || 0;
  const round2Score = round2?.overallScore || 0;
  const overallFit = Math.round(round1Score * 0.4 + round2Score * 0.6);

  // If questions not generated yet, generate them in real time
  const handleGenerateQuestions = async () => {
    try {
      await generateAssessmentQuestions(application.id);
      setToast({ message: 'Round 2 Technical Quiz and Debugging challenges generated in real time.', type: 'success' });
    } catch {
      setToast({ message: 'Failed to generate assessment questions.', type: 'error' });
    }
  };

  // Real-time simulate candidate completing the quiz and debugging round
  const handleSimulateCandidateAnswers = async () => {
    setIsSimulating(true);
    let questions = round2?.questions || [];
    if (questions.length === 0) {
      questions = await generateAssessmentQuestions(application.id);
    }

    const simulatedAnswers = questions.map((q) => {
      let sampleAnswer = '';
      if (q.category === 'problem_solving' || q.targetSkill.toLowerCase().includes('sql') || q.targetSkill.toLowerCase().includes('database')) {
        sampleAnswer = `To optimize this query, I created a composite index on (user_id, created_at DESC) and analyzed execution plans using EXPLAIN ANALYZE. This resolved sequential table scans, reduced buffer read latency from 420ms to 8ms, and ensured connection pool efficiency under high concurrent traffic.`;
      } else if (q.targetSkill.toLowerCase().includes('python') || q.targetSkill.toLowerCase().includes('async')) {
        sampleAnswer = `In Python FastAPI, I utilize async/await with an asynchronous connection pool (asyncpg / SQLAlchemy async engine). Blocking CPU-bound calculations are offloaded to Celery background tasks or concurrent.futures ProcessPoolExecutor to avoid blocking the event loop and maintain low p99 response times.`;
      } else if (q.targetSkill.toLowerCase().includes('docker') || q.targetSkill.toLowerCase().includes('devops')) {
        sampleAnswer = `I implement multi-stage Docker builds using a lightweight python:3.11-slim base image. Non-root user permissions are enforced, dependencies are cached in early build layers, and health checks are declared for orchestrator readiness and liveness probes.`;
      } else {
        sampleAnswer = `In production architectures, I structure clean modular services adhering to SOLID principles. Comprehensive unit and integration test suites validate API contracts with Pydantic schemas, and structured JSON logs are piped to centralized observability dashboards.`;
      }

      return {
        questionId: q.id,
        answer: sampleAnswer
      };
    });

    try {
      await submitAssessmentAnswers(application.id, simulatedAnswers);
      setIsSimulating(false);
      setToast({
        message: 'Candidate answers submitted and AI evaluation scores computed in real time!',
        type: 'success'
      });
    } catch {
      setIsSimulating(false);
      setToast({
        message: 'Error computing evaluation score. Please try again.',
        type: 'error'
      });
    }
  };

  const handleAdjustScore = (questionId: string, currentScore: number, delta: number) => {
    const existing = adjustedScores[questionId] !== undefined ? adjustedScores[questionId] : currentScore;
    const newScore = Math.max(0, Math.min(10, existing + delta));
    setAdjustedScores(prev => ({ ...prev, [questionId]: newScore }));
    setToast({ message: `Score calibrated to ${newScore}/10 for this assessment challenge.`, type: 'info' });
  };

  const handleFinalDecision = (decisionType: 'Selected' | 'Shortlisted' | 'Rejected') => {
    recordHRDecision(
      application.id,
      decisionType,
      hrNotes.trim() || `HR finalized candidate as ${decisionType} following Round 2 Technical Quiz and Debugging evaluation.`,
      hr?.name || 'HR Reviewer'
    );
    setToast({
      message: `Candidate hiring decision updated to "${decisionType}" in real time.`,
      type: decisionType === 'Rejected' ? 'info' : 'success'
    });
  };

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content page-content-wide">
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/hr/dashboard')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Round 2: Technical Assessment Scores (HR Confidential)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/hr/candidate-reason/${application.id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Award size={13} /> View Decision Reason
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/hr/evidence/${application.id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FileText size={13} /> Full Evidence Dossier
            </button>
          </div>
        </div>

        {/* Header Card */}
        <div className="card mb-4" style={{ padding: '1.5rem 1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '3px'
                }}>
                  ROUND 2 AI TECHNICAL INTERVIEW
                </span>
                <span className="badge" style={{
                  background: isCompleted ? 'var(--verified-bg)' : 'var(--partial-bg)',
                  color: isCompleted ? 'var(--verified)' : 'var(--partial)',
                  border: '1px solid var(--border)'
                }}>
                  {isCompleted ? 'Evaluation Completed' : 'Assessment In Progress'}
                </span>
                <StatusBadge status={application.status} />
              </div>

              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                {application.candidateName || 'Candidate'} — Technical Scorecard
              </h1>
              <p className="text-secondary text-sm" style={{ marginTop: '0.3rem' }}>
                Role: <strong>{application.role}</strong> · Company: {application.companyName} · Confidential HR Technical Evaluation
              </p>
            </div>

            {/* Score Strip */}
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              background: 'var(--surface-secondary)',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Round 1 Match
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {round1Score}%
                </span>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Round 2 Tech Score
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: isCompleted ? (round2Score >= 70 ? 'var(--verified)' : 'var(--partial)') : 'var(--text-muted)'
                }}>
                  {isCompleted ? `${round2Score}%` : 'Pending'}
                </span>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Combined Fit (40/60)
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: overallFit >= 70 ? 'var(--verified)' : 'var(--accent)'
                }}>
                  {isCompleted ? `${overallFit}%` : `${round1Score}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* If Assessment is Pending / Not Completed */}
        {!isCompleted && (
          <div className="card mb-4" style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface-secondary)' }}>
            <BrainCircuit size={36} color="var(--accent)" style={{ margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Candidate Assessment In Progress
            </h2>
            <p className="text-secondary text-sm" style={{ maxWidth: '640px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              The candidate has passed Round 1 screening and is authorized for Round 2 Technical Assessment.
              Questions are tailored specifically to probe candidate's documented skills and resolve requirement gaps.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {(!round2?.questions || round2.questions.length === 0) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleGenerateQuestions}
                >
                  <Sparkles size={14} /> Generate Personalized Questions
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSimulateCandidateAnswers}
                disabled={isSimulating}
              >
                <Code2 size={14} /> {isSimulating ? 'Simulating Evaluation...' : 'Simulate Candidate Answers & AI Score Evaluation (Real-Time)'}
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Grid: Questions Breakdown & HR Calibration Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* LEFT: Question-by-Question Evaluation Breakdown */}
          <div>
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 className="section-title">
                  Quiz & Code Debugging Questions ({round2?.questions?.length || 0})
                </h2>
                <p className="section-subtitle">
                  AI automated scoring across technical correctness, implementation depth, and problem-solving methodology
                </p>
              </div>
            </div>

            {round2?.questions && round2.questions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {round2.questions.map((q, idx) => {
                  const evalScore = adjustedScores[q.id] !== undefined ? adjustedScores[q.id] : (q.evaluation?.score || 0);
                  const isHigh = evalScore >= 8;
                  const isMedium = evalScore >= 6 && evalScore < 8;

                  return (
                    <div
                      key={q.id}
                      className="card"
                      style={{
                        padding: '1.5rem',
                        borderLeft: `4px solid ${isHigh ? 'var(--verified)' : (isMedium ? 'var(--partial)' : 'var(--gap)')}`
                      }}
                    >
                      {/* Question Meta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                              QUESTION {idx + 1} · {q.category.toUpperCase().replace('_', ' ')}
                            </span>
                            <span className="badge" style={{ fontSize: '0.7rem' }}>
                              {q.targetSkill}
                            </span>
                          </div>
                        </div>

                        {/* Question Score Badge with HR Fine-Tuning */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            background: isHigh ? 'var(--verified-bg)' : (isMedium ? 'var(--partial-bg)' : 'var(--gap-bg)'),
                            color: isHigh ? 'var(--verified)' : (isMedium ? 'var(--partial)' : 'var(--gap)'),
                            border: '1px solid var(--border)'
                          }}>
                            {evalScore} / 10 pts
                          </span>

                          {/* HR Live Score Calibration Controls */}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                            title="Decrease score by 1 pt"
                            onClick={() => handleAdjustScore(q.id, evalScore, -1)}
                          >
                            -
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                            title="Increase score by 1 pt"
                            onClick={() => handleAdjustScore(q.id, evalScore, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Prompt */}
                      <p style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 0.85rem' }}>
                        {q.question}
                      </p>

                      {/* Candidate Submitted Answer */}
                      <div style={{ marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                          Candidate's Submitted Answer / Code Snippet:
                        </span>
                        <div style={{
                          background: 'var(--surface-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.85rem 1rem',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.825rem',
                          lineHeight: 1.6,
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {q.candidateAnswer || (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Candidate has not answered this question yet.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Evaluation */}
                      {q.evaluation && (
                        <div style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.85rem 1rem',
                          fontSize: '0.825rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.3rem' }}>
                            <Sparkles size={14} /> AI Evaluator Analysis:
                          </div>
                          <p style={{ margin: '0 0 0.4rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {q.evaluation.reasoning}
                          </p>
                          {q.evaluation.strengths && (
                            <div style={{ color: 'var(--verified)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                              <strong>Strengths: </strong>{q.evaluation.strengths}
                            </div>
                          )}
                          {q.evaluation.weaknesses && (
                            <div style={{ color: 'var(--gap)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                              <strong>Identified Gaps: </strong>{q.evaluation.weaknesses}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <span className="text-secondary text-sm">
                  Click "Generate Personalized Questions" above to produce the Round 2 technical assessment.
                </span>
              </div>
            )}
          </div>

          {/* RIGHT: Real-Time HR Final Hiring Decisions */}
          <div>
            <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Award size={18} color="var(--accent)" />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
                  HR Final Technical Verdict
                </h3>
              </div>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Record your final hiring decision following the Round 2 technical evaluation.
              </p>

              {/* Status Indicator */}
              <div style={{
                background: 'var(--surface-secondary)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Current Application Status
                  </span>
                  <StatusBadge status={application.status} />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Record Final Decision (Real Time)
                </span>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: 'var(--verified)',
                    color: '#fff',
                    justifyContent: 'center',
                    fontWeight: 600
                  }}
                  onClick={() => handleFinalDecision('Selected')}
                >
                  <Check size={14} /> Approve & Select Candidate
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleFinalDecision('Shortlisted')}
                >
                  <CheckCircle2 size={14} /> Shortlist for Team Interview
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: 'var(--gap)',
                    color: '#fff',
                    justifyContent: 'center',
                    fontWeight: 600
                  }}
                  onClick={() => handleFinalDecision('Rejected')}
                >
                  <XCircle size={14} /> Reject Application
                </button>
              </div>

              {/* Notes */}
              <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Evaluator Interview Notes
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Add qualitative notes regarding code clarity, architectural intuition, and problem-solving response..."
                  value={hrNotes}
                  onChange={e => setHrNotes(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={() => {
                  const validDecision: 'Under HR Review' | 'Shortlisted' | 'Rejected' | 'Selected' =
                    application.status === 'Selected' || application.status === 'Shortlisted' || application.status === 'Rejected'
                      ? application.status
                      : 'Under HR Review';
                  recordHRDecision(
                    application.id,
                    validDecision,
                    hrNotes,
                    hr?.name || 'HR Reviewer'
                  );
                  setToast({ message: 'Interview evaluation notes saved in real time.', type: 'success' });
                }}
              >
                Save Evaluation Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
