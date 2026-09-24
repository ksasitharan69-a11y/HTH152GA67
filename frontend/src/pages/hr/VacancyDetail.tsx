import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import { Toast, EmptyState, StatusBadge } from '../../components/SharedComponents';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export default function VacancyDetail() {
  const { vacancyId } = useParams<{ vacancyId: string }>();
  const navigate = useNavigate();
  const { auth, vacancies, getApplicationsByVacancy, updateVacancyStatus } = useApp();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, auth.user, navigate]);

  if (!auth.isAuthenticated || !auth.user) {
    return null;
  }

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

      <div className="page-content page-content-wide">
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate('/hr/dashboard')}>
          <ArrowLeft size={14} /> Back to HR Dashboard
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


        {/* Applicant Evaluation Table */}
        <div className="section-header">
          <div>
            <h2 className="section-title">Submitted Candidates ({applications.length})</h2>
            <p className="section-subtitle">Candidate evaluations across Round 1 (Resume Match) and Round 2 (Technical Assessment)</p>
          </div>
        </div>

        {applications.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Round 1 (Resume Match)</th>
                  <th>Round 2 (Tech Assessment)</th>
                  <th>Overall Fit</th>
                  <th>Current State</th>
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
                      {app.round1Match ? (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: app.round1Match.overallScore >= 70 ? 'var(--verified)' : (app.round1Match.overallScore >= 40 ? 'var(--partial)' : 'var(--gap)')
                        }}>
                          {app.round1Match.overallScore}%
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Pending</span>
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
                          {app.round2Assessment.overallScore}%
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
                    <td>
                      <span className="text-secondary text-sm">
                        {new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                        Review Candidate <ChevronRight size={13} />
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
              text="Candidates who submit resumes for this position will appear here with evidence and assessment analysis."
            />
          </div>
        )}
      </div>
    </div>
  );
}
