import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, EmptyState } from '../../components/SharedComponents';
import type { CEO } from '../../types';
import { Plus, Trash2, Edit3, Globe, MapPin, X } from 'lucide-react';

export default function CEODashboard() {
  const navigate = useNavigate();
  const {
    auth, getCompany, updateCompany, addDepartment, removeDepartment,
    createHR, getHRsByCompany, deleteHR
  } = useApp();

  const ceo = auth.user as CEO;
  if (!ceo) {
    navigate('/ceo/login');
    return null;
  }

  const company = getCompany(ceo.companyId);
  const companyHRs = getHRsByCompany(ceo.companyId);

  const [showCreateHR, setShowCreateHR] = useState(false);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Create HR form
  const [hrForm, setHrForm] = useState({ name: '', email: '', password: '', department: '' });
  const [hrError, setHrError] = useState('');

  // Department form
  const [newDept, setNewDept] = useState('');

  // Company edit form
  const [companyForm, setCompanyForm] = useState({
    description: company?.description || '',
    industry: company?.industry || '',
    location: company?.location || '',
    website: company?.website || '',
  });

  const handleCreateHR = (e: React.FormEvent) => {
    e.preventDefault();
    setHrError('');
    if (!hrForm.name || !hrForm.email || !hrForm.password || !hrForm.department) {
      setHrError('All fields are required');
      return;
    }
    createHR({
      name: hrForm.name,
      email: hrForm.email,
      password: hrForm.password,
      department: hrForm.department,
      companyId: ceo.companyId,
      companyName: company?.name || '',
    });
    setToast({ message: 'HR account created successfully', type: 'success' });
    setShowCreateHR(false);
    setHrForm({ name: '', email: '', password: '', department: '' });
  };

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.trim()) return;
    addDepartment(ceo.companyId, newDept.trim());
    setToast({ message: `Department "${newDept.trim()}" added`, type: 'success' });
    setNewDept('');
    setShowAddDept(false);
  };

  const handleUpdateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany(ceo.companyId, companyForm);
    setToast({ message: 'Organization profile updated', type: 'success' });
    setShowEditCompany(false);
  };

  const handleDeleteHR = (hrId: string, hrName: string) => {
    if (confirm(`Remove HR account for ${hrName}?`)) {
      deleteHR(hrId);
      setToast({ message: `HR account for ${hrName} removed`, type: 'info' });
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content">
        {/* Header */}
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Organization Overview</h1>
            <p className="text-secondary">
              Managing <strong>{company?.name}</strong> • Workspace Administrator: <strong>{ceo.name}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEditCompany(true)}>
              <Edit3 size={14} /> Edit Company
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateHR(true)}>
              <Plus size={14} /> Provision HR Account
            </button>
          </div>
        </div>

        {/* Inline Data Summary Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem'
        }}>
          <div>
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Organization</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{company?.name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Departments</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{company?.departments.length || 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Active HR Reviewers</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{companyHRs.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Location</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{company?.location || 'Unspecified'}</div>
          </div>
        </div>

        {/* HR Accounts Section */}
        <div className="section-header">
          <div>
            <h2 className="section-title">HR Reviewers</h2>
            <p className="section-subtitle">Recruitment operators with access to post vacancies and verify candidates</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateHR(true)}>
            <Plus size={14} /> Add Reviewer
          </button>
        </div>

        {companyHRs.length > 0 ? (
          <div className="table-container mb-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Reviewer Name</th>
                  <th>Email Address</th>
                  <th>Department</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companyHRs.map(hr => (
                  <tr key={hr.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)'
                        }}>
                          {hr.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{hr.name}</span>
                      </div>
                    </td>
                    <td className="text-secondary">{hr.email}</td>
                    <td>
                      <span className="badge badge-unverified">{hr.department}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteHR(hr.id, hr.name)}>
                        <Trash2 size={13} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card mb-4" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <EmptyState
              icon={<Plus size={24} style={{ color: 'var(--text-muted)' }} />}
              title="No HR Reviewers Provisioned"
              text="Create an HR account to delegate job postings and candidate evaluation."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateHR(true)}>
                  <Plus size={14} /> Provision First HR
                </button>
              }
            />
          </div>
        )}

        {/* Departments Section */}
        <div className="section-header">
          <div>
            <h2 className="section-title">Organization Departments</h2>
            <p className="section-subtitle">Functional divisions available when creating vacancies</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddDept(true)}>
            <Plus size={14} /> Add Department
          </button>
        </div>

        <div className="card mb-4" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {company?.departments.map(dept => (
              <span key={dept} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.35rem 0.75rem', background: 'var(--surface-elevated)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)'
              }}>
                {dept}
                {dept !== 'General' && (
                  <button
                    className="btn btn-ghost"
                    style={{ padding: 0, minWidth: 'auto', color: 'var(--text-muted)' }}
                    onClick={() => {
                      removeDepartment(ceo.companyId, dept);
                      setToast({ message: `Department "${dept}" removed`, type: 'info' });
                    }}
                    title="Remove Department"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
            {(!company?.departments || company.departments.length === 0) && (
              <span className="text-muted text-sm">No departments configured yet.</span>
            )}
          </div>
        </div>

        {/* Company Profile Details */}
        {(company?.description || company?.industry || company?.location || company?.website) && (
          <>
            <div className="section-header">
              <h2 className="section-title">Organization Profile</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEditCompany(true)}>
                <Edit3 size={13} /> Edit
              </button>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: company.description ? '1rem' : 0 }}>
                {company.industry && (
                  <div>
                    <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Industry</span>
                    <span style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{company.industry}</span>
                  </div>
                )}
                {company.location && (
                  <div>
                    <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Location</span>
                    <span style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <MapPin size={13} style={{ color: 'var(--text-muted)' }} /> {company.location}
                    </span>
                  </div>
                )}
                {company.website && (
                  <div>
                    <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Website</span>
                    <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Globe size={13} /> {company.website}
                    </a>
                  </div>
                )}
              </div>
              {company.description && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>About Organization</span>
                  <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{company.description}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create HR Modal */}
      <Modal isOpen={showCreateHR} onClose={() => setShowCreateHR(false)} title="Provision HR Account">
        <form onSubmit={handleCreateHR}>
          <div className="form-group">
            <label className="form-label" htmlFor="hr-name">Reviewer Full Name <span className="required">*</span></label>
            <input
              id="hr-name"
              type="text"
              className="form-input"
              placeholder="e.g. Rachel Miller"
              value={hrForm.name}
              onChange={e => setHrForm({ ...hrForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="hr-email">Work Email <span className="required">*</span></label>
            <input
              id="hr-email"
              type="email"
              className="form-input"
              placeholder="rachel@company.com"
              value={hrForm.email}
              onChange={e => setHrForm({ ...hrForm, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="hr-pwd">Initial Password <span className="required">*</span></label>
            <input
              id="hr-pwd"
              type="password"
              className="form-input"
              placeholder="Enter strong password"
              value={hrForm.password}
              onChange={e => setHrForm({ ...hrForm, password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="hr-dept">Assigned Department <span className="required">*</span></label>
            <select
              id="hr-dept"
              className="form-select"
              value={hrForm.department}
              onChange={e => setHrForm({ ...hrForm, department: e.target.value })}
            >
              <option value="">Select Department</option>
              {company?.departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          {hrError && <p className="form-error mb-2">{hrError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateHR(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Provision Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Department Modal */}
      <Modal isOpen={showAddDept} onClose={() => setShowAddDept(false)} title="Add Department">
        <form onSubmit={handleAddDept}>
          <div className="form-group">
            <label className="form-label" htmlFor="dept-name">Department Name</label>
            <input
              id="dept-name"
              type="text"
              className="form-input"
              placeholder="e.g. Infrastructure, Legal, Sales"
              value={newDept}
              onChange={e => setNewDept(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddDept(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Department
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Company Modal */}
      <Modal isOpen={showEditCompany} onClose={() => setShowEditCompany(false)} title="Edit Organization Profile">
        <form onSubmit={handleUpdateCompany}>
          <div className="form-group">
            <label className="form-label" htmlFor="co-industry">Industry Sector</label>
            <input
              id="co-industry"
              type="text"
              className="form-input"
              placeholder="e.g. Financial Technology, Cloud Services"
              value={companyForm.industry}
              onChange={e => setCompanyForm({ ...companyForm, industry: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="co-loc">Primary Location</label>
            <input
              id="co-loc"
              type="text"
              className="form-input"
              placeholder="e.g. New York, NY"
              value={companyForm.location}
              onChange={e => setCompanyForm({ ...companyForm, location: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="co-web">Company Website</label>
            <input
              id="co-web"
              type="text"
              className="form-input"
              placeholder="https://company.com"
              value={companyForm.website}
              onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="co-desc">Organization Overview</label>
            <textarea
              id="co-desc"
              className="form-textarea"
              rows={3}
              placeholder="Brief description of the organization and operations"
              value={companyForm.description}
              onChange={e => setCompanyForm({ ...companyForm, description: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditCompany(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
