import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Pages
import HomePage from './pages/HomePage';
import CEOLogin from './pages/ceo/CEOLogin';
import CEORegister from './pages/ceo/CEORegister';
import CEODashboard from './pages/ceo/CEODashboard';
import HRLogin from './pages/hr/HRLogin';
import HRDashboard from './pages/hr/HRDashboard';
import VacancyDetail from './pages/hr/VacancyDetail';
import ApplicationReview from './pages/hr/ApplicationReview';
import CandidateLogin from './pages/candidate/CandidateLogin';
import CandidateRegister from './pages/candidate/CandidateRegister';
import CandidateDashboard from './pages/candidate/CandidateDashboard';

function AppRoutes() {
  return (
    <Routes>
      {/* Home */}
      <Route path="/" element={<HomePage />} />

      {/* CEO Routes */}
      <Route path="/ceo/login" element={<CEOLogin />} />
      <Route path="/ceo/register" element={<CEORegister />} />
      <Route path="/ceo/dashboard" element={<CEODashboard />} />

      {/* HR Routes */}
      <Route path="/hr/login" element={<HRLogin />} />
      <Route path="/hr/dashboard" element={<HRDashboard />} />
      <Route path="/hr/vacancy/:vacancyId" element={<VacancyDetail />} />
      <Route path="/hr/application/:applicationId" element={<ApplicationReview />} />

      {/* Candidate Routes */}
      <Route path="/candidate/login" element={<CandidateLogin />} />
      <Route path="/candidate/register" element={<CandidateRegister />} />
      <Route path="/candidate/dashboard" element={<CandidateDashboard />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}
