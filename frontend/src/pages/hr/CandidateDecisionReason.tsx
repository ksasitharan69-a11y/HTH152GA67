import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useApp } from '../../context/AppContext';
import { Toast, StatusBadge } from '../../components/SharedComponents';
import type { HR, ApplicationStatus } from '../../types';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  BrainCircuit, FileText, ChevronRight, Check,
  Send, User, Clock, Building2, Award
} from 'lucide-react';

export default function CandidateDecisionReason() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { auth, getApplication, recordHRDecision } = useApp();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hrNotes, setHrNotes] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<ApplicationStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hr = auth.user as HR;

  useEffect(() => {
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

  const round1Score = application.round1Match?.overallScore || 0;
  const isSelected = application.status === 'Selected' || application.status === 'Shortlisted' ||
    (application.status !== 'Rejected' && round1Score >= 60);
  const isRejected = application.status === 'Rejected' || (!isSelected && round1Score < 60);

  const handleSaveDecision = async (decisionType: 'Selected' | 'Shortlisted' | 'Under HR Review' | 'Rejected') => {
    setIsSubmitting(true);
    try {
      await recordHRDecision(
        application.id,
        decisionType,
        hrNotes.trim() || `HR evaluated candidate as ${decisionType} based on AI predicted score and evidence reasoning.`,
        hr?.name || 'HR Reviewer'
      );
      setSelectedDecision(decisionType);
      setToast({
        message: `Candidate marked as "${decisionType}" in real time. State synchronized across portals.`,
        type: decisionType === 'Rejected' ? 'info' : 'success'
      });
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to save decision.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifiedRequirements = application.round1Match?.requirements.filter(r => r.status === 'MATCH') || [];
  const partialRequirements = application.round1Match?.requirements.filter(r => r.status === 'PARTIAL') || [];
  const gapRequirements = application.round1Match?.requirements.filter(r => r.status === 'GAP' || r.status === 'UNVERIFIED') || [];

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
              Candidate Decision & Selection Reason
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/hr/evidence/${application.id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FileText size={13} /> Full Evidence Dossier
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/hr/assessment/quiz-debugging/${application.id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <BrainCircuit size={13} /> Quiz & Debugging Scores
            </button>
          </div>
        </div>

        {/* Candidate Profile Header Card */}
        <div className="card mb-4" style={{ padding: '1.5rem 1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Applicant Evaluation
                </span>
                <StatusBadge status={application.status} />
              </div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                {application.candidateName || 'Candidate'}
              </h1>
              <p className="text-secondary text-sm" style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span><strong>Role:</strong> {application.role}</span>
                <span>•</span>
                <span><strong>Email:</strong> {application.candidateEmail}</span>
                <span>•</span>
                <span><strong>Company:</strong> {application.companyName}</span>
                <span>•</span>
                <span><strong>Applied:</strong> {new Date(application.appliedAt).toLocaleDateString()}</span>
              </p>
            </div>

            {/* Score Ring / Metric */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              background: 'var(--surface-secondary)',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  AI Predicted Fit Score
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: round1Score >= 60 ? 'var(--verified)' : 'var(--gap)'
                }}>
                  {round1Score}%
                </span>
              </div>
              <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  Round 1 Result
                </span>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: isSelected ? 'var(--verified)' : 'var(--gap)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  marginTop: '0.2rem'
                }}>
                  {isSelected ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  {isSelected ? 'Selected' : 'Not Selected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Selection / Rejection Primary Verdict Banner */}
        <div
          className="card mb-4"
          style={{
            padding: '1.5rem',
            borderLeft: `5px solid ${isSelected ? 'var(--verified)' : 'var(--gap)'}`,
            background: isSelected ? 'var(--verified-bg)' : 'var(--gap-bg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            {isSelected ? (
              <CheckCircle2 size={26} color="var(--verified)" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <XCircle size={26} color="var(--gap)" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: isSelected ? 'var(--verified)' : 'var(--gap)',
                  color: '#fff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '3px'
                }}>
                  {isSelected ? 'CANDIDATE SELECTED / QUALIFIED' : 'CANDIDATE NOT SELECTED / DEFICIT IDENTIFIED'}
                </span>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Evaluated against 60% qualification benchmark
                </span>
              </div>

              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600, margin: '0.25rem 0 0.5rem', color: 'var(--text-primary)' }}>
                {isSelected
                  ? `Why Candidate is Selected: Satisfies ${verifiedRequirements.length} of ${application.round1Match?.requirements.length || 0} Core Competencies (${round1Score}% Match)`
                  : `Why Candidate is Rejected: Fails to meet 60% qualification threshold (${round1Score}% Match with ${gapRequirements.length} Critical Gaps)`}
              </h2>

              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: 0, color: 'var(--text-primary)' }}>
                <strong>Reason: </strong>
                {application.round1Match?.summary ||
                  (isSelected
                    ? 'Candidate demonstrated documented, verified production experience matching key job description criteria.'
                    : 'Candidate submitted insufficient proof or lacks documented production experience for required technical skills.')}
              </p>
            </div>
          </div>
        </div>

        {/* Two-column layout: Left = Evidence Rationale, Right = Interactive Real-time HR Action */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* LEFT: Detailed Requirement-Level Evidence Breakdown */}
          <div>
            <div className="section-header" style={{ marginBottom: '0.75rem' }}>
              <div>
                <h2 className="section-title">Verified Competencies vs Gaps</h2>
                <p className="section-subtitle">Real-time breakdown of resume claims matched against Job Description criteria</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {application.round1Match?.requirements.map((req, idx) => {
                const isMatch = req.status === 'MATCH';
                const isPart = req.status === 'PARTIAL';
                const isGap = req.status === 'GAP' || req.status === 'UNVERIFIED';

                const statusColor = isMatch ? 'var(--verified)' : (isPart ? 'var(--partial)' : 'var(--gap)');
                const statusBg = isMatch ? 'var(--verified-bg)' : (isPart ? 'var(--partial-bg)' : 'var(--gap-bg)');

                return (
                  <div
                    key={req.requirementId || idx}
                    className="card"
                    style={{
                      padding: '1.2rem',
                      borderLeft: `4px solid ${statusColor}`,
                      background: 'var(--surface)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{req.requirement}</strong>
                          {req.type && (
                            <span className="badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                              {req.type}
                            </span>
                          )}
                          {req.category && (
                            <span className="text-muted text-xs">({req.category})</span>
                          )}
                        </div>
                      </div>

                      <span
                        className="badge"
                        style={{
                          background: statusBg,
                          color: statusColor,
                          border: `1px solid ${statusColor}`,
                          fontWeight: 600,
                          fontSize: '0.72rem'
                        }}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.35rem 0', lineHeight: 1.5 }}>
                      <strong>AI Evidence Reasoning: </strong>
                      {req.reasoning}
                    </p>

                    {req.evidence && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--surface-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                        borderLeft: `2px solid ${statusColor}`
                      }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                          Extracted Resume Evidence
                        </span>
                        "{req.evidence}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Real-Time HR Decision Panel & Audit Storage */}
          <div>
            <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Award size={18} color="var(--accent)" />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
                  Real-Time HR Decision & Reason
                </h3>
              </div>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Update candidate status in real time. Changes take immediate effect across candidate and executive portals.
              </p>

              {/* Current Recorded Status */}
              <div style={{
                background: 'var(--surface-secondary)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Active Status
                  </span>
                  <StatusBadge status={application.status} />
                </div>
                {application.hrDecision && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Decided by <strong>{application.hrDecision.decidedBy}</strong> on {new Date(application.hrDecision.decidedAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Select or Change Decision (Instant Update)
                </span>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: 'var(--verified)',
                    color: '#fff',
                    justifyContent: 'center',
                    fontWeight: 600,
                    opacity: isSubmitting ? 0.6 : 1
                  }}
                  onClick={() => handleSaveDecision('Selected')}
                >
                  <Check size={14} /> Mark as Selected (Qualified)
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleSaveDecision('Shortlisted')}
                >
                  <CheckCircle2 size={14} /> Shortlist Candidate
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleSaveDecision('Under HR Review')}
                >
                  <Clock size={14} /> Mark Under HR Review
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
                  onClick={() => handleSaveDecision('Rejected')}
                >
                  <XCircle size={14} /> Mark as Rejected (Disqualified)
                </button>
              </div>

              {/* HR Notes Textarea */}
              <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  HR Decision Rationale & Feedback Notes
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Record why this candidate was selected or rejected. This note is preserved in the real-time audit trail..."
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
                  setToast({ message: 'HR decision rationale saved in real time.', type: 'success' });
                }}
              >
                Save Decision Notes
              </button>

              {/* Round 2 Quiz & Debugging link if available */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  Next Phase Assessment
                </span>
                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  onClick={() => navigate(`/hr/assessment/quiz-debugging/${application.id}`)}
                  style={{
                    justifyContent: 'space-between',
                    border: '1px solid var(--border)',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.825rem'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BrainCircuit size={15} color="var(--accent)" />
                    Quiz & Debugging Scores (HR Only)
                  </span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
