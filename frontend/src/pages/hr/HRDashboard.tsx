import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, EmptyState, StatusBadge } from '../../components/SharedComponents';
import type { HR, ApplicationStatus } from '../../types';
import { Plus, ArrowRight, Upload } from 'lucide-react';

function extractJdMetadata(jdText: string, fileName?: string) {
  const lines = jdText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Extract position title
  let title = '';
  const titleLine = lines.find(l => /^(job\s*title|role|position|title)\s*[:\-]/i.test(l));
  if (titleLine) {
    title = titleLine.replace(/^(job\s*title|role|position|title)\s*[:\-]\s*/i, '').trim();
  } else if (fileName && fileName.trim()) {
    title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
  } else if (lines.length > 0 && lines[0].length < 60) {
    title = lines[0];
  }
  if (!title || title.length < 3) {
    title = 'Software Engineer';
  }

  // Extract common technical skills from JD
  const techKeywords = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'Go', 'Golang',
    'C++', 'C#', '.NET', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'CI/CD', 'REST API',
    'GraphQL', 'Linux', 'Microservices', 'HTML', 'CSS', 'Tailwind', 'Next.js',
    'Django', 'FastAPI', 'Spring Boot', 'Kafka', 'RabbitMQ', 'Machine Learning', 'AI'
  ];
  const foundSkills = techKeywords.filter(tech => {
    const regex = new RegExp(`\\b${tech.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(jdText);
  });

  const requiredSkills = foundSkills.slice(0, 5);
  if (requiredSkills.length === 0) {
    requiredSkills.push('Technical Problem Solving', 'Software Engineering', 'System Architecture');
  }
  const preferredSkills = foundSkills.slice(5, 9);

  // Extract experience
  const expMatch = jdText.match(/(\d+\+?\s*(?:to\s*\d+\+?)?\s*years?(?:\s*of\s*experience)?)/i);
  const requiredExperience = expMatch ? expMatch[0] : '2+ years';

  return { title, requiredSkills, preferredSkills, requiredExperience };
}

export default function HRDashboard() {
  const navigate = useNavigate();
  const {
    auth, createVacancy, getVacanciesByHR,
    getApplicationsByVacancy, applications, getCompany
  } = useApp();

  const hr = auth.user as HR;

  useEffect(() => {
    if (!auth.isAuthenticated || !hr) {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, hr, navigate]);

  if (!auth.isAuthenticated || !hr) {
    return null;
  }

  const company = getCompany(hr.companyId);
  const departments = company?.departments || [hr.department];

  const myVacancies = getVacanciesByHR(hr.id);
  const activeVacancies = myVacancies.filter(v => v.status === 'active');
  const closedVacancies = myVacancies.filter(v => v.status === 'closed');

  // Applications for this HR's vacancies
  const myVacancyIds = new Set(myVacancies.map(v => v.id));
  const myApplications = applications.filter(a => myVacancyIds.has(a.vacancyId));

  const underAssessment = myApplications.filter(a => a.status === 'Assessment Pending');
  const underReview = myApplications.filter(a => a.status === 'Under HR Review');
  const shortlisted = myApplications.filter(a => a.status === 'Shortlisted' || a.status === 'Selected');
  const rejected = myApplications.filter(a => a.status === 'Rejected');

  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'vacancies' | 'all' | 'assessment' | 'review' | 'shortlisted' | 'rejected'>('vacancies');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Vacancy creation: Job Description upload only
  const [jdFileName, setJdFileName] = useState('');
  const [jdText, setJdText] = useState('');
  const [vError, setVError] = useState('');

  const handleJDFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setJdFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = (ev.target?.result as string) || '';
        setJdText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleCreateVacancy = (e: React.FormEvent) => {
    e.preventDefault();
    setVError('');
    if (!jdText.trim() && !jdFileName) {
      setVError('Please upload a job description document or paste the job description text.');
      return;
    }

    const content = jdText.trim() || `Job Description: ${jdFileName}`;
    const metadata = extractJdMetadata(content, jdFileName);

    createVacancy({
      title: metadata.title,
      department: hr.department,
      companyId: hr.companyId,
      companyName: hr.companyName,
      hrId: hr.id,
      jobDescription: content,
      responsibilities: content,
      technicalRequirements: content,
      requiredSkills: metadata.requiredSkills,
      preferredSkills: metadata.preferredSkills,
      requiredExperience: metadata.requiredExperience,
      education: 'Relevant Degree or Equivalent Professional Experience',
      location: 'Bangalore, India (Hybrid)',
      workMode: 'Hybrid',
      otherRequirements: '',
    });

    setToast({ message: `Vacancy for "${metadata.title}" created successfully from Job Description`, type: 'success' });
    setShowCreate(false);
    setJdFileName('');
    setJdText('');
  };

  const getFilteredApps = () => {
    if (activeTab === 'assessment') return underAssessment;
    if (activeTab === 'review') return underReview;
    if (activeTab === 'shortlisted') return shortlisted;
    if (activeTab === 'rejected') return rejected;
    return myApplications;
  };

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content page-content-wide">
        {/* Clean Workspace Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            HR Workspace
          </h1>

          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create Vacancy
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activeTab === 'vacancies' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('vacancies')}
          >
            Active Vacancies ({activeVacancies.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('all')}
          >
            All Applications ({myApplications.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'review' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('review')}
          >
            Under Review ({underReview.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'assessment' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('assessment')}
          >
            In Assessment ({underAssessment.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'shortlisted' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('shortlisted')}
          >
            Shortlisted ({shortlisted.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'rejected' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('rejected')}
          >
            Rejected ({rejected.length})
          </button>
        </div>

        {/* View Mode 1: Vacancies List */}
        {activeTab === 'vacancies' && (
          <div>
            {activeVacancies.length > 0 ? (
              <div className="table-container mb-5">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Department & Exp</th>
                      <th>Structured Criteria</th>
                      <th>Applicants</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeVacancies.map(v => {
                      const apps = getApplicationsByVacancy(v.id);
                      return (
                        <tr
                          key={v.id}
                          onClick={() => navigate(`/hr/vacancy/${v.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{v.title}</span>
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
                                <span className="text-muted text-xs" style={{ alignSelf: 'center' }}>+{v.requiredSkills.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{apps.length}</span>
                            <span className="text-muted text-xs"> candidates</span>
                          </td>
                          <td>
                            <span className="badge badge-verified">
                              <span className="badge-dot" />
                              Published
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                              Inspect Candidates <ArrowRight size={13} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card mb-5" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<Plus size={22} />}
                  title="No Active Vacancies"
                  text="Publish a job vacancy to define criteria and begin accepting candidate applications."
                  action={
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                      <Plus size={13} /> Create Vacancy
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: Candidates Application Pipeline */}
        {activeTab !== 'vacancies' && (
          <div>
            {getFilteredApps().length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Applied Role</th>
                      <th>Round 1 (Resume Match)</th>
                      <th>Round 2 (Assessment)</th>
                      <th>Overall Fit</th>
                      <th>Current State</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredApps().map(app => (
                      <tr
                        key={app.id}
                        onClick={() => navigate(`/hr/application/${app.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {app.candidateName || app.candidateEmail}
                            </div>
                            <div className="text-muted text-xs">{app.candidateEmail}</div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{app.role}</span>
                        </td>
                        <td>
                          {app.round1Match ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: app.round1Match.overallScore >= 70 ? 'var(--verified)' : (app.round1Match.overallScore >= 40 ? 'var(--partial)' : 'var(--gap)')
                            }}>
                              {app.round1Match.overallScore}% match
                            </span>
                          ) : (
                            <span className="text-muted text-xs">Matching pending</span>
                          )}
                        </td>
                        <td>
                          {app.round2Assessment?.status === 'completed' ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: (app.round2Assessment.overallScore || 0) >= 70 ? 'var(--verified)' : 'var(--partial)'
                            }}>
                              {app.round2Assessment.overallScore}% evaluated
                            </span>
                          ) : app.status === 'Assessment Pending' ? (
                            <span className="text-muted text-xs" style={{ color: 'var(--partial)' }}>Awaiting answers</span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td>
                          {app.finalAnalysis ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              color: 'var(--accent)'
                            }}>
                              {app.finalAnalysis.overallFitScore}%
                            </span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={app.status} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                            Review Evidence <ArrowRight size={13} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <span className="text-secondary text-sm">
                  No applications currently matching this category filter.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Vacancy Modal - Job Description Upload Only */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Upload Job Description to Create Vacancy">
        <form onSubmit={handleCreateVacancy}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Upload Job Description Document <span className="required">*</span>
            </label>
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '2.25rem 1.5rem',
                textAlign: 'center',
                background: 'var(--surface-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '1rem'
              }}
              onClick={() => document.getElementById('hr-jd-file-upload')?.click()}
            >
              <input
                id="hr-jd-file-upload"
                type="file"
                accept=".txt,.pdf,.docx,.doc,.md"
                style={{ display: 'none' }}
                onChange={handleJDFileUpload}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                  color: 'var(--accent)'
                }}>
                  <Upload size={22} />
                </div>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {jdFileName ? jdFileName : 'Click to select or upload Job Description'}
                  </span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Supports TXT, PDF, DOCX, DOC, MD formats
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="jd-pasted-text" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Or Paste Job Description Text</span>
              {jdText && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{jdText.length} characters</span>}
            </label>
            <textarea
              id="jd-pasted-text"
              className="form-textarea"
              rows={7}
              placeholder="Paste job description text here if you don't have a document file..."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              style={{ fontSize: '0.875rem', lineHeight: '1.6' }}
            />
            <p className="form-hint" style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              HireProof's engine automatically analyzes this job description to extract role requirements, required skills, and experience criteria.
            </p>
          </div>

          {vError && <p className="form-error mb-2">{vError}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Upload & Create Vacancy
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
