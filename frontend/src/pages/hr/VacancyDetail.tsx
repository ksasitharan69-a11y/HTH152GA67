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
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        {/* Editorial Role Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Vacancy Specification
            </span>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
              {vacancy.title}
            </h1>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {vacancy.department} Department · {vacancy.companyName} · {vacancy.requiredExperience || 'Flexible experience'} · {vacancy.education || 'Flexible education'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className={`badge ${vacancy.status === 'active' ? 'badge-verified' : 'badge-unverified'}`}>
              <span className="badge-dot" />
              {vacancy.status === 'active' ? 'Published' : 'Archived'}
            </span>

            {vacancy.status === 'active' ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  updateVacancyStatus(vacancy.id, 'closed');
                  setToast({ message: 'Vacancy marked as archived', type: 'info' });
                }}
              >
                Archive Position
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  updateVacancyStatus(vacancy.id, 'active');
                  setToast({ message: 'Vacancy republished', type: 'success' });
                }}
              >
                Publish Position
              </button>
            )}
          </div>
        </div>

        {/* Specification Card */}
        <div className="card mb-5">
          <div style={{ marginBottom: '1.25rem' }}>
            <span className="section-title" style={{ display: 'block', marginBottom: '0.4rem' }}>
              Role Scope & Responsibilities
            </span>
            <p className="text-secondary" style={{ fontSize: '0.9375rem', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
              {vacancy.jobDescription}
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <span className="section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Mandatory Requirements (Matched Against Resumes)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {vacancy.requiredSkills.map(s => (
                <span key={s} className="tag" style={{ fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>

          {vacancy.preferredSkills.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <span className="section-title" style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                Preferred / Nice-to-Have Skills
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {vacancy.preferredSkills.map(s => (
                  <span key={s} className="tag" style={{ color: 'var(--text-secondary)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {vacancy.otherRequirements && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', marginTop: '1rem' }}>
              <span className="section-title" style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                Additional Evaluation Notes
              </span>
              <p className="text-secondary text-sm">{vacancy.otherRequirements}</p>
            </div>
          )}
        </div>

        {/* Applicant Evaluation Table */}
        <div className="section-header">
          <div>
            <h2 className="section-title">Submitted Candidates ({applications.length})</h2>
            <p className="section-subtitle">Applicants evaluated against specified criteria with cited evidence</p>
          </div>
        </div>

        {applications.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Evaluation State</th>
                  <th>Match Confidence</th>
                  <th>Application Date</th>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 'var(--radius-sm)',
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
                      <StatusBadge status={app.status} />
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
                      <span className="text-secondary text-sm">
                        {new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                        Inspect Evidence <ChevronRight size={13} />
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
              text="Candidates who submit resumes for this position will appear here with evidence analysis."
            />
          </div>
        )}
      </div>
    </div>
  );
}
