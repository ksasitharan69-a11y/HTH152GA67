import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  CEO,
  HR,
  Candidate,
  Company,
  Vacancy,
  Application,
  Round1MatchAnalysis,
  AssessmentQuestion,
  FinalCandidateAnalysis,
  AuthState,
  UserRole,
  ThemeMode,
} from '../types';
import {
  authApi,
  ceoApi,
  hrApi,
  candidateApi,
  vacanciesApi,
  applicationsApi,
  aiApi,
  assessmentsApi,
  auditApi,
  getStoredToken,
  getStoredUser,
  removeStoredToken,
} from '../api';
import {
  mapCompany,
  mapHR,
  mapVacancy,
  mapApplication,
  mapFrontendStatusToBackend,
} from '../api/mappers';

// ==================== Storage Keys ====================
const THEME_STORAGE_KEY = 'hireproof_theme_mode';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // fallback
  }
  return 'light';
}

export interface AppContextType {
  // Auth
  auth: AuthState;
  login: (role: UserRole, email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // CEO
  ceos: CEO[];
  registerCEO: (data: { name: string; email: string; password: string; companyName: string }) => Promise<{ email: string; otp_preview?: string }>;
  verifyCEO: (email: string, otp: string) => Promise<void>;

  // Company & Departments
  companies: Company[];
  getCompany: (id: string) => Company | undefined;
  updateCompany: (id: string, data: Partial<Company>) => void;
  addDepartment: (companyId: string, department: string) => Promise<void>;
  removeDepartment: (companyId: string, department: string) => Promise<void>;

  // HR
  hrs: HR[];
  createHR: (data: { name: string; email: string; password: string; department: string; companyId: string; companyName: string }) => Promise<HR>;
  getHRsByCompany: (companyId: string) => HR[];
  deleteHR: (id: string) => Promise<void>;

  // Candidate
  candidates: Candidate[];
  registerCandidate: (data: { email: string; password: string; name?: string; githubProfile?: string; linkedinProfile?: string }) => Promise<{ email: string; otp_preview?: string }>;
  verifyCandidate: (email: string, otp: string) => Promise<void>;

  // Vacancy
  vacancies: Vacancy[];
  createVacancy: (data: {
    title: string;
    department: string;
    companyId: string;
    companyName: string;
    hrId: string;
    jobDescription: string;
    responsibilities?: string;
    technicalRequirements?: string;
    location?: string;
    workMode?: string;
    requiredSkills: string[];
    preferredSkills: string[];
    requiredExperience: string;
    education: string;
    otherRequirements: string;
  }) => Promise<Vacancy>;
  getVacanciesByCompany: (companyId: string) => Vacancy[];
  getVacanciesByHR: (hrId: string) => Vacancy[];
  updateVacancyStatus: (id: string, status: 'active' | 'closed') => Promise<void>;

  // Applications
  applications: Application[];
  submitApplication: (
    candidateId: string,
    candidateEmail: string,
    candidateName: string,
    vacancyId: string,
    resumeContent: string,
    resumeFile: string,
    fileObj?: File
  ) => Promise<Application>;
  getApplicationsByCandidate: (candidateId: string) => Application[];
  getApplicationsByVacancy: (vacancyId: string) => Application[];
  getApplication: (applicationId: string) => Application | undefined;

  // AI & Explainability
  runRound1Matching: (applicationId: string) => Promise<Round1MatchAnalysis>;
  generateAssessmentQuestions: (applicationId: string) => Promise<AssessmentQuestion[]>;
  submitAssessmentAnswers: (applicationId: string, answers: { questionId: string; answer: string }[]) => Promise<void>;
  generateFinalAnalysis: (applicationId: string) => Promise<FinalCandidateAnalysis>;

  // HR Decision & Overrides
  recordHRDecision: (
    applicationId: string,
    decision: 'Shortlisted' | 'Under HR Review' | 'Rejected' | 'Selected',
    notes: string,
    hrName: string
  ) => Promise<void>;

  // Audit Defense
  askAuditDefense: (applicationId: string, question: string) => Promise<string>;

  // System
  loading: boolean;
  refreshData: () => Promise<void>;

  // Theme
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Theme state
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#0E1012' : '#F7F6F2');
      }
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
  }, []);

  // Centralized Application State
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = getStoredToken();
    const stored = getStoredUser<any>();
    if (token && stored && stored.user) {
      const roleLower = (stored.role || stored.user.role || '').toLowerCase() as UserRole;
      return {
        isAuthenticated: true,
        role: roleLower,
        user: {
          id: String(stored.user.id),
          email: stored.user.email,
          name: stored.user.name || (roleLower === 'ceo' ? 'Administrator' : roleLower === 'hr' ? 'HR Reviewer' : 'Candidate'),
          password: '',
          companyId: String(stored.company_id || 1),
          companyName: stored.company_name || 'Organization',
          department: 'General',
          verified: stored.user.is_email_verified,
        },
      };
    }
    return { isAuthenticated: false, role: null, user: null };
  });

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [ceos, setCeos] = useState<CEO[]>([]);
  const [hrs, setHrs] = useState<HR[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // Listen for 401 unauthorized
  useEffect(() => {
    const handleUnauthorized = () => {
      setAuth({ isAuthenticated: false, role: null, user: null });
    };
    window.addEventListener('hireproof-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('hireproof-unauthorized', handleUnauthorized);
  }, []);

  // Main data loader based on active authentication role
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Always load public companies & vacancies
      try {
        const publicCompanies = await candidateApi.listCompanies();
        if (Array.isArray(publicCompanies)) {
          setCompanies(publicCompanies.map(mapCompany));
        }
      } catch {
        // Fallback if not authenticated or empty
      }

      try {
        const allVacancies = await vacanciesApi.listVacancies();
        if (Array.isArray(allVacancies)) {
          setVacancies(allVacancies.map(mapVacancy));
        }
      } catch {
        // Fallback
      }

      // 2. Role-specific authenticated data
      if (auth.isAuthenticated && auth.role === 'ceo') {
        try {
          const comp = await ceoApi.getCompany();
          if (comp) {
            setCompanies([mapCompany(comp)]);
          }
          const hrList = await ceoApi.listHR();
          if (Array.isArray(hrList)) {
            setHrs(hrList.map(mapHR));
          }
        } catch {
          // Ignore
        }
      } else if (auth.isAuthenticated && auth.role === 'hr') {
        try {
          const hrVacancies = await hrApi.listVacancies();
          if (Array.isArray(hrVacancies)) {
            setVacancies(hrVacancies.map(mapVacancy));
          }
          const appList = await applicationsApi.listApplications();
          if (Array.isArray(appList)) {
            // Enrich applications with analysis details
            const enriched = await Promise.all(
              appList.map(async (a) => {
                let analysis = null;
                let assessment = null;
                if (a.has_analysis) {
                  try {
                    analysis = await hrApi.getApplicationAnalysis(a.id);
                  } catch {
                    // Ignore
                  }
                  try {
                    assessment = await assessmentsApi.getAssessment(a.id);
                  } catch {
                    // Ignore
                  }
                }
                return mapApplication(a, analysis, assessment);
              })
            );
            setApplications(enriched);
          }
        } catch {
          // Ignore
        }
      } else if (auth.isAuthenticated && auth.role === 'candidate') {
        try {
          const myApps = await candidateApi.listMyApplications();
          if (Array.isArray(myApps)) {
            const enriched = await Promise.all(
              myApps.map(async (a) => {
                let analysis = null;
                let assessment = null;
                if (a.has_analysis) {
                  try {
                    analysis = await hrApi.getApplicationAnalysis(a.id);
                  } catch {
                    // Ignore
                  }
                  try {
                    assessment = await assessmentsApi.getAssessment(a.id);
                  } catch {
                    // Ignore
                  }
                }
                return mapApplication(a, analysis, assessment);
              })
            );
            setApplications(enriched);
          }
        } catch {
          // Ignore
        }
      }
    } finally {
      setLoading(false);
    }
  }, [auth.isAuthenticated, auth.role]);

  // Load data on initial mount and when auth state changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== AUTHENTICATION ====================
  const login = useCallback(
    async (role: UserRole, email: string, password: string): Promise<boolean> => {
      try {
        const res = await authApi.login({ email: email.trim(), password: password.trim() });
        const userRole = res.role.toLowerCase() as UserRole;

        if (userRole !== role) {
          authApi.logout();
          throw new Error(`This account has role "${res.role}", but you tried to sign in as "${role.toUpperCase()}".`);
        }

        const authUser: any = {
          id: String(res.user.id),
          email: res.user.email,
          name: (res as any).name || (userRole === 'ceo' ? 'Administrator' : userRole === 'hr' ? 'HR Reviewer' : 'Candidate'),
          password: '',
          companyId: String(res.company_id || 1),
          companyName: res.company_name || 'Organization',
          department: 'General',
          verified: res.user.is_email_verified,
        };

        setAuth({
          isAuthenticated: true,
          role: userRole,
          user: authUser,
        });

        // Trigger immediate data refresh for the new session
        setTimeout(() => {
          loadData();
        }, 50);

        return true;
      } catch (err: any) {
        removeStoredToken();
        throw err;
      }
    },
    [loadData]
  );

  const logout = useCallback(() => {
    authApi.logout();
    setAuth({ isAuthenticated: false, role: null, user: null });
    setApplications([]);
    setHrs([]);
    loadData();
  }, [loadData]);

  // ==================== REGISTRATION & OTP ====================
  const registerCEO = useCallback(
    async (data: { name: string; email: string; password: string; companyName: string }) => {
      const res = await authApi.registerCEO({
        name: data.name,
        email: data.email,
        password: data.password,
        company_name: data.companyName,
      });
      return {
        email: res.email || data.email,
        otp_preview: res.otp_preview,
      };
    },
    []
  );

  const verifyCEO = useCallback(async (email: string, otp: string) => {
    await authApi.verifyEmail({ email: email.trim(), otp: otp.trim() });
  }, []);

  const registerCandidate = useCallback(
    async (data: { email: string; password: string; name?: string; githubProfile?: string; linkedinProfile?: string }) => {
      const res = await authApi.registerCandidate({
        name: data.name || 'Candidate',
        email: data.email,
        password: data.password,
        github_url: data.githubProfile,
        linkedin_url: data.linkedinProfile,
      });
      return {
        email: res.email || data.email,
        otp_preview: res.otp_preview,
      };
    },
    []
  );

  const verifyCandidate = useCallback(async (email: string, otp: string) => {
    await authApi.verifyEmail({ email: email.trim(), otp: otp.trim() });
  }, []);

  // ==================== COMPANY & DEPARTMENTS ====================
  const getCompany = useCallback(
    (id: string): Company | undefined => {
      return companies.find((c) => c.id === id) || companies[0];
    },
    [companies]
  );

  const updateCompany = useCallback((id: string, data: Partial<Company>) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  }, []);

  const addDepartment = useCallback(
    async (companyId: string, department: string) => {
      await ceoApi.createDepartment(department);
      await loadData();
    },
    [loadData]
  );

  const removeDepartment = useCallback(
    async (companyId: string, departmentName: string) => {
      try {
        const depts = await ceoApi.listDepartments();
        const found = depts.find((d) => d.name.toLowerCase() === departmentName.toLowerCase());
        if (found) {
          await ceoApi.deleteDepartment(found.id);
          await loadData();
        }
      } catch {
        // Ignore
      }
    },
    [loadData]
  );

  // ==================== HR MANAGEMENT ====================
  const createHR = useCallback(
    async (data: { name: string; email: string; password: string; department: string; companyId: string; companyName: string }) => {
      // Find department ID
      const depts = await ceoApi.listDepartments();
      const targetDept = depts.find((d) => d.name.toLowerCase() === data.department.toLowerCase()) || depts[0];

      if (!targetDept) {
        throw new Error('Please create a department first before provisioning HR accounts.');
      }

      const res = await ceoApi.createHR({
        name: data.name,
        email: data.email,
        password: data.password,
        department_id: targetDept.id,
      });

      const mapped = mapHR(res);
      setHrs((prev) => [...prev, mapped]);
      return mapped;
    },
    []
  );

  const getHRsByCompany = useCallback(
    (companyId: string): HR[] => {
      return hrs;
    },
    [hrs]
  );

  const deleteHR = useCallback(async (id: string) => {
    setHrs((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ==================== VACANCIES ====================
  const createVacancy = useCallback(
    async (data: {
      title: string;
      department: string;
      companyId: string;
      companyName: string;
      hrId: string;
      jobDescription: string;
      responsibilities?: string;
      technicalRequirements?: string;
      location?: string;
      workMode?: string;
      requiredSkills: string[];
      preferredSkills: string[];
      requiredExperience: string;
      education: string;
      otherRequirements: string;
    }): Promise<Vacancy> => {
      // Find department ID if possible
      let deptId = 1;
      try {
        const depts = await ceoApi.listDepartments();
        const found = depts.find((d) => d.name.toLowerCase() === data.department.toLowerCase());
        if (found) deptId = found.id;
      } catch {
        // Fallback default
      }

      const res = await hrApi.createVacancy({
        department_id: deptId,
        title: data.title,
        description: data.jobDescription,
        required_experience: data.requiredExperience,
        education: data.education,
        required_skills: data.requiredSkills,
        preferred_skills: data.preferredSkills,
        other_requirements: data.otherRequirements,
      });

      // Automatically publish vacancy
      let published = res;
      try {
        published = await hrApi.publishVacancy(res.id);
      } catch {
        // Ignore publish error
      }

      const mapped = mapVacancy(published);
      setVacancies((prev) => [mapped, ...prev]);
      return mapped;
    },
    []
  );

  const getVacanciesByCompany = useCallback(
    (companyId: string): Vacancy[] => {
      return vacancies;
    },
    [vacancies]
  );

  const getVacanciesByHR = useCallback(
    (hrId: string): Vacancy[] => {
      return vacancies;
    },
    [vacancies]
  );

  const updateVacancyStatus = useCallback(async (id: string, status: 'active' | 'closed') => {
    if (status === 'active') {
      try {
        await hrApi.publishVacancy(Number(id));
      } catch {
        // Ignore
      }
    }
    setVacancies((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status } : v))
    );
  }, []);

  // ==================== APPLICATIONS ====================
  const submitApplication = useCallback(
    async (
      candidateId: string,
      candidateEmail: string,
      candidateName: string,
      vacancyId: string,
      resumeContent: string,
      resumeFile: string,
      fileObj?: File
    ): Promise<Application> => {
      const fileToUpload =
        fileObj ||
        new File([resumeContent], resumeFile || 'resume.txt', {
          type: 'text/plain',
        });

      const res = await candidateApi.applyForVacancy(Number(vacancyId), fileToUpload);

      // Fetch detail & analysis
      let analysis = null;
      let assessment = null;
      try {
        analysis = await hrApi.getApplicationAnalysis(res.id);
      } catch {
        // Ignore
      }
      try {
        assessment = await assessmentsApi.getAssessment(res.id);
      } catch {
        // Ignore
      }

      const mapped = mapApplication(res, analysis, assessment);
      setApplications((prev) => [mapped, ...prev]);
      return mapped;
    },
    []
  );

  const getApplicationsByCandidate = useCallback(
    (candidateId: string): Application[] => {
      return applications;
    },
    [applications]
  );

  const getApplicationsByVacancy = useCallback(
    (vacancyId: string): Application[] => {
      return applications.filter((a) => a.vacancyId === vacancyId);
    },
    [applications]
  );

  const getApplication = useCallback(
    (applicationId: string): Application | undefined => {
      return applications.find((a) => a.id === applicationId);
    },
    [applications]
  );

  // ==================== AI EVALUATION & EXPLAINABILITY ====================
  const runRound1Matching = useCallback(
    async (applicationId: string): Promise<Round1MatchAnalysis> => {
      const appIdNum = Number(applicationId);
      // Run AI analysis
      await aiApi.analyzeApplication(appIdNum);
      const analysis = await hrApi.getApplicationAnalysis(appIdNum);
      const appDetail = await applicationsApi.getApplication(appIdNum);

      let assessment = null;
      try {
        assessment = await assessmentsApi.getAssessment(appIdNum);
      } catch {
        // Ignore
      }

      const updated = mapApplication(appDetail, analysis, assessment);
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? updated : a))
      );

      if (!updated.round1Match) {
        throw new Error('AI match analysis did not return requirement results.');
      }

      return updated.round1Match;
    },
    []
  );

  const generateAssessmentQuestions = useCallback(
    async (applicationId: string): Promise<AssessmentQuestion[]> => {
      const appIdNum = Number(applicationId);
      const res = await assessmentsApi.generateAssessment(appIdNum);

      setApplications((prev) =>
        prev.map((a) => {
          if (a.id === applicationId) {
            const mapped = mapApplication(
              a as any,
              a.finalAnalysis as any,
              res
            );
            return {
              ...mapped,
              status: 'Assessment Pending',
            };
          }
          return a;
        })
      );

      const mapped = mapApplication({ id: appIdNum } as any, null, res);
      return mapped.round2Assessment?.questions || [];
    },
    []
  );

  const submitAssessmentAnswers = useCallback(
    async (
      applicationId: string,
      answers: { questionId: string; answer: string }[]
    ): Promise<void> => {
      const appIdNum = Number(applicationId);

      // Package drill-down questions and code review answer
      const drillDowns: Record<string, string> = {};
      let codeReview = '';

      answers.forEach((ans, idx) => {
        if (ans.questionId.includes('code') || idx === answers.length - 1) {
          codeReview = ans.answer;
        } else {
          drillDowns[`q_${idx + 1}`] = ans.answer;
        }
      });

      if (!codeReview) {
        codeReview = answers[answers.length - 1]?.answer || 'Candidate provided complete answer verification.';
      }

      const evaluated = await assessmentsApi.submitAssessment(appIdNum, {
        drill_down_responses: drillDowns,
        code_review_response: codeReview,
      });

      let analysis = null;
      try {
        analysis = await hrApi.getApplicationAnalysis(appIdNum);
      } catch {
        // Ignore
      }

      setApplications((prev) =>
        prev.map((a) => {
          if (a.id === applicationId) {
            return mapApplication(a as any, analysis, evaluated);
          }
          return a;
        })
      );
    },
    []
  );

  const generateFinalAnalysis = useCallback(
    async (applicationId: string): Promise<FinalCandidateAnalysis> => {
      const appIdNum = Number(applicationId);
      const analysis = await hrApi.getApplicationAnalysis(appIdNum);
      let assessment = null;
      try {
        assessment = await assessmentsApi.getAssessment(appIdNum);
      } catch {
        // Ignore
      }

      const updated = mapApplication({ id: appIdNum } as any, analysis, assessment);
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, ...updated } : a))
      );

      if (!updated.finalAnalysis) {
        throw new Error('Final candidate analysis could not be generated.');
      }
      return updated.finalAnalysis;
    },
    []
  );

  // ==================== HR DECISION & AUDIT OVERRIDE ====================
  const recordHRDecision = useCallback(
    async (
      applicationId: string,
      decision: 'Shortlisted' | 'Under HR Review' | 'Rejected' | 'Selected',
      notes: string,
      hrName: string
    ): Promise<void> => {
      const appIdNum = Number(applicationId);
      const backendStatus = mapFrontendStatusToBackend(decision);

      // 1. Update application status
      await hrApi.updateApplicationStatus(appIdNum, backendStatus);

      // 2. Record auditable recruiter override
      try {
        const currentApp = applications.find(a => a.id === applicationId);
        const originalBackendStatus = currentApp ? mapFrontendStatusToBackend(currentApp.status) : 'APPLIED';
        await auditApi.recordOverride(appIdNum, {
          original_status: originalBackendStatus,
          new_status: backendStatus,
          reason: notes && notes.length >= 5 ? notes : `Recruiter updated decision to "${decision}".`,
        });
      } catch {
        // Ignore
      }

      // 3. Attach feedback
      try {
        await hrApi.addFeedback(appIdNum, {
          feedback_type: 'HR_DECISION',
          content: notes || `Decision updated to ${decision}`,
        });
      } catch {
        // Ignore
      }

      // 4. Update local state
      setApplications((prev) =>
        prev.map((a) => {
          if (a.id === applicationId) {
            return {
              ...a,
              status: decision,
              hrDecision: {
                decision,
                decidedBy: hrName,
                decidedAt: new Date().toISOString(),
                notes,
              },
              auditTrail: [
                ...a.auditTrail,
                {
                  id: `audit_hr_${Date.now()}`,
                  applicationId,
                  action: `HR Decision: ${decision}`,
                  actor: hrName,
                  actorRole: 'hr',
                  details: notes || `Application transitioned to ${decision}.`,
                  timestamp: new Date().toISOString(),
                },
              ],
            };
          }
          return a;
        })
      );
    },
    []
  );

  // ==================== AUDIT DEFENSE AGENT ====================
  const askAuditDefense = useCallback(
    async (applicationId: string, question: string): Promise<string> => {
      const appIdNum = Number(applicationId);
      const res = await auditApi.askAuditDefense(appIdNum, question);
      return res.answer;
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        auth,
        login,
        logout,
        ceos,
        registerCEO,
        verifyCEO,
        companies,
        getCompany,
        updateCompany,
        addDepartment,
        removeDepartment,
        hrs,
        createHR,
        getHRsByCompany,
        deleteHR,
        candidates,
        registerCandidate,
        verifyCandidate,
        vacancies,
        createVacancy,
        getVacanciesByCompany,
        getVacanciesByHR,
        updateVacancyStatus,
        applications,
        submitApplication,
        getApplicationsByCandidate,
        getApplicationsByVacancy,
        getApplication,
        runRound1Matching,
        generateAssessmentQuestions,
        submitAssessmentAnswers,
        generateFinalAnalysis,
        recordHRDecision,
        askAuditDefense,
        loading,
        refreshData: loadData,
        theme,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
