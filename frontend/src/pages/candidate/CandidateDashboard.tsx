import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, StatusBadge, EmptyState, RequirementBadge } from '../../components/SharedComponents';
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
      setToast({ message: 'Please provide resume content for evaluation', type: 'error' });
      return;
    }
    submitApplication(candidate.id, candidate.email, selectedVacancy.id, resumeContent, resumeFile);
    setToast({ message: 'Application submitted for evidence matching', type: 'success' });
    setShowApply(false);
    setSelectedVacancy(null);
    setResumeContent('');
    setResumeFile('');
    setActiveTab('applications');
  };

  const handleSubmitChallenge = (challengeId: string) => {
    if (!challengeAnswer.trim()) {
      setToast({ message: 'Please provide a response before submitting', type: 'error' });
      return;
    }
    submitChallengeAnswer(challengeId, challengeAnswer);
    evaluateChallenge(challengeId);
    setToast({ message: 'Demonstration submitted and evaluated', type: 'success' });
    setChallengeAnswer('');
  };

  const candidateDisplayName = candidate.name ? candidate.name.split(' ')[0] : candidate.email.split('@')[0];

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content">
        {/* Editorial Greeting Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Candidate Portal
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
            Welcome, {candidateDisplayName}
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Find a position that fits your experience, or review evidence verification feedback on submitted applications.
          </p>
        </div>

        {/* Editorial Metric Strip */}
        <div className="metric-strip">
          <div className="metric-item">
            <div className="metric-label">Applications Submitted</div>
            <div className="metric-value">{myApps.length}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">In Review / Shortlisted</div>
            <div className="metric-value" style={{ color: 'var(--verified)' }}>
              {myApps.filter(a => a.status === 'Shortlisted' || a.status === 'Selected').length}
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Verification Tasks</div>
            <div className="metric-value" style={{ color: myChallenges.length > 0 ? 'var(--partial)' : 'var(--text-primary)' }}>
              {myChallenges.length}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            Explore Open Positions
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

        {/* TAB 1: Explore Positions */}
        {activeTab === 'browse' && (
          <div>
            {/* Organization Selector */}
            <div className="card mb-4" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ maxWidth: 440 }}>
                <label className="form-label" htmlFor="company-dropdown">Select Company</label>
                <select
                  id="company-dropdown"
                  className="form-select"
                  value={selectedCompany}
                  onChange={e => {
                    setSelectedCompany(e.target.value);
                    setSelectedVacancy(null);
                  }}
                >
                  <option value="">Select organization to view open positions...</option>
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
                    <h2 className="section-title">Available Roles</h2>
                    <p className="section-subtitle">
                      {companies.find(c => c.id === selectedCompany)?.name} · {companyVacancies.length} active position{companyVacancies.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {companyVacancies.length > 0 ? (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Position</th>
                          <th>Department & Experience</th>
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
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.title}</span>
                            </td>
                            <td className="text-secondary text-sm">
                              {v.department} · {v.requiredExperience || 'Any exp'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {v.requiredSkills.slice(0, 3).map(s => (
                                  <span key={s} className="tag" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>{s}</span>
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
                                <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                                  View Role <ChevronRight size={13} />
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
                      icon={<Building2 size={24} />}
                      title="No Active Vacancies"
                      text="This organization does not currently have any active positions listed."
                    />
                  </div>
                )}
              </>
            )}

            {/* Selected Role Detail */}
            {selectedVacancy && (
              <div>
                <button className="btn btn-ghost btn-sm mb-3" onClick={() => setSelectedVacancy(null)}>
                  <ArrowLeft size={14} /> Back to Openings
                </button>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.625rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {selectedVacancy.title}
                      </h2>
                      <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {selectedVacancy.companyName} · {selectedVacancy.department} · {selectedVacancy.requiredExperience || 'Flexible experience'}
                      </p>
                    </div>

                    <div>
                      {hasApplied(selectedVacancy.id) ? (
                        <span className="badge badge-verified" style={{ padding: '0.45rem 0.85rem' }}>
                          Application on File
                        </span>
                      ) : (
                        <button className="btn btn-primary" onClick={() => setShowApply(true)}>
                          Apply with Resume Evidence
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
                    <span className="section-title" style={{ display: 'block', marginBottom: '0.35rem' }}>
                      Position Scope
                    </span>
                    <p className="text-secondary" style={{ fontSize: '0.9375rem', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                      {selectedVacancy.jobDescription}
                    </p>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <span className="section-title" style={{ display: 'block', marginBottom: '0.45rem' }}>
                      Mandatory Criteria (Evaluated directly against your resume)
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {selectedVacancy.requiredSkills.map(s => (
                        <span key={s} className="tag" style={{ fontWeight: 500 }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  {selectedVacancy.preferredSkills.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <span className="section-title" style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                        Preferred Knowledge
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {selectedVacancy.preferredSkills.map(s => (
                          <span key={s} className="tag" style={{ color: 'var(--text-secondary)' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedVacancy.otherRequirements && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                      <span className="section-title" style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                        Additional Notes
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
                  icon={<Search size={24} />}
                  title="Select a Company"
                  text="Choose an organization from the menu above to review openings and criteria."
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: My Applications */}
        {activeTab === 'applications' && (
          <div>
            {myApps.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Applied Role</th>
                      <th>Applied Date</th>
                      <th>Evaluation Status</th>
                      <th>Match Fit</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
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
                            <span className="text-muted text-xs">Evaluation in progress</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                            View Evidence Breakdown <ChevronRight size={13} />
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
                  icon={<FileText size={24} />}
                  title="No Applications Submitted"
                  text="Browse positions across companies and apply with your resume to track evidence evaluation here."
                  action={
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('browse')}>
                      Explore Positions
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Verification Tasks */}
        {activeTab === 'challenges' && (
          <div>
            {myChallenges.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myChallenges.map(ch => {
                  const relatedApp = myApps.find(a => a.id === ch.applicationId);
                  return (
                    <div key={ch.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                        <div>
                          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Skill Verification: {ch.requirement}
                          </span>
                          <span className="text-secondary text-xs" style={{ display: 'block', marginTop: '0.2rem' }}>
                            {relatedApp?.role} at {relatedApp?.companyName}
                          </span>
                        </div>
                        <span className="tag" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
                          {ch.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                        <span className="section-title" style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.25rem' }}>
                          Verification Instruction
                        </span>
                        <p className="text-secondary text-sm" style={{ lineHeight: 1.6 }}>{ch.question}</p>
                      </div>

                      {ch.status === 'pending' && (
                        <div>
                          <div className="form-group">
                            <label className="form-label" htmlFor={`cand-resp-${ch.id}`}>Your Proof / Response</label>
                            <textarea
                              id={`cand-resp-${ch.id}`}
                              className="form-textarea"
                              rows={5}
                              placeholder="Provide technical solution, code snippet, repository URL, or detailed experience explanation..."
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
                  icon={<FileText size={24} />}
                  title="No Pending Tasks"
                  text="When an HR reviewer requests verification for an unverified claim, tasks will appear here."
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <Modal isOpen={showApply} onClose={() => setShowApply(false)} title="Submit Application" wide>
        <div>
          <p className="text-secondary text-sm mb-3">
            Applying for <strong>{selectedVacancy?.title}</strong> at {selectedVacancy?.companyName}
          </p>

          <div className="form-group">
            <label className="form-label">Resume Document (.txt, .pdf, .docx)</label>
            <div
              className="file-upload"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-secondary)' }}
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
            <label className="form-label" htmlFor="cand-paste-resume">
              Resume Text Content (Analyzed for Criteria Match)
            </label>
            <textarea
              id="cand-paste-resume"
              className="form-textarea"
              rows={8}
              placeholder="Paste plaintext resume or verify extracted content..."
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.375rem', fontWeight: 600 }}>{showAppDetail.role}</h3>
                <span className="text-secondary text-sm">{showAppDetail.companyName} · Applied {new Date(showAppDetail.appliedAt).toLocaleDateString()}</span>
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
                  background: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem'
                }}>
                  <div>
                    <span className="metric-label" style={{ display: 'block' }}>Overall Fit Score</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      color: showAppDetail.aiAnalysis.overallScore >= 70 ? 'var(--verified)' : (showAppDetail.aiAnalysis.overallScore >= 40 ? 'var(--partial)' : 'var(--gap)')
                    }}>
                      {showAppDetail.aiAnalysis.overallScore}%
                    </span>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.25rem', flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', color: 'var(--text-primary)' }}>
                      {showAppDetail.aiAnalysis.recommendation}
                    </span>
                    <p className="text-secondary text-xs" style={{ margin: 0, marginTop: '0.2rem' }}>
                      {showAppDetail.aiAnalysis.summary}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="section-title" style={{ display: 'block', marginBottom: '0.65rem' }}>
                    Requirement Evaluation Breakdown
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {showAppDetail.aiAnalysis.requirements.map(req => (
                      <div key={req.requirementId} style={{ padding: '0.75rem 1rem', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{req.requirement}</span>
                          <RequirementBadge status={req.status} />
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
                Your application has been received and is queued for evidence evaluation by the hiring team.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
