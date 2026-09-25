import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, Modal, EmptyState } from '../../components/SharedComponents';
import type { CEO } from '../../types';
import { Plus, Trash2, Edit3, Globe, MapPin, X, Building2, Users, Layers } from 'lucide-react';

export default function CEODashboard() {
  const navigate = useNavigate();
  const {
    auth, getCompany, updateCompany, addDepartment, removeDepartment,
    createHR, getHRsByCompany, deleteHR
  } = useApp();

  const ceo = auth.user as CEO;

  useEffect(() => {
    if (!auth.isAuthenticated || !ceo) {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, ceo, navigate]);

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
    description: '',
    industry: '',
    location: '',
    website: '',
  });

  const company = ceo ? getCompany(ceo.companyId) : undefined;
  const companyHRs = ceo ? getHRsByCompany(ceo.companyId) : [];

  useEffect(() => {
    if (company) {
      setCompanyForm({
        description: company.description || '',
        industry: company.industry || '',
        location: company.location || '',
        website: company.website || '',
      });
    }
  }, [company?.description, company?.industry, company?.location, company?.website]);

  if (!auth.isAuthenticated || !ceo) {
    return null;
  }

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
    setToast({ message: 'HR account provisioned successfully', type: 'success' });
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
    if (confirm(`Remove HR reviewer credentials for ${hrName}?`)) {
      deleteHR(hrId);
      setToast({ message: `HR reviewer credentials removed for ${hrName}`, type: 'info' });
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content">
        {/* Editorial Executive Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Company Administration
            </span>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
              {company?.name || 'Company Overview'}
            </h1>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Administrator: <strong>{ceo.name}</strong> · {company?.location || 'Headquarters'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEditCompany(true)}>
              <Edit3 size={13} /> Edit Profile
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateHR(true)}>
              <Plus size={13} /> Provision HR Reviewer
            </button>
          </div>
        </div>

        {/* Editorial Metric Strip */}
        <div className="metric-strip">
          <div className="metric-item">
            <div className="metric-label">Organization</div>
            <div className="metric-value">{company?.name || '—'}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Departments</div>
            <div className="metric-value">{company?.departments.length || 0}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Provisioned Reviewers</div>
            <div className="metric-value">{companyHRs.length}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Industry</div>
            <div className="metric-value" style={{ fontSize: '1.125rem' }}>{company?.industry || 'Technology'}</div>
          </div>
        </div>

        {/* HR Reviewers Section */}
        <div className="section-header">
          <div>
            <h2 className="section-title">HR Reviewers</h2>
            <p className="section-subtitle">Operators authorized to evaluate candidates against evidence</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateHR(true)}>
            <Plus size={13} /> New Account
          </button>
        </div>

        {companyHRs.length > 0 ? (
          <div className="table-container mb-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Reviewer Name</th>
                  <th>Contact Email</th>
                  <th>Assigned Department</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companyHRs.map(hr => (
                  <tr key={hr.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-secondary)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)'
                        }}>
                          {hr.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{hr.name}</span>
                      </div>
                    </td>
                    <td className="text-secondary">{hr.email}</td>
                    <td>
                      <span className="tag" style={{ fontSize: '0.75rem' }}>{hr.department}</span>
                    </td>
                    <td>
                      <span className="badge badge-verified">
                        <span className="badge-dot" />
                        Active
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteHR(hr.id, hr.name)}>
                        <Trash2 size={13} /> Revoke
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
              icon={<Users size={24} />}
              title="No HR Reviewers Provisioned"
              text="Add your first HR reviewer to assign department recruiting responsibilities."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateHR(true)}>
                  <Plus size={13} /> Provision HR Reviewer
                </button>
              }
            />
          </div>
        )}

        {/* Departments Section */}
        <div className="section-header">
          <div>
            <h2 className="section-title">Functional Departments</h2>
            <p className="section-subtitle">Recruiting divisions available for vacancy assignment</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddDept(true)}>
            <Plus size={13} /> Add Department
          </button>
        </div>

        <div className="card mb-4" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {company?.departments.map(dept => (
              <span key={dept} className="tag" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8125rem' }}>
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
          </div>
        </div>

        {/* Organization Overview Metadata */}
        {(company?.description || company?.industry || company?.location || company?.website) && (
          <div className="card">
            <span className="section-title" style={{ display: 'block', marginBottom: '0.85rem' }}>
              Corporate Record
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              {company.industry && (
                <div>
                  <span className="metric-label" style={{ display: 'block' }}>Sector</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{company.industry}</span>
                </div>
              )}
              {company.location && (
                <div>
                  <span className="metric-label" style={{ display: 'block' }}>Primary Hub</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={13} style={{ color: 'var(--text-muted)' }} /> {company.location}
                  </span>
                </div>
              )}
              {company.website && (
                <div>
                  <span className="metric-label" style={{ display: 'block' }}>Corporate URL</span>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Globe size={13} /> {company.website}
                  </a>
                </div>
              )}
            </div>
            {company.description && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}>
                <p className="text-secondary text-sm" style={{ lineHeight: 1.6 }}>{company.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Provision HR Modal */}
      <Modal isOpen={showCreateHR} onClose={() => setShowCreateHR(false)} title="Provision HR Reviewer">
        <form onSubmit={handleCreateHR}>
          <div className="form-group">
            <label className="form-label" htmlFor="hr-prov-name">Full Name <span className="required">*</span></label>
            <input
              id="hr-prov-name"
              type="text"
              className="form-input"
              placeholder="e.g. Rachel Miller"
              value={hrForm.name}
              onChange={e => setHrForm({ ...hrForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="hr-prov-email">Work Email <span className="required">*</span></label>
            <input
              id="hr-prov-email"
              type="email"
              className="form-input"
              placeholder="rachel@company.com"
              value={hrForm.email}
              onChange={e => setHrForm({ ...hrForm, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="hr-prov-pwd">Password <span className="required">*</span></label>
            <input
              id="hr-prov-pwd"
              type="password"
              className="form-input"
              placeholder="Enter secure initial password"
              value={hrForm.password}
              onChange={e => setHrForm({ ...hrForm, password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="hr-prov-dept">Assigned Department <span className="required">*</span></label>
            <select
              id="hr-prov-dept"
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
              Provision Reviewer
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Department Modal */}
      <Modal isOpen={showAddDept} onClose={() => setShowAddDept(false)} title="Add Department">
        <form onSubmit={handleAddDept}>
          <div className="form-group">
            <label className="form-label" htmlFor="dept-input">Department Name</label>
            <input
              id="dept-input"
              type="text"
              className="form-input"
              placeholder="e.g. Platform Engineering, Design"
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
            <label className="form-label" htmlFor="co-ind">Industry Sector</label>
            <input
              id="co-ind"
              type="text"
              className="form-input"
              placeholder="e.g. Cloud Security"
              value={companyForm.industry}
              onChange={e => setCompanyForm({ ...companyForm, industry: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="co-location">Primary Hub Location</label>
            <input
              id="co-location"
              type="text"
              className="form-input"
              placeholder="e.g. San Francisco, CA"
              value={companyForm.location}
              onChange={e => setCompanyForm({ ...companyForm, location: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="co-url">Website</label>
            <input
              id="co-url"
              type="text"
              className="form-input"
              placeholder="https://company.com"
              value={companyForm.website}
              onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="co-bio">Overview</label>
            <textarea
              id="co-bio"
              className="form-textarea"
              rows={3}
              placeholder="Brief organizational summary"
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
