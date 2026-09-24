import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, ScoreRing, RequirementBadge, StatusBadge, EmptyState } from '../../components/SharedComponents';
import type { RequirementStatus, ApplicationStatus, VerificationChallenge } from '../../types';
import {
  ArrowLeft, Play, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  FileText, Shield, Code, MessageSquare, Upload, ClipboardList, RefreshCw
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
  const [activeTab, setActiveTab] = useState<'analysis' | 'evidence' | 'verification' | 'audit'>('analysis');
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState<string | null>(null);
  const [overrideForm, setOverrideForm] = useState({ status: '' as RequirementStatus | '', reason: '' });
  const [showVerifyModal, setShowVerifyModal] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<ApplicationStatus | ''>('');

  if (!app || !vacancy) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <EmptyState
            icon={<FileText size={24} style={{ color: 'var(--text-muted)' }} />}
            title="Application Record Not Found"
            text="The candidate evaluation record does not exist or has been archived."
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
    setToast({ message: 'Evaluating candidate against job requirements...', type: 'info' });
    setTimeout(() => setToast({ message: 'Evaluation complete: evidence mapped to requirements.', type: 'success' }), 1200);
  };

  const handleOverride = (reqId: string) => {
    if (!overrideForm.status || !overrideForm.reason) return;
    overrideDecision(app.id, reqId, overrideForm.status as RequirementStatus, overrideForm.reason, auth.user?.name || 'HR Reviewer');
    setToast({ message: 'Requirement evaluation overridden with rationale logged.', type: 'success' });
    setShowOverride(null);
    setOverrideForm({ status: '', reason: '' });
  };

  const handleCreateChallenge = (reqId: string, requirement: string, type: VerificationChallenge['type']) => {
    createChallenge(app.id, reqId, requirement, type);
    setToast({ message: `Verification request initiated (${type})`, type: 'success' });
    setShowVerifyModal(null);
  };

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    updateApplicationStatus(app.id, newStatus, auth.user?.name || 'HR Reviewer');
    setToast({ message: `Application status updated to "${newStatus}"`, type: 'success' });
    setShowStatusModal(false);
    setNewStatus('');
  };

  const analysis = app.aiAnalysis;

  const statuses: ApplicationStatus[] = [
    'Applied', 'Under Review', 'Verification Required', 'Assessment',
    'Shortlisted', 'Selected', 'Not Selected'
  ];

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content page-content-wide">
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate(`/hr/vacancy/${app.vacancyId}`)}>
          <ArrowLeft size={15} /> Back to {vacancy.title} Candidates
        </button>

        {/* Candidate Evaluation Header Card */}
        <div className="card mb-4" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  {app.candidateName || app.candidateEmail}
                </h1>
                <StatusBadge status={app.status} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <span>{app.candidateEmail}</span>
                <span>•</span>
                <span>Role: <strong>{vacancy.title}</strong></span>
                <span>•</span>
                <span>Applied: {new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {!analysis ? (
                <button className="btn btn-primary" onClick={handleRunAI}>
                  <Play size={14} /> Run Evidence Evaluation
                </button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={handleRunAI}>
                  <RefreshCw size={13} /> Re-evaluate Evidence
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setShowStatusModal(true)}>
                Update Status
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar if Analysis Available */}
          {analysis && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              marginTop: '1.25rem',
              padding: '1.25rem',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              flexWrap: 'wrap'
            }}>
              <ScoreRing score={analysis.overallScore} size={88} strokeWidth={6} />

              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  Recommendation: {analysis.recommendation}
                </div>
                <p className="text-secondary text-xs" style={{ lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  {analysis.summary}
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-verified">
                    <span className="badge-dot" />
                    {analysis.requirements.filter(r => r.status === 'VERIFIED').length} Verified
                  </span>
                  <span className="badge badge-partial">
                    <span className="badge-dot" />
                    {analysis.requirements.filter(r => r.status === 'PARTIAL').length} Partial
                  </span>
                  <span className="badge badge-unverified">
                    <span className="badge-dot" />
                    {analysis.requirements.filter(r => r.status === 'UNVERIFIED').length} Unverified
                  </span>
                  <span className="badge badge-gap">
                    <span className="badge-dot" />
                    {analysis.requirements.filter(r => r.status === 'GAP').length} Gap
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Candidate Resume Snippet */}
          {app.resumeContent && (
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  Submitted Resume / Profile Source
                </span>
                <span className="text-xs text-muted">Plaintext extraction</span>
              </div>
              <div style={{
                padding: '0.875rem 1rem',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                maxHeight: 140,
                overflowY: 'auto',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}>
                {app.resumeContent}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="tabs" style={{ marginBottom: '1.25rem' }}>
          <button
            className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Requirements & Evidence ({analysis ? analysis.requirements.length : 0})
          </button>
          <button
            className={`tab ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            Evidence Traceability Map
          </button>
          <button
            className={`tab ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            Verification Challenges ({appChallenges.length})
          </button>
          <button
            className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Traceable Audit Trail ({app.auditTrail.length})
          </button>
        </div>

        {/* Tab 1: Requirements & Evidence Breakdown */}
        {activeTab === 'analysis' && analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {analysis.requirements.map(req => {
              const isExpanded = expandedReq === req.requirementId;
              return (
                <div key={req.requirementId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedReq(isExpanded ? null : req.requirementId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--surface-elevated)' : 'var(--surface)',
                      borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                      transition: 'background var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <RequirementBadge status={req.status} />
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {req.requirement}
                      </span>
                      {req.hrOverride && (
                        <span className="badge badge-unverified" style={{ fontSize: '0.6875rem' }}>
                          HR Overridden
                        </span>
                      )}
                      {req.verificationMethod && req.verificationMethod !== 'resume' && (
                        <span className="badge badge-verified" style={{ fontSize: '0.6875rem' }}>
                          Verified: {req.verificationMethod}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="text-secondary text-xs" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.evidence}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '1.25rem', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Evidence citation block */}
                      <div className="evidence-block">
                        <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Extracted Evidence
                        </span>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                          "{req.evidence}"
                        </div>
                        <div className="evidence-source" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <FileText size={12} />
                          <span>Source location: <strong>{req.evidenceSource}</strong></span>
                        </div>
                      </div>

                      {/* AI Reasoning */}
                      <div style={{ padding: '0.875rem 1rem', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Evaluation Reasoning
                        </span>
                        <p className="text-secondary text-sm" style={{ lineHeight: 1.6 }}>
                          {req.aiReasoning}
                        </p>
                      </div>

                      {/* Logged HR Override if exists */}
                      {req.hrOverride && (
                        <div style={{
                          padding: '0.875rem 1rem',
                          background: 'var(--accent-light)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'block' }}>
                            Human Reviewer Override (by {req.hrOverride.overriddenBy})
                          </span>
                          <p className="text-secondary text-xs mt-1">
                            Status adjusted from <strong>{req.hrOverride.originalStatus}</strong> to <strong>{req.hrOverride.newStatus}</strong>.
                            Reason: "{req.hrOverride.reason}"
                          </p>
                        </div>
                      )}

                      {/* Verification Results if exists */}
                      {req.verificationResult && (
                        <div style={{
                          padding: '0.875rem 1rem',
                          background: 'var(--verified-bg)',
                          border: '1px solid var(--verified-border)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--verified)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            <CheckCircle2 size={13} /> Assessment Outcome
                          </div>
                          <p className="text-secondary text-xs mt-1">
                            {req.verificationResult}
                          </p>
                        </div>
                      )}

                      {/* Reviewer Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                        {(req.status === 'UNVERIFIED' || req.status === 'PARTIAL' || req.status === 'GAP') && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowVerifyModal(req.requirementId)}
                          >
                            <Shield size={13} /> Request Skill Verification
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setShowOverride(req.requirementId);
                            setOverrideForm({ status: '', reason: '' });
                          }}
                        >
                          Override Evaluation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'analysis' && !analysis && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <EmptyState
              icon={<Play size={24} style={{ color: 'var(--text-muted)' }} />}
              title="Candidate Not Yet Evaluated"
              text="Execute automated evidence extraction to compare this candidate's background against vacancy requirements."
              action={
                <button className="btn btn-primary btn-sm" onClick={handleRunAI}>
                  <Play size={14} /> Run Evidence Evaluation
                </button>
              }
            />
          </div>
        )}

        {/* Tab 2: Evidence Traceability Map */}
        {activeTab === 'evidence' && analysis && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Evidence Traceability Matrix
              </h3>
              <p className="text-secondary text-sm">
                Every requirement mapped directly to source text cited from the candidate's verified documentation.
              </p>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Job Requirement</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th style={{ width: '45%' }}>Cited Resume / Proof Excerpt</th>
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
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: req.evidence !== 'No evidence found' ? 'normal' : 'italic' }}>
                        {req.evidence}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {req.evidenceSource}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'evidence' && !analysis && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <EmptyState
              icon={<FileText size={24} style={{ color: 'var(--text-muted)' }} />}
              title="No Evidence Available"
              text="Run the evaluation first to map candidate claims to requirements."
            />
          </div>
        )}

        {/* Tab 3: Verification Challenges */}
        {activeTab === 'verification' && (
          <div>
            {appChallenges.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {appChallenges.map(ch => (
                  <div key={ch.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{ch.requirement}</span>
                          <span className="badge badge-unverified" style={{ textTransform: 'capitalize' }}>{ch.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <span className={`badge ${ch.status === 'evaluated' ? 'badge-verified' : ch.status === 'submitted' ? 'badge-partial' : 'badge-unverified'}`}>
                        <span className="badge-dot" />
                        {ch.status}
                      </span>
                    </div>

                    <div style={{ padding: '0.75rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                      <span className="text-xs text-muted" style={{ display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Prompt / Task</span>
                      <span className="text-secondary">{ch.question}</span>
                    </div>

                    {ch.candidateAnswer && (
                      <div style={{ padding: '0.75rem', background: 'var(--surface-elevated)', borderLeft: '3px solid var(--accent)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                        <span className="text-xs text-muted" style={{ display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Candidate Submitted Response</span>
                        <span className="text-primary">{ch.candidateAnswer}</span>
                      </div>
                    )}

                    {ch.aiEvaluation && (
                      <div style={{ padding: '0.75rem', background: 'var(--verified-bg)', border: '1px solid var(--verified-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--verified)', textTransform: 'uppercase' }}>Automated Verification Assessment</span>
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
                  title="No Verification Challenges"
                  text="When candidate claims are partial or unverified, you can issue targeted tasks from the Requirements tab to establish proof."
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Immutable Audit Trail
              </h3>
              <p className="text-secondary text-sm">
                Chronological log of all evaluation milestones, human reviews, status modifications, and verifications.
              </p>
            </div>

            <div className="audit-timeline">
              {app.auditTrail.map(entry => (
                <div key={entry.id} className="audit-entry">
                  <div className="audit-entry-header">
                    <span className="audit-entry-action" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.action}</span>
                    <span className="audit-entry-time text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="audit-entry-details text-secondary text-sm" style={{ marginTop: '0.25rem' }}>{entry.details}</div>
                  <div className="audit-entry-actor text-xs text-muted" style={{ marginTop: '0.25rem' }}>
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

      {/* Override Modal */}
      <Modal isOpen={!!showOverride} onClose={() => setShowOverride(null)} title="Override Requirement Evaluation">
        {showOverride && (() => {
          const req = analysis?.requirements.find(r => r.requirementId === showOverride);
          return (
            <div>
              <p className="text-secondary text-sm mb-3">
                Reviewing requirement: <strong className="text-primary">{req?.requirement}</strong>
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="override-stat">Corrected Status</label>
                <select
                  id="override-stat"
                  className="form-select"
                  value={overrideForm.status}
                  onChange={e => setOverrideForm({ ...overrideForm, status: e.target.value as RequirementStatus })}
                >
                  <option value="">Select status</option>
                  <option value="VERIFIED">VERIFIED — Requirement satisfied with verified proof</option>
                  <option value="PARTIAL">PARTIAL — Substantial knowledge or adjacent experience</option>
                  <option value="UNVERIFIED">UNVERIFIED — Insufficient evidence to validate</option>
                  <option value="GAP">GAP — Definite missing competency</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="override-reason">
                  Reviewer Justification <span className="required">*</span>
                </label>
                <textarea
                  id="override-reason"
                  className="form-textarea"
                  rows={3}
                  placeholder="Explain why the automated evaluation should be changed (e.g., candidate demonstrated equivalent skill in interview)..."
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
                Issue a verification mechanism to validate competency in: <strong className="text-primary">{req?.requirement}</strong>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)' }}
                  onClick={() => handleCreateChallenge(showVerifyModal, req?.requirement || '', 'challenge')}
                >
                  <div style={{ padding: '0.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <Code size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>Technical Challenge</span>
                    <span className="text-secondary text-xs">Generate a practical exercise or code snippet for the candidate to solve</span>
                  </div>
                </button>

                <button
                  className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)' }}
                  onClick={() => handleCreateChallenge(showVerifyModal, req?.requirement || '', 'interview')}
                >
                  <div style={{ padding: '0.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <MessageSquare size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>Targeted Inquiry</span>
                    <span className="text-secondary text-xs">Direct question regarding specific implementation nuances and real scenarios</span>
                  </div>
                </button>

                <button
                  className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)' }}
                  onClick={() => handleCreateChallenge(showVerifyModal, req?.requirement || '', 'evidence_upload')}
                >
                  <div style={{ padding: '0.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <Upload size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>Evidence Document Request</span>
                    <span className="text-secondary text-xs">Request credentials, repository links, certification numbers, or portfolio samples</span>
                  </div>
                </button>

                <button
                  className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)' }}
                  onClick={() => handleCreateChallenge(showVerifyModal, req?.requirement || '', 'work_sample')}
                >
                  <div style={{ padding: '0.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
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
            <label className="form-label">Current Evaluation State</label>
            <div>
              <StatusBadge status={app.status} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="app-status-select">Transition To</label>
            <select
              id="app-status-select"
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
