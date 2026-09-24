import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, EmptyState, StatusBadge } from '../../components/SharedComponents';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export default function VacancyDetail() {
  const { vacancyId } = useParams<{ vacancyId: string }>();
  const navigate = useNavigate();
  const { vacancies, getApplicationsByVacancy, updateVacancyStatus } = useApp();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const vacancy = vacancies.find(v => v.id === vacancyId);
  const applications = vacancyId ? getApplicationsByVacancy(vacancyId) : [];

  if (!vacancy) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <EmptyState
            icon={<span style={{ fontSize: '1.5rem', fontWeight: 600 }}>?</span>}
            title="Vacancy Not Found"
            text="The requested job vacancy does not exist or may have been deleted."
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

  return (
    <div className="page-container">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-content">
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/hr/dashboard')}>
          <ArrowLeft size={15} /> Back to Vacancies
        </button>

        {/* Vacancy Specification Card */}
        <div className="card mb-4" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                {vacancy.title}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <span>Department: <strong>{vacancy.department}</strong></span>
                <span>•</span>
                <span>Experience: <strong>{vacancy.requiredExperience || 'Flexible'}</strong></span>
                <span>•</span>
                <span>Education: <strong>{vacancy.education || 'Flexible'}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`badge ${vacancy.status === 'active' ? 'badge-verified' : 'badge-unverified'}`}>
                <span className="badge-dot" />
                {vacancy.status === 'active' ? 'Active' : 'Closed'}
              </span>

              {vacancy.status === 'active' ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    updateVacancyStatus(vacancy.id, 'closed');
                    setToast({ message: 'Vacancy marked as closed', type: 'info' });
                  }}
                >
                  Close Posting
                </button>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    updateVacancyStatus(vacancy.id, 'active');
                    setToast({ message: 'Vacancy reopened', type: 'success' });
                  }}
                >
                  Reopen Posting
                </button>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
              Position Description
            </span>
            <p className="text-secondary" style={{ fontSize: '0.9375rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {vacancy.jobDescription}
            </p>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
              Required Competencies
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {vacancy.requiredSkills.map(s => (
                <span key={s} className="tag" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {vacancy.preferredSkills.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
                Preferred / Nice-to-Have Skills
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {vacancy.preferredSkills.map(s => (
                  <span key={s} className="tag" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {vacancy.otherRequirements && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                Other Evaluation Criteria
              </span>
              <p className="text-secondary text-sm">{vacancy.otherRequirements}</p>
            </div>
          )}
        </div>

        {/* Applicants Review Table */}
        <div className="section-header">
          <div>
            <h2 className="section-title">Submitted Candidates ({applications.length})</h2>
            <p className="section-subtitle">Candidates evaluated against defined criteria with traceable evidence</p>
          </div>
        </div>

        {applications.length > 0 ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Current State</th>
                  <th>Match Confidence</th>
                  <th>Applied On</th>
                  <th style={{ textAlign: 'right' }}>Evidence Review</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr
                    key={app.id}
                    onClick={() => navigate(`/hr/application/${app.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)'
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
                      <StatusBadge status={app.status} />
                    </td>
                    <td>
                      {app.aiAnalysis ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: app.aiAnalysis.overallScore >= 70 ? 'var(--verified)' : (app.aiAnalysis.overallScore >= 40 ? 'var(--partial)' : 'var(--gap)')
                          }}>
                            {app.aiAnalysis.overallScore}%
                          </span>
                          <span className="text-xs text-muted">score</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Analysis pending</span>
                      )}
                    </td>
                    <td>
                      <span className="text-secondary text-sm">
                        {new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                        Inspect Evidence <ChevronRight size={14} />
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
              icon={<span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>0</span>}
              title="No Candidates Applied Yet"
              text="Applications will be listed here with verifiable evidence once candidates apply."
            />
          </div>
        )}
      </div>
    </div>
  );
}
