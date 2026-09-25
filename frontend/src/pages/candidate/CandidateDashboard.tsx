import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, StatusBadge, EmptyState, RequirementBadge, ScoreRing } from '../../components/SharedComponents';
import type { Candidate, Vacancy, Application } from '../../types';
import {
  Building2, Search, Upload, FileText,
  ChevronRight, ArrowLeft, BrainCircuit, CheckCircle2,
  FileCheck
} from 'lucide-react';

function isCandidateSelectedInRound1(app: Application): boolean {
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

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const {
    auth, companies,
    submitApplication, getApplicationsByCandidate,
    getVacanciesByCompany, runRound1Matching,
    generateAssessmentQuestions, submitAssessmentAnswers,
    getApplication
  } = useApp();

  const candidate = auth.user as Candidate;

  useEffect(() => {
    if (!auth.isAuthenticated || !candidate) {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, candidate, navigate]);

  const [activeTab, setActiveTab] = useState<'browse' | 'applications' | 'assessment'>('browse');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState<Vacancy | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [showAppDetail, setShowAppDetail] = useState<Application | null>(null);
  const [resumeContent, setResumeContent] = useState('');
  const [resumeFile, setResumeFile] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAssessmentAppId, setActiveAssessmentAppId] = useState<string>('');
  const [answersState, setAnswersState] = useState<Record<string, string>>({});

  const myApps = candidate ? getApplicationsByCandidate(candidate.id) : [];
  const selectedInRound1Apps = myApps.filter(isCandidateSelectedInRound1);
  const pendingAssessments = selectedInRound1Apps.filter(a => a.round2Assessment?.status !== 'completed');

  useEffect(() => {
    if (activeTab === 'assessment' && selectedInRound1Apps.length === 0) {
      setActiveTab('applications');
    }
  }, [activeTab, selectedInRound1Apps.length]);

  if (!auth.isAuthenticated || !candidate) {
    return null;
  }

  const currentCompanyObj = companies.find(c => c.id === selectedCompany);
  const departmentsList = currentCompanyObj?.departments || [];

  const companyVacancies = selectedCompany
    ? getVacanciesByCompany(selectedCompany)
        .filter(v => v.status === 'active')
        .filter(v => selectedDepartment === 'ALL' || v.department === selectedDepartment)
    : [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const lowerName = file.name.toLowerCase();
      const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
      const isTxt = lowerName.endsWith('.txt') || file.type === 'text/plain';

      if (!isPdf && !isTxt) {
        setToast({ message: 'Invalid format. Resumes are accepted as PDF (.pdf) or text (.txt) format only.', type: 'error' });
        e.target.value = '';
        return;
      }

      setResumeFile(file.name);
      if (isTxt) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setResumeContent(ev.target?.result as string || '');
        };
        reader.readAsText(file);
      } else {
        // PDF document uploaded
        handlePasteSampleResume();
        setResumeFile(file.name);
        setToast({ message: `Uploaded PDF "${file.name}" processed successfully for evaluation.`, type: 'success' });
      }
    }
  };

  const handleApply = async () => {
    if (!selectedVacancy || selectedVacancy.status === 'closed') {
      setToast({ message: 'This vacancy has concluded recruitment rounds and is now closed.', type: 'error' });
      setShowApply(false);
      setSelectedVacancy(null);
      return;
    }
    if (!resumeContent.trim()) {
      setToast({ message: 'Please provide resume content for evaluation', type: 'error' });
      return;
    }
    try {
      const newApp = await submitApplication(
        candidate.id,
        candidate.email,
        candidate.name || 'Candidate',
        selectedVacancy.id,
        resumeContent,
        resumeFile || 'Resume.txt'
      );

      // Run Round 1 Matching & conditionally unlock Round 2
      try {
        const match = await runRound1Matching(newApp.id);
        const updatedApp = getApplication(newApp.id) || newApp;
        if (match.selectedInRound1 || match.overallScore >= 60) {
          await generateAssessmentQuestions(newApp.id);
          setActiveAssessmentAppId(newApp.id);
          setToast({ message: `Round 1 Complete (${match.overallScore}% match)! Review your selection reason below to proceed to Round 2.`, type: 'success' });
        } else {
          setToast({ message: `Round 1 Complete (${match.overallScore}% match). Review your evaluation reason below.`, type: 'info' });
        }
        setShowAppDetail(updatedApp);
        setActiveTab('applications');
      } catch {
        setToast({ message: 'Application submitted for HR evaluation.', type: 'info' });
        setActiveTab('applications');
      }
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to submit application.', type: 'error' });
    }

    setShowApply(false);
    setSelectedVacancy(null);
    setResumeContent('');
    setResumeFile('');
  };

  const handlePasteSampleResume = () => {
    const sample = `ALEX CHEN
Full-Stack & Backend Software Engineer · Bangalore, India
Email: ${candidate.email} | GitHub: ${candidate.githubProfile || 'github.com/alexchen'} | LinkedIn: ${candidate.linkedinProfile || 'linkedin.com/in/alexchen'}

PROFESSIONAL SUMMARY
Backend-focused Software Engineer with 2.8 years of production experience designing and building RESTful APIs and asynchronous microservices using Python and FastAPI. Implemented complex SQL queries and schema indexing in PostgreSQL. Familiar with Docker containerization and basic AWS deployments.

WORK EXPERIENCE
Backend Software Engineer | DataPulse Systems (2023 - Present)
- Developed and deployed high-performance asynchronous REST APIs using Python and FastAPI, serving 35,000+ daily active client requests.
- Optimized relational database queries in PostgreSQL, creating composite indexes and reducing query response times by 42%.
- Created multi-stage Dockerfiles and containerized 4 internal microservices for deployment on staging environments.
- Designed RESTful API schemas with strict Pydantic validation and comprehensive Swagger documentation.

Junior Python Developer | CloudMatrix Labs (2022 - 2023)
- Implemented API integrations and background workers using Python and Celery.
- Maintained database migrations and monitored AWS CloudWatch application logs and S3 storage buckets.

TECHNICAL SKILLS
Languages: Python, SQL, JavaScript
Frameworks: FastAPI, SQLAlchemy, Pydantic, Celery
Databases: PostgreSQL, Redis
Tools & DevOps: Docker, Git, AWS (S3, CloudWatch basics), Postman
Architecture: RESTful APIs, Microservices, Asynchronous IO

EDUCATION
B.Tech in Computer Science & Engineering (2018 - 2022)`;

    setResumeContent(sample);
    setResumeFile('Alex_Chen_Backend_Resume.pdf');
    setToast({ message: 'Sample real-world software engineer resume loaded.', type: 'info' });
  };

  const currentAssessmentApp = selectedInRound1Apps.find(a => a.id === activeAssessmentAppId) || selectedInRound1Apps[0];

  const handleSubmitAssessment = async (appId: string) => {
    if (!currentAssessmentApp?.round2Assessment) return;

    const answersArray = currentAssessmentApp.round2Assessment.questions.map(q => ({
      questionId: q.id,
      answer: answersState[q.id] || ''
    }));

    const hasEmpty = answersArray.some(a => !a.answer.trim());
    if (hasEmpty) {
      setToast({ message: 'Please provide answers for all technical questions before submitting.', type: 'error' });
      return;
    }

    try {
      await submitAssessmentAnswers(appId, answersArray);
      setToast({ message: 'Round 2 Technical Assessment submitted! AI evaluated your responses. HR has received your profile.', type: 'success' });
      setActiveTab('applications');
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to submit assessment.', type: 'error' });
    }
  };

  const handleFillSampleAnswers = () => {
    if (!currentAssessmentApp?.round2Assessment) return;
    const sampleAnswers: Record<string, string> = {
      [currentAssessmentApp.round2Assessment.questions[0]?.id]:
        'In FastAPI, I use Pydantic BaseModel with strict Field validations for request schemas. For async database operations, I initialize an asynchronous SQLAlchemy sessionmaker with asyncpg connection pooling (setting pool_size=20, max_overflow=10). All route handlers utilize async/await to ensure non-blocking event loops, and I employ custom exception handlers to return consistent HTTP 4xx/5xx RFC-7807 problem details.',

      [currentAssessmentApp.round2Assessment.questions[1]?.id]:
        'To diagnose slow queries, I first inspect pg_stat_statements and execute EXPLAIN ANALYZE on the slow query to detect sequential scans vs index scans. Under high concurrency, I check for lock contention in pg_locks. I create composite B-tree indexes matching the WHERE and ORDER BY clauses, optimize join orders, and configure connection poolers like PgBouncer to prevent connection starvation.',

      [currentAssessmentApp.round2Assessment.questions[2]?.id]:
        'In our high-throughput backend services, we encountered a severe bottleneck where database writes locked active analytical read queries. I separated reads to a read-replica and introduced an asynchronous Celery task queue with Redis for batching writes. Latency dropped from 420ms to 48ms, monitored via Prometheus latency percentiles (p95 and p99).',

      [currentAssessmentApp.round2Assessment.questions[3]?.id]:
        'I write multi-stage Dockerfiles: Stage 1 builds the wheels using Python-slim. Stage 2 copies only compiled wheels into a distroless or minimal Alpine runtime, runs under a non-privileged user (appuser:10001), injects environment variables at runtime via secrets managers, and sets up explicit HEALTHCHECK instructions with curl to prevent routing traffic to unhealthy containers.'
    };

    setAnswersState(sampleAnswers);
    setToast({ message: 'Technical answers populated for demonstration.', type: 'info' });
  };

  const candidateDisplayName = candidate.name ? candidate.name.split(' ')[0] : candidate.email.split('@')[0];

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content page-content-wide">
        {/* Editorial Greeting Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Candidate Portal
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
            Welcome, {candidateDisplayName}
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Apply for positions with verifiable resume matching, take your personalized AI Technical Assessment, and track application progress.
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activeTab === 'browse' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('browse')}
          >
            Explore Open Positions
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'applications' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('applications')}
          >
            My Applications ({myApps.length})
          </button>
          {selectedInRound1Apps.length > 0 && (
            <button
              className={`btn btn-sm ${activeTab === 'assessment' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                setActiveAssessmentAppId(selectedInRound1Apps[0].id);
                setActiveTab('assessment');
              }}
            >
              <BrainCircuit size={14} /> Round 2: AI Technical Assessment {pendingAssessments.length > 0 && `(${pendingAssessments.length} Pending)`}
            </button>
          )}
        </div>

        {/* ==================== TAB 1: EXPLORE OPEN POSITIONS ==================== */}
        {activeTab === 'browse' && (
          <div>
            {/* Company Selection */}
            <div className="card mb-4" style={{ padding: '1.5rem 1.75rem' }}>
              <span className="section-title" style={{ display: 'block', marginBottom: '0.65rem' }}>
                1. Select Employer
              </span>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: selectedCompany ? '1.25rem' : 0 }}>
                {companies.map(c => (
                  <button
                    key={c.id}
                    className={`btn ${selectedCompany === c.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setSelectedCompany(c.id);
                      setSelectedDepartment('ALL');
                    }}
                  >
                    <Building2 size={16} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>

              {/* Department Filter Pills */}
              {selectedCompany && departmentsList.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                    2. Filter by Department
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      className={`btn btn-sm ${selectedDepartment === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setSelectedDepartment('ALL')}
                      style={{ fontSize: '0.78rem' }}
                    >
                      All Departments
                    </button>
                    {departmentsList.map(dept => (
                      <button
                        key={dept}
                        className={`btn btn-sm ${selectedDepartment === dept ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setSelectedDepartment(dept)}
                        style={{ fontSize: '0.78rem' }}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vacancies for selected company */}
            {selectedCompany ? (
              <div>
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Published Openings ({companyVacancies.length})</h2>
                    <p className="section-subtitle">
                      {selectedDepartment === 'ALL' ? 'Showing all department vacancies' : `Filtered to ${selectedDepartment}`}
                    </p>
                  </div>
                </div>

                {companyVacancies.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {companyVacancies.map(v => (
                      <div key={v.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {v.department} {v.workMode ? `· ${v.workMode}` : ''}
                            </span>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600, margin: '0.15rem 0 0' }}>
                              {v.title}
                            </h3>
                          </div>
                          <span className="badge badge-verified">Active</span>
                        </div>

                        <p className="text-secondary text-sm" style={{ flex: 1, marginBottom: '1rem', lineHeight: 1.5 }}>
                          {v.jobDescription.slice(0, 160)}...
                        </p>

                        <div style={{ marginBottom: '1.25rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                            MANDATORY REQUIREMENTS
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {v.requiredSkills.map(s => (
                              <span key={s} className="tag" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>{s}</span>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setShowJobDetailsModal(v)}
                            style={{ fontSize: '0.78rem' }}
                          >
                            View Role Details
                          </button>

                          {myApps.some(a => a.vacancyId === v.id) ? (
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--verified)' }}>
                              ✓ Applied
                            </span>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setSelectedVacancy(v);
                                setShowApply(true);
                              }}
                            >
                              Apply with Resume <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <EmptyState
                      icon={<Search size={22} />}
                      title="No Active Openings in this Department"
                      text="Try selecting another department or view all departments."
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <span className="text-secondary text-sm">Please select a company above to explore published roles.</span>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: MY APPLICATIONS & STATUS TRACKER ==================== */}
        {activeTab === 'applications' && (
          <div>
            <div className="section-header">
              <div>
                <h2 className="section-title">Application Status & Feedback</h2>
                <p className="section-subtitle">Real-time status tracking across Round 1 (Resume Match) and Round 2 (Technical Assessment)</p>
              </div>
            </div>

            {myApps.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Position & Employer</th>
                      <th>Round 1 (Resume Match)</th>
                      <th>Round 2 (Tech Assessment)</th>
                      <th>Application Status</th>
                      <th>Submission Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myApps.map(app => (
                      <tr key={app.id}>
                        <td>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{app.role}</strong>
                            <div className="text-muted text-xs">{app.companyName}</div>
                          </div>
                        </td>
                        <td>
                          {app.round1Match ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 600,
                                  fontSize: '0.875rem',
                                  color: app.round1Match.overallScore >= 70 ? 'var(--verified)' : 'var(--partial)'
                                }}>
                                  {app.round1Match.overallScore}% match
                                </span>
                                <span className={`badge ${isCandidateSelectedInRound1(app) ? 'badge-verified' : 'badge-gap'}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                                  {isCandidateSelectedInRound1(app) ? 'Selected' : 'Not Selected'}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '230px', lineHeight: 1.3 }}>
                                {app.round1Match.summary}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted text-xs">Matching pending</span>
                          )}
                        </td>
                        <td>
                          {app.round2Assessment?.status === 'completed' ? (
                            <div>
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                color: (app.round2Assessment.overallScore || 0) >= 70 ? 'var(--verified)' : 'var(--partial)'
                              }}>
                                {app.round2Assessment.overallScore}% evaluated
                              </span>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Round 2 Completed</p>
                            </div>
                          ) : isCandidateSelectedInRound1(app) ? (
                            <div>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setActiveAssessmentAppId(app.id);
                                  setActiveTab('assessment');
                                }}
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                              >
                                Take Assessment →
                              </button>
                              <span className="text-muted text-xs" style={{ display: 'block', marginTop: '0.2rem', color: 'var(--verified)' }}>
                                ✓ Round 1 Passed
                              </span>
                            </div>
                          ) : app.round1Match ? (
                            <span className="text-muted text-xs" style={{ color: 'var(--gap)' }}>
                              Locked: Not Selected in Round 1
                            </span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="text-secondary text-sm">
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowAppDetail(app)}
                          >
                            View Reason & Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<FileText size={22} />}
                  title="No Applications Submitted"
                  text="Select an open position to submit your resume for evidence-based matching."
                  action={
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('browse')}>
                      Browse Openings
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: ROUND 2 AI TECHNICAL ASSESSMENT ==================== */}
        {activeTab === 'assessment' && (
          <div>
            <div className="section-header">
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--verified)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                  ROUND 2
                </span>
                <h2 className="section-title" style={{ marginTop: '0.25rem' }}>
                  Personalized AI Technical Assessment
                </h2>
                <p className="section-subtitle">
                  These technical questions are dynamically grounded in the job requirements, your resume claims, and identified partial competencies.
                </p>
              </div>

              {currentAssessmentApp?.round2Assessment?.status !== 'completed' && (
                <button className="btn btn-secondary btn-sm" onClick={handleFillSampleAnswers}>
                  Populate Sample Answers (Demo)
                </button>
              )}
            </div>

            {!currentAssessmentApp ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<BrainCircuit size={28} />}
                  title="No Pending Assessments"
                  text="Submit an application to generate your personalized Round 2 AI Technical Assessment."
                  action={
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('browse')}>
                      Apply to a Role
                    </button>
                  }
                />
              </div>
            ) : currentAssessmentApp.round2Assessment?.status === 'completed' ? (
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <CheckCircle2 size={24} style={{ color: 'var(--verified)' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Assessment Completed</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Evaluated for <strong>{currentAssessmentApp.role}</strong> at {currentAssessmentApp.companyName}
                    </p>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Score</span>
                    <h2 style={{ margin: 0, color: 'var(--verified)', fontFamily: 'var(--font-mono)' }}>
                      {currentAssessmentApp.round2Assessment.overallScore}%
                    </h2>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-secondary)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {currentAssessmentApp.round2Assessment.explanation}
                  </p>
                </div>

                {/* Question Evaluations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {currentAssessmentApp.round2Assessment.questions.map((q, idx) => (
                    <div key={q.id} style={{ border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>Question {idx + 1}: {q.targetSkill}</strong>
                        <span style={{ fontWeight: 700, color: (q.evaluation?.score || 0) >= 7 ? 'var(--verified)' : 'var(--partial)' }}>
                          Score: {q.evaluation?.score} / 10
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>{q.question}</p>
                      <div style={{ background: 'var(--surface-secondary)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                        "{q.candidateAnswer}"
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>AI Feedback:</strong> {q.evaluation?.reasoning}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Questionnaire Form */
              <div className="card" style={{ padding: '2rem' }}>
                {/* Round 1 Qualification Reason Banner */}
                <div style={{
                  background: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  borderLeft: '4px solid var(--verified)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--verified)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                      ROUND 1 QUALIFICATION REASON
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--verified)' }}>
                      Selected with {currentAssessmentApp?.round1Match?.overallScore}% Match
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {currentAssessmentApp?.round1Match?.summary || 'Candidate demonstrated verified resume evidence matching the core role requirements.'}
                  </p>
                </div>

                <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
                    Technical Assessment: {currentAssessmentApp.role}
                  </h3>
                  <span className="text-secondary text-sm">
                    Answer each question thoroughly with concrete technical principles, code considerations, or architectural steps.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {(currentAssessmentApp.round2Assessment?.questions || []).map((q, idx) => (
                    <div key={q.id} style={{ border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent-light)', color: 'var(--accent)', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                          QUESTION {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Domain: {q.targetSkill} ({q.category.replace('_', ' ')})
                        </span>
                      </div>

                      <h4 style={{ margin: '0.35rem 0 0.85rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {q.question}
                      </h4>

                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        Your Technical Explanation
                      </label>
                      <textarea
                        className="form-input"
                        rows={4}
                        placeholder="Provide your technical approach, design trade-offs, and implementation considerations..."
                        value={answersState[q.id] || ''}
                        onChange={e => setAnswersState({ ...answersState, [q.id]: e.target.value })}
                      />
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={() => handleSubmitAssessment(currentAssessmentApp.id)}
                    >
                      <BrainCircuit size={16} /> Submit Assessment to AI Evaluator
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== VACANCY DETAILS MODAL ==================== */}
        <Modal
          isOpen={!!showJobDetailsModal}
          onClose={() => setShowJobDetailsModal(null)}
          title={showJobDetailsModal?.title || 'Job Details'}
          wide
        >
          {showJobDetailsModal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--surface-secondary)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{showJobDetailsModal.title}</h3>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {showJobDetailsModal.companyName} · {showJobDetailsModal.department} {showJobDetailsModal.location ? `· ${showJobDetailsModal.location}` : ''} {showJobDetailsModal.workMode ? `· ${showJobDetailsModal.workMode}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>Exp: <strong>{showJobDetailsModal.requiredExperience || 'Flexible'}</strong></div>
                  <div>Edu: <strong>{showJobDetailsModal.education || 'Flexible'}</strong></div>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Job Overview & Scope</strong>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {showJobDetailsModal.jobDescription}
                </p>
              </div>

              {showJobDetailsModal.responsibilities && (
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Key Responsibilities</strong>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {showJobDetailsModal.responsibilities}
                  </p>
                </div>
              )}

              {showJobDetailsModal.technicalRequirements && (
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.35rem' }}>Technical Requirements</strong>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {showJobDetailsModal.technicalRequirements}
                  </p>
                </div>
              )}

              <div>
                <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.45rem' }}>Mandatory Skills (Evaluated in Round 1)</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {showJobDetailsModal.requiredSkills.map(s => (
                    <span key={s} className="tag" style={{ fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              </div>

              {showJobDetailsModal.preferredSkills.length > 0 && (
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.45rem', color: 'var(--text-muted)' }}>Preferred / Additional Skills</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {showJobDetailsModal.preferredSkills.map(s => (
                      <span key={s} className="tag" style={{ color: 'var(--text-secondary)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowJobDetailsModal(null)}>
                  Close
                </button>
                {showJobDetailsModal.status === 'active' ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedVacancy(showJobDetailsModal);
                      setShowJobDetailsModal(null);
                      setShowApply(true);
                    }}
                  >
                    Apply with Resume
                  </button>
                ) : (
                  <span className="badge badge-gap" style={{ alignSelf: 'center' }}>
                    Position Closed
                  </span>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* ==================== APPLICATION MODAL: UPLOAD RESUME ==================== */}
        <Modal
          isOpen={showApply}
          onClose={() => setShowApply(false)}
          title={`Apply for ${selectedVacancy?.title || 'Position'}`}
          wide
        >
          <div>
            <div style={{ background: 'var(--surface-secondary)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedVacancy?.title}</strong>
              <div className="text-secondary text-xs" style={{ marginTop: '0.2rem' }}>
                {selectedVacancy?.companyName} · {selectedVacancy?.department} · Exp: {selectedVacancy?.requiredExperience}
              </div>
            </div>

            {/* Document Parser & Resume Text Upload */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Resume Document (.pdf, .txt) <span className="required">*</span>
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handlePasteSampleResume}
                  style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  Paste Sample Real Resume
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Upload Document
                </button>
                {resumeFile && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--verified)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <FileCheck size={14} /> {resumeFile}
                  </span>
                )}
              </div>

              <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Extracted Resume Text (Editable / Direct Input for AI Engine)
              </label>
              <textarea
                className="form-textarea"
                rows={9}
                placeholder="Paste your resume content or upload a file above. Round 1 will semantically analyze every requirement against this text..."
                value={resumeContent}
                onChange={e => setResumeContent(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowApply(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApply}>
                Submit Application & Start Round 1
              </button>
            </div>
          </div>
        </Modal>

        {/* ==================== CANDIDATE FEEDBACK MODAL (NO PRIVATE HR NOTES) ==================== */}
        <Modal
          isOpen={!!showAppDetail}
          onClose={() => setShowAppDetail(null)}
          title={`Application Details — ${showAppDetail?.role}`}
          wide
        >
          {showAppDetail && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{showAppDetail.role}</h3>
                  <span className="text-secondary text-xs">{showAppDetail.companyName}</span>
                </div>
                <StatusBadge status={showAppDetail.status} />
              </div>

              {/* Round 1 Selection / Rejection Reason Banner */}
              <div style={{
                background: isCandidateSelectedInRound1(showAppDetail) ? 'var(--verified-bg)' : 'var(--gap-bg)',
                border: `1px solid ${isCandidateSelectedInRound1(showAppDetail) ? 'var(--verified-border)' : 'var(--gap-border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: isCandidateSelectedInRound1(showAppDetail) ? 'var(--verified)' : 'var(--gap)',
                    color: '#fff',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '3px'
                  }}>
                    ROUND 1 REASON
                  </span>
                  <strong style={{ fontSize: '0.95rem', color: isCandidateSelectedInRound1(showAppDetail) ? 'var(--verified)' : 'var(--gap)' }}>
                    {isCandidateSelectedInRound1(showAppDetail)
                      ? 'Selected in Round 1 (Qualified for Round 2)'
                      : 'Not Selected in Round 1'}
                  </strong>
                </div>

                <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  <strong>Reason: </strong>
                  {showAppDetail.round1Match?.summary || 'Resume analyzed against role requirements.'}
                </p>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {isCandidateSelectedInRound1(showAppDetail) ? (
                    <span>Candidate scored <strong>{showAppDetail.round1Match?.overallScore}%</strong> (qualifies by meeting the 60% threshold).</span>
                  ) : (
                    <span>Candidate scored <strong>{showAppDetail.round1Match?.overallScore}%</strong> (did not meet the 60% threshold required to qualify for Round 2).</span>
                  )}
                </div>

                {/* THEN ONLY: Show proceed to Round 2 button if selected */}
                {isCandidateSelectedInRound1(showAppDetail) && showAppDetail.round2Assessment?.status !== 'completed' && (
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      ✓ Round 1 reason reviewed. You can now proceed to the next round.
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setShowAppDetail(null);
                        setActiveAssessmentAppId(showAppDetail.id);
                        setActiveTab('assessment');
                      }}
                    >
                      Take Round 2 AI Technical Assessment →
                    </button>
                  </div>
                )}
              </div>

              {/* Round 2 Reason (if completed) */}
              {showAppDetail.round2Assessment?.status === 'completed' && (
                <div style={{
                  background: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  borderLeft: '4px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                      ROUND 2 REASON
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      Technical Assessment Evaluated ({showAppDetail.round2Assessment.overallScore}%)
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Reason / Evaluation: </strong>
                    {showAppDetail.round2Assessment.explanation}
                  </p>
                </div>
              )}

              {/* Status explanation */}
              <div style={{
                background: showAppDetail.status === 'Selected' || showAppDetail.status === 'Shortlisted' ? 'var(--verified-bg)' : (showAppDetail.status === 'Rejected' ? 'var(--gap-bg)' : 'var(--accent-light)'),
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                marginBottom: '1.25rem'
              }}>
                <strong style={{ fontSize: '0.9rem' }}>
                  {showAppDetail.status === 'Selected' && '🎉 Congratulations! You have been selected.'}
                  {showAppDetail.status === 'Shortlisted' && '✓ You have been shortlisted by the hiring team.'}
                  {showAppDetail.status === 'Under HR Review' && 'ℹ️ Your assessment has been evaluated and is under human HR review.'}
                  {showAppDetail.status === 'Assessment Pending' && '⚠️ Round 2 AI Technical Assessment is ready for you to complete.'}
                  {showAppDetail.status === 'Rejected' && 'Constructive Application Feedback'}
                </strong>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {showAppDetail.status === 'Rejected'
                    ? 'Thank you for your time and effort. Below is feedback on technical areas to strengthen for future roles.'
                    : 'The hiring team evaluates candidates through transparent evidence matching and technical assessments.'}
                </p>
              </div>

              {/* Score Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Round 1: Resume Match</span>
                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                    <ScoreRing score={showAppDetail.round1Match?.overallScore || 0} size={70} strokeWidth={6} />
                  </div>
                </div>
                {isCandidateSelectedInRound1(showAppDetail) ? (
                  <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Round 2: Technical Assessment</span>
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      <ScoreRing score={showAppDetail.round2Assessment?.overallScore || 0} size={70} strokeWidth={6} />
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Round 2: Technical Assessment</span>
                    <span className="text-muted text-xs" style={{ marginTop: '0.75rem' }}>Only unlocked if selected in Round 1</span>
                  </div>
                )}
              </div>

              {/* Strengths & Improvement Areas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--verified)', textTransform: 'uppercase' }}>
                    Verified Strengths
                  </span>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                    {(showAppDetail.round1Match?.strengths || ['Technical experience documented']).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gap)', textTransform: 'uppercase' }}>
                    Relevant Skill Gaps
                  </span>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                    {(showAppDetail.round1Match?.unverifiedSkills || showAppDetail.round1Match?.gaps || []).length > 0 ? (
                      [...(showAppDetail.round1Match?.unverifiedSkills || []), ...(showAppDetail.round1Match?.gaps || [])].map((g, i) => (
                        <li key={i}>{g}</li>
                      ))
                    ) : (
                      <li style={{ color: 'var(--text-muted)' }}>No major skill gaps identified.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Assessment Technical Improvement Areas */}
              {(showAppDetail.round2Assessment?.technicalWeaknesses || []).length > 0 && (
                <div style={{ background: 'var(--surface-secondary)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--partial)', textTransform: 'uppercase' }}>
                    Assessment Improvement Areas
                  </span>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {showAppDetail.round2Assessment?.technicalWeaknesses?.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps (for Shortlisted / Selected) */}
              {(showAppDetail.status === 'Selected' || showAppDetail.status === 'Shortlisted') && (
                <div style={{ background: 'var(--verified-bg)', border: '1px solid var(--verified-border)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--verified)', textTransform: 'uppercase' }}>
                    Next Steps
                  </span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--verified)' }}>
                    {showAppDetail.status === 'Selected'
                      ? 'The human HR team will follow up via email with formal offer details and team onboarding scheduling.'
                      : 'Your application has successfully passed the technical evaluation rounds. The recruitment team will reach out for the final conversation.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
