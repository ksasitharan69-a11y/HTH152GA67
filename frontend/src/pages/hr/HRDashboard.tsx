import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, EmptyState, TagInput, StatusBadge } from '../../components/SharedComponents';
import type { HR } from '../../types';
import { Plus, ChevronRight, ArrowRight } from 'lucide-react';

export default function HRDashboard() {
  const navigate = useNavigate();
  const {
    auth, createVacancy, getVacanciesByHR,
    getApplicationsByVacancy, applications
  } = useApp();

  const hr = auth.user as HR;
  if (!hr) {
    navigate('/hr/login');
    return null;
  }

  const myVacancies = getVacanciesByHR(hr.id);
  const activeVacancies = myVacancies.filter(v => v.status === 'active');
  const closedVacancies = myVacancies.filter(v => v.status === 'closed');

  // Applications needing review / attention across HR's vacancies
  const myVacancyIds = new Set(myVacancies.map(v => v.id));
  const myApplications = applications.filter(a => myVacancyIds.has(a.vacancyId));
  const pendingAttentionApps = myApplications.filter(
    a => a.status === 'Under Review' || a.status === 'Verification Required' || a.status === 'Applied'
  );

  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Vacancy form
  const [vForm, setVForm] = useState({
    title: '',
    jobDescription: '',
    requiredSkills: [] as string[],
    preferredSkills: [] as string[],
    requiredExperience: '',
    education: '',
    otherRequirements: '',
  });
  const [vError, setVError] = useState('');

  const handleCreateVacancy = (e: React.FormEvent) => {
    e.preventDefault();
    setVError('');
    if (!vForm.title || !vForm.jobDescription || vForm.requiredSkills.length === 0) {
      setVError('Title, description, and at least one required skill are mandatory.');
      return;
    }
    createVacancy({
      ...vForm,
      department: hr.department,
      companyId: hr.companyId,
      companyName: hr.companyName,
      hrId: hr.id,
    });
    setToast({ message: 'Vacancy created and published to candidate portal', type: 'success' });
    setShowCreate(false);
    setVForm({
      title: '', jobDescription: '', requiredSkills: [], preferredSkills: [],
      requiredExperience: '', education: '', otherRequirements: '',
    });
  };

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content">
        {/* Editorial Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Recruitment Workspace
            </span>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
              HR Dashboard
            </h1>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {hr.department} Department · <strong>{hr.companyName}</strong> · Reviewer: {hr.name}
            </p>
          </div>

          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create Vacancy
          </button>
        </div>

        {/* Section 1: Active Vacancies List */}
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 className="section-title">Vacancies</h2>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                className={`btn btn-sm ${activeTab === 'active' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('active')}
                style={{ fontSize: '0.75rem', fontWeight: activeTab === 'active' ? 600 : 400 }}
              >
                Active ({activeVacancies.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'closed' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('closed')}
                style={{ fontSize: '0.75rem', fontWeight: activeTab === 'closed' ? 600 : 400 }}
              >
                Archived ({closedVacancies.length})
              </button>
            </div>
          </div>
        </div>

        {(activeTab === 'active' ? activeVacancies : closedVacancies).length > 0 ? (
          <div className="table-container mb-5">
            <table className="table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Department & Exp</th>
                  <th>Core Requirements</th>
                  <th>Applicants</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Review</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'active' ? activeVacancies : closedVacancies).map(v => {
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
                        <span className={`badge ${v.status === 'active' ? 'badge-verified' : 'badge-unverified'}`}>
                          <span className="badge-dot" />
                          {v.status === 'active' ? 'Published' : 'Archived'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                          View Candidates <ChevronRight size={13} />
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
              title={activeTab === 'active' ? 'No Active Vacancies' : 'No Archived Vacancies'}
              text={activeTab === 'active' ? 'Publish a vacancy to define criteria and begin accepting candidate applications.' : 'Closed vacancies will be stored here.'}
              action={activeTab === 'active' ? (
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                  <Plus size={13} /> Create Vacancy
                </button>
              ) : undefined}
            />
          </div>
        )}

        {/* Section 2: Applications Needing Attention (Asymmetric, purposeful layout) */}
        <div className="section-header">
          <div>
            <h2 className="section-title">Applications Needing Attention</h2>
            <p className="section-subtitle">Candidates awaiting evidence review, assessment, or verification</p>
          </div>
          <span className="text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
            {pendingAttentionApps.length} in queue
          </span>
        </div>

        {pendingAttentionApps.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Applied Role</th>
                  <th>Match Confidence</th>
                  <th>Current State</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingAttentionApps.map(app => (
                  <tr
                    key={app.id}
                    onClick={() => navigate(`/hr/application/${app.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-secondary)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)'
                        }}>
                          {(app.candidateName || app.candidateEmail)[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {app.candidateName || app.candidateEmail}
                          </div>
                          <div className="text-muted text-xs">{app.candidateEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{app.role}</span>
                    </td>
                    <td>
                      {app.aiAnalysis ? (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: app.aiAnalysis.overallScore >= 70 ? 'var(--verified)' : (app.aiAnalysis.overallScore >= 40 ? 'var(--partial)' : 'var(--gap)')
                        }}>
                          {app.aiAnalysis.overallScore}% fit
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Evaluation pending</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                        Inspect Evidence <ArrowRight size={13} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <span className="text-secondary text-sm">
              All candidate applications are currently processed. No outstanding verifications in queue.
            </span>
          </div>
        )}
      </div>

      {/* Create Vacancy Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Vacancy" wide>
        <form onSubmit={handleCreateVacancy}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-v-title">Position Title <span className="required">*</span></label>
            <input
              id="new-v-title"
              type="text"
              className="form-input"
              placeholder="e.g. Senior Backend Engineer"
              value={vForm.title}
              onChange={e => setVForm({ ...vForm, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-v-desc">Role Responsibilities & Scope <span className="required">*</span></label>
            <textarea
              id="new-v-desc"
              className="form-textarea"
              rows={4}
              placeholder="Specify the operational scope, responsibilities, and expected outcomes..."
              value={vForm.jobDescription}
              onChange={e => setVForm({ ...vForm, jobDescription: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mandatory Skills (Evaluated Against Evidence) <span className="required">*</span></label>
            <TagInput
              tags={vForm.requiredSkills}
              onChange={tags => setVForm({ ...vForm, requiredSkills: tags })}
              placeholder="Type skill and press Enter"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Preferred Skills</label>
            <TagInput
              tags={vForm.preferredSkills}
              onChange={tags => setVForm({ ...vForm, preferredSkills: tags })}
              placeholder="Type preferred skill and press Enter"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-v-exp">Experience</label>
              <input
                id="new-v-exp"
                type="text"
                className="form-input"
                placeholder="e.g. 3+ years in distributed systems"
                value={vForm.requiredExperience}
                onChange={e => setVForm({ ...vForm, requiredExperience: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-v-edu">Education</label>
              <input
                id="new-v-edu"
                type="text"
                className="form-input"
                placeholder="e.g. B.S. in Computer Science or equivalent"
                value={vForm.education}
                onChange={e => setVForm({ ...vForm, education: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-v-other">Additional Criteria</label>
            <textarea
              id="new-v-other"
              className="form-textarea"
              rows={2}
              placeholder="Any other specific constraints or domain criteria..."
              value={vForm.otherRequirements}
              onChange={e => setVForm({ ...vForm, otherRequirements: e.target.value })}
            />
          </div>

          {vError && <p className="form-error mb-2">{vError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Publish Vacancy
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
