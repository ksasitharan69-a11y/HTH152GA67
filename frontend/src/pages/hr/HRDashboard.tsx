import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, EmptyState, TagInput } from '../../components/SharedComponents';
import type { HR, Vacancy } from '../../types';
import { Plus, ChevronRight } from 'lucide-react';

export default function HRDashboard() {
  const navigate = useNavigate();
  const {
    auth, createVacancy, getVacanciesByHR,
    getApplicationsByVacancy
  } = useApp();

  const hr = auth.user as HR;
  if (!hr) {
    navigate('/hr/login');
    return null;
  }

  const myVacancies = getVacanciesByHR(hr.id);
  const activeVacancies = myVacancies.filter(v => v.status === 'active');
  const closedVacancies = myVacancies.filter(v => v.status === 'closed');
  const totalApplicants = myVacancies.reduce((sum, v) => sum + v.applicantCount, 0);

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
      setVError('Title, job description, and at least one required skill are mandatory.');
      return;
    }
    createVacancy({
      ...vForm,
      department: hr.department,
      companyId: hr.companyId,
      companyName: hr.companyName,
      hrId: hr.id,
    });
    setToast({ message: 'Vacancy created and published', type: 'success' });
    setShowCreate(false);
    setVForm({
      title: '', jobDescription: '', requiredSkills: [], preferredSkills: [],
      requiredExperience: '', education: '', otherRequirements: '',
    });
  };

  const renderVacancyList = (vacs: Vacancy[]) => {
    if (vacs.length === 0) {
      return (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <EmptyState
            icon={<Plus size={24} style={{ color: 'var(--text-muted)' }} />}
            title={activeTab === 'active' ? 'No Active Vacancies' : 'No Closed Vacancies'}
            text={activeTab === 'active' ? 'Post a vacancy with defined requirements to begin receiving candidate applications.' : 'Archived vacancies will appear here.'}
            action={activeTab === 'active' ? (
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Post Vacancy
              </button>
            ) : undefined}
          />
        </div>
      );
    }

    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Role Title & Department</th>
              <th>Experience & Education</th>
              <th>Key Required Skills</th>
              <th>Applicants</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {vacs.map(v => {
              const apps = getApplicationsByVacancy(v.id);
              return (
                <tr
                  key={v.id}
                  onClick={() => navigate(`/hr/vacancy/${v.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{v.title}</span>
                      <span className="text-secondary text-xs">{v.department}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-secondary text-sm">
                      {v.requiredExperience || 'Any exp'} • {v.education || 'Any degree'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {v.requiredSkills.slice(0, 3).map(s => (
                        <span key={s} className="tag" style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}>{s}</span>
                      ))}
                      {v.requiredSkills.length > 3 && (
                        <span className="text-muted text-xs" style={{ alignSelf: 'center' }}>+{v.requiredSkills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{apps.length}</span>
                    <span className="text-muted text-xs"> reviewed</span>
                  </td>
                  <td>
                    <span className={`badge ${v.status === 'active' ? 'badge-verified' : 'badge-unverified'}`}>
                      <span className="badge-dot" />
                      {v.status === 'active' ? 'Active' : 'Closed'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                      Review Candidates <ChevronRight size={14} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content">
        {/* Header */}
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Recruitment Workspace</h1>
            <p className="text-secondary">
              Reviewer: <strong>{hr.name}</strong> • {hr.companyName} ({hr.department} Department)
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Post New Vacancy
          </button>
        </div>

        {/* Compact summary metrics bar */}
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
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Active Vacancies</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{activeVacancies.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Total Applicants</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{totalApplicants}</div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Closed / Archived</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{closedVacancies.length}</div>
          </div>
        </div>

        {/* Vacancies Section */}
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button
              className={`tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active Postings ({activeVacancies.length})
            </button>
            <button
              className={`tab ${activeTab === 'closed' ? 'active' : ''}`}
              onClick={() => setActiveTab('closed')}
            >
              Archived ({closedVacancies.length})
            </button>
          </div>
        </div>

        {renderVacancyList(activeTab === 'active' ? activeVacancies : closedVacancies)}
      </div>

      {/* Create Vacancy Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Job Vacancy" wide>
        <form onSubmit={handleCreateVacancy}>
          <div className="form-group">
            <label className="form-label" htmlFor="v-title">Job Title <span className="required">*</span></label>
            <input
              id="v-title"
              type="text"
              className="form-input"
              placeholder="e.g. Senior Backend Engineer"
              value={vForm.title}
              onChange={e => setVForm({ ...vForm, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="v-desc">Job Description & Responsibilities <span className="required">*</span></label>
            <textarea
              id="v-desc"
              className="form-textarea"
              rows={4}
              placeholder="Specify the operational scope, responsibilities, and expected outcomes..."
              value={vForm.jobDescription}
              onChange={e => setVForm({ ...vForm, jobDescription: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Required Skills (Evaluated Against Evidence) <span className="required">*</span></label>
            <TagInput
              tags={vForm.requiredSkills}
              onChange={tags => setVForm({ ...vForm, requiredSkills: tags })}
              placeholder="Type required skill and press Enter"
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

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="v-exp">Experience Requirements</label>
              <input
                id="v-exp"
                type="text"
                className="form-input"
                placeholder="e.g. 3+ years in distributed systems"
                value={vForm.requiredExperience}
                onChange={e => setVForm({ ...vForm, requiredExperience: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-edu">Education</label>
              <input
                id="v-edu"
                type="text"
                className="form-input"
                placeholder="e.g. B.S. in Computer Science or equivalent"
                value={vForm.education}
                onChange={e => setVForm({ ...vForm, education: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="v-other">Additional Criteria</label>
            <textarea
              id="v-other"
              className="form-textarea"
              rows={2}
              placeholder="Any other specific constraints or domain knowledge requirements..."
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
