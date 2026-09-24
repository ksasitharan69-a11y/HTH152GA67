import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, StatusBadge, EmptyState, ScoreRing } from '../../components/SharedComponents';
import type { Candidate, Vacancy, Application } from '../../types';
import {
  Building2, Search, Upload, FileText,
  ChevronRight, ArrowLeft
} from 'lucide-react';

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const {
    auth, companies,
    submitApplication, getApplicationsByCandidate,
    challenges, submitChallengeAnswer, evaluateChallenge,
    getVacanciesByCompany
  } = useApp();

  const candidate = auth.user as Candidate;
  if (!candidate) {
    navigate('/candidate/login');
    return null;
  }

  const myApps = getApplicationsByCandidate(candidate.id);
  const myChallenges = challenges.filter(c =>
    myApps.some(a => a.id === c.applicationId) && c.status !== 'evaluated'
  );

  const [activeTab, setActiveTab] = useState<'browse' | 'applications' | 'challenges'>('browse');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [showAppDetail, setShowAppDetail] = useState<Application | null>(null);
  const [resumeContent, setResumeContent] = useState('');
  const [resumeFile, setResumeFile] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Challenge answer
  const [challengeAnswer, setChallengeAnswer] = useState('');

  const companyVacancies = selectedCompany
    ? getVacanciesByCompany(selectedCompany).filter(v => v.status === 'active')
    : [];

  const hasApplied = (vacancyId: string) => {
    return myApps.some(a => a.vacancyId === vacancyId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setResumeContent(ev.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handleApply = () => {
    if (!selectedVacancy || !resumeContent) {
      setToast({ message: 'Please provide your resume content', type: 'error' });
      return;
    }
    submitApplication(candidate.id, candidate.email, selectedVacancy.id, resumeContent, resumeFile);
    setToast({ message: 'Application submitted for evidence evaluation', type: 'success' });
    setShowApply(false);
    setSelectedVacancy(null);
    setResumeContent('');
    setResumeFile('');
    setActiveTab('applications');
  };

  const handleSubmitChallenge = (challengeId: string) => {
    if (!challengeAnswer.trim()) {
      setToast({ message: 'Please provide an answer before submitting', type: 'error' });
      return;
    }
    submitChallengeAnswer(challengeId, challengeAnswer);
    evaluateChallenge(challengeId);
    setToast({ message: 'Response submitted and evaluated against criteria', type: 'success' });
    setChallengeAnswer('');
  };

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content">
        <div className="dashboard-header">
          <h1>Candidate Workspace</h1>
          <p className="text-secondary">
            Candidate: <strong>{candidate.name || candidate.email}</strong> • Evidence-Based Job Matching
          </p>
        </div>

        {/* Inline Metrics Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem'
        }}>
          <div>
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Active Applications</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{myApps.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>In Review / Shortlisted</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {myApps.filter(a => a.status === 'Shortlisted' || a.status === 'Selected').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Pending Verification Tasks</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{myChallenges.length}</div>
          </div>
        </div>

        {/* Workspace Tabs */}
        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          <button
            className={`tab ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            Explore Openings
          </button>
          <button
            className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            My Applications ({myApps.length})
          </button>
          <button
            className={`tab ${activeTab === 'challenges' ? 'active' : ''}`}
            onClick={() => setActiveTab('challenges')}
          >
            Verification Tasks ({myChallenges.length})
          </button>
        </div>

        {/* Tab 1: Browse Jobs */}
        {activeTab === 'browse' && (
          <div>
            {/* Company Selection Bar */}
            <div className="card mb-4" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ maxWidth: 440 }}>
                <label className="form-label" htmlFor="cand-co-select">Select Organization</label>
                <select
                  id="cand-co-select"
                  className="form-select"
                  value={selectedCompany}
                  onChange={e => {
                    setSelectedCompany(e.target.value);
                    setSelectedVacancy(null);
                  }}
                >
                  <option value="">Select a company to browse openings...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCompany && !selectedVacancy && (
              <>
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Open Positions</h2>
                    <p className="section-subtitle">
                      {companies.find(c => c.id === selectedCompany)?.name} — {companyVacancies.length} active vacancy
                    </p>
                  </div>
                </div>

                {companyVacancies.length > 0 ? (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Role Title</th>
                          <th>Department</th>
                          <th>Experience & Education</th>
                          <th>Requirements</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyVacancies.map(v => (
                          <tr
                            key={v.id}
                            onClick={() => setSelectedVacancy(v)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{ fontWeight: 600 }}>{v.title}</td>
                            <td className="text-secondary">{v.department}</td>
                            <td className="text-secondary text-sm">
                              {v.requiredExperience || 'Flexible'} • {v.education || 'Flexible'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {v.requiredSkills.slice(0, 3).map(s => (
                                  <span key={s} className="tag" style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}>{s}</span>
                                ))}
                                {v.requiredSkills.length > 3 && (
                                  <span className="text-muted text-xs">+{v.requiredSkills.length - 3}</span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {hasApplied(v.id) ? (
                                <span className="badge badge-verified">Applied</span>
                              ) : (
                                <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                                  View Requirements <ChevronRight size={14} />
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <EmptyState
                      icon={<Building2 size={24} style={{ color: 'var(--text-muted)' }} />}
                      title="No Active Postings"
                      text="This organization does not currently have any active vacancies."
                    />
                  </div>
                )}
              </>
            )}

            {/* Selected Job Detail */}
            {selectedVacancy && (
              <div>
                <button className="btn btn-ghost btn-sm mb-3" onClick={() => setSelectedVacancy(null)}>
                  <ArrowLeft size={15} /> Back to Job List
                </button>

                <div className="card" style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                        {selectedVacancy.title}
                      </h2>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <span>Company: <strong>{selectedVacancy.companyName}</strong></span>
                        <span>•</span>
                        <span>Department: <strong>{selectedVacancy.department}</strong></span>
                        <span>•</span>
                        <span>Experience: <strong>{selectedVacancy.requiredExperience || 'Any'}</strong></span>
                      </div>
                    </div>

                    <div>
                      {hasApplied(selectedVacancy.id) ? (
                        <span className="badge badge-verified" style={{ padding: '0.5rem 0.875rem', fontSize: '0.875rem' }}>
                          Application on File
                        </span>
                      ) : (
                        <button className="btn btn-primary" onClick={() => setShowApply(true)}>
                          Apply with Resume Evidence
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                    <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Position Overview
                    </span>
                    <p className="text-secondary" style={{ fontSize: '0.9375rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {selectedVacancy.jobDescription}
                    </p>
                  </div>

                  <div style={{ marginTop: '1.25rem' }}>
                    <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Mandatory Required Skills (Evaluated Against Your Resume)
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {selectedVacancy.requiredSkills.map(s => (
                        <span key={s} className="tag" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedVacancy.preferredSkills.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Preferred Skills
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {selectedVacancy.preferredSkills.map(s => (
                          <span key={s} className="tag" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedVacancy.otherRequirements && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                      <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Additional Criteria
                      </span>
                      <p className="text-secondary text-sm">{selectedVacancy.otherRequirements}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedCompany && (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<Search size={24} style={{ color: 'var(--text-muted)' }} />}
                  title="Select an Organization"
                  text="Choose an organization from the menu above to review open vacancies and evaluation criteria."
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Applications */}
        {activeTab === 'applications' && (
          <div>
            {myApps.length > 0 ? (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Role</th>
                      <th>Applied Date</th>
                      <th>Evaluation Status</th>
                      <th>Match Score</th>
                      <th style={{ textAlign: 'right' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myApps.map(app => (
                      <tr
                        key={app.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setShowAppDetail(app)}
                      >
                        <td style={{ fontWeight: 600 }}>{app.companyName}</td>
                        <td className="text-primary">{app.role}</td>
                        <td className="text-secondary text-sm">{new Date(app.appliedAt).toLocaleDateString()}</td>
                        <td><StatusBadge status={app.status} /></td>
                        <td>
                          {app.aiAnalysis ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              color: app.aiAnalysis.overallScore >= 70 ? 'var(--verified)' : (app.aiAnalysis.overallScore >= 40 ? 'var(--partial)' : 'var(--gap)')
                            }}>
                              {app.aiAnalysis.overallScore}%
                            </span>
                          ) : (
                            <span className="text-muted text-xs">Processing</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                            View Breakdown <ChevronRight size={14} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<FileText size={24} style={{ color: 'var(--text-muted)' }} />}
                  title="No Applications Submitted"
                  text="Explore organizations and apply with your resume to view evidence verification status here."
                  action={
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('browse')}>
                      Explore Openings
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Verification Tasks */}
        {activeTab === 'challenges' && (
          <div>
            {myChallenges.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myChallenges.map(ch => {
                  const relatedApp = myApps.find(a => a.id === ch.applicationId);
                  return (
                    <div key={ch.id} className="card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Verify: {ch.requirement}
                          </span>
                          <span className="text-secondary text-xs" style={{ display: 'block', marginTop: '0.2rem' }}>
                            Position: {relatedApp?.role} at {relatedApp?.companyName}
                          </span>
                        </div>
                        <span className="badge badge-unverified" style={{ textTransform: 'capitalize' }}>
                          {ch.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div style={{ padding: '0.875rem 1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                        <span className="text-xs text-muted" style={{ display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Task Instruction
                        </span>
                        <p className="text-secondary text-sm" style={{ lineHeight: 1.6 }}>{ch.question}</p>
                      </div>

                      {ch.status === 'pending' && (
                        <div>
                          <div className="form-group">
                            <label className="form-label" htmlFor={`resp-${ch.id}`}>Your Demonstration / Response</label>
                            <textarea
                              id={`resp-${ch.id}`}
                              className="form-textarea"
                              rows={5}
                              placeholder="Provide technical demonstration, source links, or detailed explanation..."
                              value={challengeAnswer}
                              onChange={e => setChallengeAnswer(e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={() => handleSubmitChallenge(ch.id)}>
                              Submit Verification Response
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<FileText size={24} style={{ color: 'var(--text-muted)' }} />}
                  title="No Pending Verification Tasks"
                  text="When an HR reviewer requests verification for an unverified requirement, tasks will appear here."
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <Modal isOpen={showApply} onClose={() => setShowApply(false)} title="Submit Application for Evidence Review" wide>
        <div>
          <p className="text-secondary text-sm mb-3">
            Applying for <strong>{selectedVacancy?.title}</strong> at {selectedVacancy?.companyName}
          </p>

          <div className="form-group">
            <label className="form-label">Resume Document (.txt, .pdf, .docx)</label>
            <div
              className="file-upload"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <Upload size={22} style={{ color: 'var(--accent)', margin: '0 auto 0.5rem', display: 'block' }} />
              {resumeFile ? (
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--verified)', display: 'block' }}>{resumeFile}</span>
                  <span className="text-xs text-muted">Click to select different file</span>
                </div>
              ) : (
                <div>
                  <span style={{ fontWeight: 500, display: 'block', color: 'var(--text-primary)' }}>Select resume file</span>
                  <span className="text-xs text-muted">Text files will be read directly for evidence mapping</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="resume-text">
              Resume Text Content (Analyzed for Criteria Match)
            </label>
            <textarea
              id="resume-text"
              className="form-textarea"
              rows={8}
              placeholder="Paste plaintext resume or edit extracted content..."
              value={resumeContent}
              onChange={e => setResumeContent(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowApply(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApply}
              disabled={!resumeContent.trim()}
            >
              Submit Application
            </button>
          </div>
        </div>
      </Modal>

      {/* Application Detail Modal */}
      <Modal isOpen={!!showAppDetail} onClose={() => setShowAppDetail(null)} title="Application & Evidence Evaluation" wide>
        {showAppDetail && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{showAppDetail.role}</h3>
                <span className="text-secondary text-sm">{showAppDetail.companyName} • Applied {new Date(showAppDetail.appliedAt).toLocaleDateString()}</span>
              </div>
              <StatusBadge status={showAppDetail.status} />
            </div>

            {showAppDetail.aiAnalysis ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  padding: '1rem 1.25rem',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem'
                }}>
                  <ScoreRing score={showAppDetail.aiAnalysis.overallScore} size={76} strokeWidth={6} />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'block' }}>
                      Overall Fit: {showAppDetail.aiAnalysis.overallScore}%
                    </span>
                    <span className="text-secondary text-xs">
                      {showAppDetail.aiAnalysis.recommendation}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Requirement Breakdown
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {showAppDetail.aiAnalysis.requirements.map(req => (
                      <div key={req.requirementId} style={{ padding: '0.75rem 1rem', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{req.requirement}</span>
                          <span className={`badge badge-${req.status.toLowerCase()}`}>
                            <span className="badge-dot" />
                            {req.status}
                          </span>
                        </div>
                        <p className="text-secondary text-xs" style={{ margin: 0 }}>
                          Evidence: "{req.evidence}" ({req.evidenceSource})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-secondary text-sm" style={{ padding: '1rem 0' }}>
                Your application has been received and is queued for evaluation by the hiring team.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
