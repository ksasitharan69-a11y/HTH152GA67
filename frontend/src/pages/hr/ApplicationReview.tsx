import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, RequirementBadge, StatusBadge, EmptyState } from '../../components/SharedComponents';
import type { RequirementStatus, ApplicationStatus, VerificationChallenge, RequirementEvidence } from '../../types';
import {
  ArrowLeft, Play, Shield, Code, MessageSquare, Upload, ClipboardList,
  RefreshCw, CheckCircle2, FileText, ChevronRight, FileSearch
} from 'lucide-react';

export default function ApplicationReview() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const {
    auth, applications, vacancies, runAIAnalysis,
    createChallenge, challenges, overrideDecision,
    updateApplicationStatus
  } = useApp();

  const app = applications.find(a => a.id === applicationId);
  const vacancy = app ? vacancies.find(v => v.id === app.vacancyId) : null;
  const appChallenges = challenges.filter(c => c.applicationId === applicationId);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'workspace' | 'matrix' | 'verification' | 'audit'>('workspace');

  // Currently selected requirement in the evidence inspector panel
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);

  // Modals state
  const [showOverride, setShowOverride] = useState<string | null>(null);
  const [overrideForm, setOverrideForm] = useState({ status: '' as RequirementStatus | '', reason: '' });
  const [showVerifyModal, setShowVerifyModal] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<ApplicationStatus | ''>('');
  const [showResumeDrawer, setShowResumeDrawer] = useState(false);

  const analysis = app?.aiAnalysis;

  // Set default selected requirement to the first one when analysis loads
  const currentSelectedReq = useMemo(() => {
    if (!analysis || analysis.requirements.length === 0) return null;
    if (selectedReqId) {
      const found = analysis.requirements.find(r => r.requirementId === selectedReqId);
      if (found) return found;
    }
    return analysis.requirements[0];
  }, [analysis, selectedReqId]);

  if (!app || !vacancy) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <EmptyState
            icon={<FileText size={24} style={{ color: 'var(--text-muted)' }} />}
            title="Application Record Not Found"
            text="The candidate evaluation record does not exist or has been removed."
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

  const handleRunAI = () => {
    runAIAnalysis(app.id);
    setToast({ message: 'Evaluating candidate resume against requirements...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Evaluation completed: evidence cited for each requirement.', type: 'success' });
    }, 1200);
  };

  const handleOverride = (reqId: string) => {
    if (!overrideForm.status || !overrideForm.reason) return;
    overrideDecision(app.id, reqId, overrideForm.status as RequirementStatus, overrideForm.reason, auth.user?.name || 'HR Reviewer');
    setToast({ message: 'Evaluation decision updated with logged justification.', type: 'success' });
    setShowOverride(null);
    setOverrideForm({ status: '', reason: '' });
  };

  const handleCreateChallenge = (reqId: string, requirement: string, type: VerificationChallenge['type']) => {
    createChallenge(app.id, reqId, requirement, type);
    setToast({ message: `Verification task initiated for ${requirement}`, type: 'success' });
    setShowVerifyModal(null);
  };

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    updateApplicationStatus(app.id, newStatus, auth.user?.name || 'HR Reviewer');
    setToast({ message: `Status updated to "${newStatus}"`, type: 'success' });
    setShowStatusModal(false);
    setNewStatus('');
  };

  const statuses: ApplicationStatus[] = [
    'Applied', 'Under Review', 'Verification Required', 'Assessment',
    'Shortlisted', 'Selected', 'Not Selected'
  ];

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content page-content-wide">
        {/* Navigation Breadcrumb */}
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate(`/hr/vacancy/${app.vacancyId}`)}>
          <ArrowLeft size={14} /> Back to {vacancy.title} Candidates
        </button>

        {/* Editorial Candidate Identity Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                {app.candidateName || app.candidateEmail}
              </h1>
              <StatusBadge status={app.status} />
            </div>

            <p className="text-secondary" style={{ fontSize: '0.9375rem', marginTop: '0.35rem' }}>
              {vacancy.title} · <strong>{vacancy.companyName}</strong> · Applied {new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {app.resumeContent && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowResumeDrawer(!showResumeDrawer)}>
                <FileSearch size={13} /> {showResumeDrawer ? 'Hide Resume' : 'View Resume Text'}
              </button>
            )}

            {!analysis ? (
              <button className="btn btn-primary btn-sm" onClick={handleRunAI}>
                <Play size={13} /> Run Evidence Evaluation
              </button>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={handleRunAI} title="Re-evaluate resume text">
                <RefreshCw size={13} /> Re-evaluate
              </button>
            )}

            <button className="btn btn-primary btn-sm" onClick={() => setShowStatusModal(true)}>
              Update Status
            </button>
          </div>
        </div>

        {/* Expandable Plaintext Resume Drawer */}
        {showResumeDrawer && app.resumeContent && (
          <div className="card mb-4" style={{ background: 'var(--surface-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="section-title" style={{ fontSize: '0.75rem' }}>Submitted Resume Plaintext</span>
              <span className="text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>{app.resumeFile || 'source-doc.txt'}</span>
            </div>
            <div style={{
              maxHeight: 180, overflowY: 'auto', padding: '0.85rem 1rem', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap'
            }}>
              {app.resumeContent}
            </div>
          </div>
        )}

        {/* Editorial Match Summary Strip */}
        {analysis && (
          <div className="metric-strip" style={{ marginBottom: '1.75rem' }}>
            <div className="metric-item" style={{ flex: '0 0 200px' }}>
              <div className="metric-label">Requirement Coverage</div>
              <div className="metric-value" style={{ color: analysis.overallScore >= 70 ? 'var(--verified)' : (analysis.overallScore >= 40 ? 'var(--partial)' : 'var(--gap)') }}>
                {analysis.overallScore}%
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Verified Evidence</div>
              <div className="metric-value" style={{ color: 'var(--verified)' }}>
                {analysis.requirements.filter(r => r.status === 'VERIFIED').length}
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Partial Evidence</div>
              <div className="metric-value" style={{ color: 'var(--partial)' }}>
                {analysis.requirements.filter(r => r.status === 'PARTIAL').length}
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Unverified</div>
              <div className="metric-value" style={{ color: 'var(--unverified)' }}>
                {analysis.requirements.filter(r => r.status === 'UNVERIFIED').length}
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Missing Gaps</div>
              <div className="metric-value" style={{ color: 'var(--gap)' }}>
                {analysis.requirements.filter(r => r.status === 'GAP').length}
              </div>
            </div>
          </div>
        )}

        {/* Workspace Tab Navigation */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'workspace' ? 'active' : ''}`}
            onClick={() => setActiveTab('workspace')}
          >
            Evidence Review Workspace ({analysis ? analysis.requirements.length : 0})
          </button>
          <button
            className={`tab ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('matrix')}
          >
            Traceability Matrix
          </button>
          <button
            className={`tab ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            Verification Tasks ({appChallenges.length})
          </button>
          <button
            className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Trail ({app.auditTrail.length})
          </button>
        </div>

        {/* TAB 1: Signature Review Workspace (Split: Left Requirements, Right Inspector) */}
        {activeTab === 'workspace' && analysis && (
          <div className="review-workspace">
            {/* Left Column: Requirements List */}
            <div className="requirements-list-column">
              <span className="section-title" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                Evaluated Requirements · Select to inspect
              </span>

              {analysis.requirements.map(req => {
                const isSelected = currentSelectedReq?.requirementId === req.requirementId;
                return (
                  <div
                    key={req.requirementId}
                    className={`requirement-row-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedReqId(req.requirementId)}
                  >
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                        <RequirementBadge status={req.status} />
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                          {req.requirement}
                        </span>
                        {req.hrOverride && (
                          <span className="badge badge-unverified" style={{ fontSize: '0.65rem' }}>
                            Overridden
                          </span>
                        )}
                        {req.verificationMethod && req.verificationMethod !== 'resume' && (
                          <span className="badge badge-verified" style={{ fontSize: '0.65rem' }}>
                            Verified
                          </span>
                        )}
                      </div>

                      <p className="text-secondary text-xs" style={{ margin: 0, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{req.evidence}"
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span className="btn btn-ghost btn-sm" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {req.status === 'UNVERIFIED' || req.status === 'GAP' ? 'Verify' : 'Inspect'} <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Sticky Document Evidence Inspector */}
            <div className="evidence-inspector-panel">
              {currentSelectedReq ? (
                <div>
                  {/* Header of Inspector */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Evidence Inspector
                      </span>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600, marginTop: '0.15rem', color: 'var(--text-primary)' }}>
                        {currentSelectedReq.requirement}
                      </h3>
                    </div>
                    <RequirementBadge status={currentSelectedReq.status} />
                  </div>

                  {/* Why this status? */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span className="section-title" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>
                      Reasoning
                    </span>
                    <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {currentSelectedReq.aiReasoning}
                    </p>
                  </div>

                  {/* Document Style Evidence Excerpt Box */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span className="section-title" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>
                      CITED EVIDENCE EXCERPT
                    </span>
                    <div className="evidence-document-box">
                      <div className="evidence-source-tag">
                        <FileText size={11} /> Source: {currentSelectedReq.evidenceSource}
                      </div>
                      <div className="evidence-quote-text">
                        "{currentSelectedReq.evidence}"
                      </div>
                    </div>
                  </div>

                  {/* Logged Override Information */}
                  {currentSelectedReq.hrOverride && (
                    <div style={{ padding: '0.85rem 1rem', background: 'var(--accent-light)', border: '1px solid #D6E4F0', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'block' }}>
                        Human Reviewer Override · By {currentSelectedReq.hrOverride.overriddenBy}
                      </span>
                      <p className="text-secondary text-xs" style={{ marginTop: '0.25rem', lineHeight: 1.5 }}>
                        Status modified from <strong>{currentSelectedReq.hrOverride.originalStatus}</strong> to <strong>{currentSelectedReq.hrOverride.newStatus}</strong>.
                        <br />
                        Rationale: "{currentSelectedReq.hrOverride.reason}"
                      </p>
                    </div>
                  )}

                  {/* Verification Outcome */}
                  {currentSelectedReq.verificationResult && (
                    <div style={{ padding: '0.85rem 1rem', background: 'var(--verified-bg)', border: '1px solid var(--verified-border)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--verified)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        <CheckCircle2 size={13} /> Assessment Completed
                      </div>
                      <p className="text-secondary text-xs" style={{ marginTop: '0.25rem' }}>
                        {currentSelectedReq.verificationResult}
                      </p>
                    </div>
                  )}

                  {/* Next Step Action Buttons */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span className="section-title" style={{ fontSize: '0.7rem' }}>Next Actions</span>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(currentSelectedReq.status === 'UNVERIFIED' || currentSelectedReq.status === 'PARTIAL' || currentSelectedReq.status === 'GAP') && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => setShowVerifyModal(currentSelectedReq.requirementId)}
                        >
                          <Shield size={13} /> Prove This Skill
                        </button>
                      )}

                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setShowOverride(currentSelectedReq.requirementId);
                          setOverrideForm({ status: '', reason: '' });
                        }}
                      >
                        Override Status
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Select a requirement on the left to inspect cited proof and evaluation reasoning.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'workspace' && !analysis && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <EmptyState
              icon={<Play size={24} style={{ color: 'var(--text-muted)' }} />}
              title="Candidate Evaluation Not Generated"
              text="Run automated evidence extraction to compare resume claims against vacancy criteria."
              action={
                <button className="btn btn-primary btn-sm" onClick={handleRunAI}>
                  <Play size={13} /> Run Evidence Evaluation
                </button>
              }
            />
          </div>
        )}

        {/* TAB 2: Full Traceability Matrix Table */}
        {activeTab === 'matrix' && analysis && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Position Requirement</th>
                  <th style={{ width: '15%' }}>Evaluation</th>
                  <th style={{ width: '45%' }}>Cited Document Excerpt</th>
                  <th style={{ width: '18%' }}>Source Location</th>
                </tr>
              </thead>
              <tbody>
                {analysis.requirements.map(req => (
                  <tr key={req.requirementId}>
                    <td style={{ fontWeight: 600 }}>{req.requirement}</td>
                    <td>
                      <RequirementBadge status={req.status} />
                    </td>
                    <td>
                      <span className="text-secondary text-sm" style={{ fontStyle: req.evidence !== 'No evidence found' ? 'normal' : 'italic' }}>
                        "{req.evidence}"
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                        {req.evidenceSource}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Verification Tasks */}
        {activeTab === 'verification' && (
          <div>
            {appChallenges.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {appChallenges.map(ch => (
                  <div key={ch.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{ch.requirement}</span>
                          <span className="tag" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>{ch.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <span className={`badge ${ch.status === 'evaluated' ? 'badge-verified' : ch.status === 'submitted' ? 'badge-partial' : 'badge-unverified'}`}>
                        <span className="badge-dot" />
                        {ch.status}
                      </span>
                    </div>

                    <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                      <span className="section-title" style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.2rem' }}>Task Prompt</span>
                      <span className="text-secondary">{ch.question}</span>
                    </div>

                    {ch.candidateAnswer && (
                      <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-secondary)', borderLeft: '3px solid var(--accent)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                        <span className="section-title" style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.2rem' }}>Candidate Submitted Demonstration</span>
                        <span className="text-primary">{ch.candidateAnswer}</span>
                      </div>
                    )}

                    {ch.aiEvaluation && (
                      <div style={{ padding: '0.85rem 1rem', background: 'var(--verified-bg)', border: '1px solid var(--verified-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--verified)', textTransform: 'uppercase' }}>Validation Assessment</span>
                          <span className="badge badge-verified">{ch.evaluationResult}</span>
                        </div>
                        <span className="text-secondary text-sm">{ch.aiEvaluation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<Shield size={24} style={{ color: 'var(--text-muted)' }} />}
                  title="No Verification Tasks Active"
                  text="When candidate claims are unverified or partial, you can generate practical tasks from the Review Workspace to establish proof."
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="card">
            <span className="section-title" style={{ display: 'block', marginBottom: '1rem' }}>
              Immutable Evaluation Log
            </span>

            <div className="audit-timeline">
              {app.auditTrail.map(entry => (
                <div key={entry.id} className="audit-entry">
                  <div className="audit-entry-header">
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{entry.action}</span>
                    <span className="text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-secondary text-sm" style={{ marginTop: '0.2rem' }}>{entry.details}</div>
                  <div className="text-xs text-muted" style={{ marginTop: '0.35rem' }}>
                    Operator: <strong>{entry.actor}</strong> ({entry.actorRole})
                  </div>
                  {entry.previousValue && entry.newValue && (
                    <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.35rem', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span className="badge badge-unverified">{entry.previousValue}</span>
                      <span>→</span>
                      <span className="badge badge-verified">{entry.newValue}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Override Evaluation Modal */}
      <Modal isOpen={!!showOverride} onClose={() => setShowOverride(null)} title="Override Requirement Evaluation">
        {showOverride && (() => {
          const req = analysis?.requirements.find(r => r.requirementId === showOverride);
          return (
            <div>
              <p className="text-secondary text-sm mb-3">
                Reviewing requirement: <strong className="text-primary">{req?.requirement}</strong>
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="over-stat">Corrected Evaluation</label>
                <select
                  id="over-stat"
                  className="form-select"
                  value={overrideForm.status}
                  onChange={e => setOverrideForm({ ...overrideForm, status: e.target.value as RequirementStatus })}
                >
                  <option value="">Select new status</option>
                  <option value="VERIFIED">VERIFIED — Requirement satisfied with verified proof</option>
                  <option value="PARTIAL">PARTIAL — Substantial knowledge or adjacent experience</option>
                  <option value="UNVERIFIED">UNVERIFIED — Insufficient evidence to validate</option>
                  <option value="GAP">GAP — Definite missing competency</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="over-justification">
                  Reviewer Justification <span className="required">*</span>
                </label>
                <textarea
                  id="over-justification"
                  className="form-textarea"
                  rows={3}
                  placeholder="Explain why the automated evaluation should be changed (e.g. validated during live technical interview)..."
                  value={overrideForm.reason}
                  onChange={e => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOverride(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleOverride(showOverride)}
                  disabled={!overrideForm.status || !overrideForm.reason}
                >
                  Commit Override
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Prove This Skill Modal */}
      <Modal isOpen={!!showVerifyModal} onClose={() => setShowVerifyModal(null)} title="Initiate Proof Verification">
        {showVerifyModal && (() => {
          const req = analysis?.requirements.find(r => r.requirementId === showVerifyModal);
          return (
            <div>
              <p className="text-secondary text-sm mb-3">
                Select a verification mechanism to validate candidate competence in <strong className="text-primary">{req?.requirement}</strong>:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button
                  className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.95rem 1.15rem' }}
                  onClick={() => handleCreateChallenge(showVerifyModal, req?.requirement || '', 'challenge')}
                >
                  <div style={{ padding: '0.45rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <Code size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>Technical Challenge</span>
                    <span className="text-secondary text-xs">Generate a practical exercise or code snippet for the candidate to solve</span>
                  </div>
                </button>

                <button
                  className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.95rem 1.15rem' }}
                  onClick={() => handleCreateChallenge(showVerifyModal, req?.requirement || '', 'interview')}
                >
                  <div style={{ padding: '0.45rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <MessageSquare size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>Targeted Inquiry</span>
                    <span className="text-secondary text-xs">Direct question regarding specific implementation nuances and real scenarios</span>
                  </div>
                </button>

                <button
                  className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.95rem 1.15rem' }}
                  onClick={() => handleCreateChallenge(showVerifyModal, req?.requirement || '', 'evidence_upload')}
                >
                  <div style={{ padding: '0.45rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <Upload size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>Evidence Document Request</span>
                    <span className="text-secondary text-xs">Request credentials, repository links, certification numbers, or portfolio samples</span>
                  </div>
                </button>

                <button
                  className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.95rem 1.15rem' }}
                  onClick={() => handleCreateChallenge(showVerifyModal, req?.requirement || '', 'work_sample')}
                >
                  <div style={{ padding: '0.45rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <ClipboardList size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>Work Demonstration Sample</span>
                    <span className="text-secondary text-xs">Request documentation or artifacts from past real-world project contributions</span>
                  </div>
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Status Update Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Application Status">
        <div>
          <div className="form-group">
            <label className="form-label">Current Candidate State</label>
            <div>
              <StatusBadge status={app.status} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cand-status-new">Transition To</label>
            <select
              id="cand-status-new"
              className="form-select"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as ApplicationStatus)}
            >
              <option value="">Select candidate status</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStatusUpdate}
              disabled={!newStatus}
            >
              Save Status Transition
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
