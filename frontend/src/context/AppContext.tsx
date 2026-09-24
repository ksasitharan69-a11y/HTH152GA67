import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  CEO, HR, Candidate, Company, Vacancy, Application,
  AIAnalysis, RequirementEvidence, RequirementStatus,
  VerificationChallenge, AuditEntry, AuthState, UserRole,
  ApplicationStatus
} from '../types';

// ==================== Helper ====================
const generateId = () => Math.random().toString(36).substr(2, 9);
const now = () => new Date().toISOString();

// ==================== Initial Data ====================
const initialCEOs: CEO[] = [];
const initialHRs: HR[] = [];
const initialCandidates: Candidate[] = [];
const initialCompanies: Company[] = [];
const initialVacancies: Vacancy[] = [];
const initialApplications: Application[] = [];
const initialChallenges: VerificationChallenge[] = [];

// ==================== Context Type ====================
interface AppContextType {
  // Auth
  auth: AuthState;
  login: (role: UserRole, email: string, password: string) => boolean;
  logout: () => void;

  // CEO
  ceos: CEO[];
  registerCEO: (data: Omit<CEO, 'id' | 'verified' | 'companyId'>) => CEO;
  verifyCEO: (id: string) => void;

  // Company
  companies: Company[];
  getCompany: (id: string) => Company | undefined;
  updateCompany: (id: string, data: Partial<Company>) => void;
  addDepartment: (companyId: string, department: string) => void;
  removeDepartment: (companyId: string, department: string) => void;

  // HR
  hrs: HR[];
  createHR: (data: Omit<HR, 'id'>) => HR;
  getHRsByCompany: (companyId: string) => HR[];
  deleteHR: (id: string) => void;

  // Candidates
  candidates: Candidate[];
  registerCandidate: (data: Omit<Candidate, 'id' | 'verified'>) => Candidate;
  verifyCandidate: (id: string) => void;

  // Vacancies
  vacancies: Vacancy[];
  createVacancy: (data: Omit<Vacancy, 'id' | 'createdAt' | 'applicantCount' | 'status'>) => Vacancy;
  getVacanciesByCompany: (companyId: string) => Vacancy[];
  getVacanciesByHR: (hrId: string) => Vacancy[];
  updateVacancyStatus: (id: string, status: 'active' | 'closed') => void;

  // Applications
  applications: Application[];
  submitApplication: (candidateId: string, candidateEmail: string, vacancyId: string, resumeContent: string, resumeFile: string) => Application;
  getApplicationsByCandidate: (candidateId: string) => Application[];
  getApplicationsByVacancy: (vacancyId: string) => Application[];
  updateApplicationStatus: (id: string, status: ApplicationStatus, actor: string) => void;
  runAIAnalysis: (applicationId: string) => void;

  // Verification
  challenges: VerificationChallenge[];
  createChallenge: (applicationId: string, requirementId: string, requirement: string, type: VerificationChallenge['type']) => VerificationChallenge;
  submitChallengeAnswer: (challengeId: string, answer: string) => void;
  evaluateChallenge: (challengeId: string) => void;

  // HR Override
  overrideDecision: (applicationId: string, requirementId: string, newStatus: RequirementStatus, reason: string, hrName: string) => void;

  // Audit
  addAuditEntry: (applicationId: string, action: string, actor: string, actorRole: UserRole, details: string, previousValue?: string, newValue?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ==================== Provider ====================
export function AppProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, role: null, user: null });
  const [ceos, setCeos] = useState<CEO[]>(initialCEOs);
  const [hrs, setHrs] = useState<HR[]>(initialHRs);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [vacancies, setVacancies] = useState<Vacancy[]>(initialVacancies);
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [challenges, setChallenges] = useState<VerificationChallenge[]>(initialChallenges);

  // ==================== Auth ====================
  const login = useCallback((role: UserRole, email: string, password: string): boolean => {
    if (role === 'ceo') {
      const ceo = ceos.find(c => c.email === email && c.password === password);
      if (ceo) {
        setAuth({ isAuthenticated: true, role: 'ceo', user: ceo });
        return true;
      }
    } else if (role === 'hr') {
      const hr = hrs.find(h => h.email === email && h.password === password);
      if (hr) {
        setAuth({ isAuthenticated: true, role: 'hr', user: hr });
        return true;
      }
    } else if (role === 'candidate') {
      const candidate = candidates.find(c => c.email === email && c.password === password);
      if (candidate) {
        setAuth({ isAuthenticated: true, role: 'candidate', user: candidate });
        return true;
      }
    }
    return false;
  }, [ceos, hrs, candidates]);

  const logout = useCallback(() => {
    setAuth({ isAuthenticated: false, role: null, user: null });
  }, []);

  // ==================== CEO ====================
  const registerCEO = useCallback((data: Omit<CEO, 'id' | 'verified' | 'companyId'>): CEO => {
    const companyId = generateId();
    const ceo: CEO = { ...data, id: generateId(), companyId, verified: false };
    const company: Company = {
      id: companyId,
      name: data.companyName,
      ceoId: ceo.id,
      departments: ['General'],
    };
    setCeos(prev => [...prev, ceo]);
    setCompanies(prev => [...prev, company]);
    return ceo;
  }, []);

  const verifyCEO = useCallback((id: string) => {
    setCeos(prev => prev.map(c => c.id === id ? { ...c, verified: true } : c));
  }, []);

  // ==================== Company ====================
  const getCompany = useCallback((id: string) => {
    return companies.find(c => c.id === id);
  }, [companies]);

  const updateCompany = useCallback((id: string, data: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const addDepartment = useCallback((companyId: string, department: string) => {
    setCompanies(prev => prev.map(c =>
      c.id === companyId ? { ...c, departments: [...new Set([...c.departments, department])] } : c
    ));
  }, []);

  const removeDepartment = useCallback((companyId: string, department: string) => {
    setCompanies(prev => prev.map(c =>
      c.id === companyId ? { ...c, departments: c.departments.filter(d => d !== department) } : c
    ));
  }, []);

  // ==================== HR ====================
  const createHR = useCallback((data: Omit<HR, 'id'>): HR => {
    const hr: HR = { ...data, id: generateId() };
    setHrs(prev => [...prev, hr]);
    // Auto-add department to company
    addDepartment(data.companyId, data.department);
    return hr;
  }, [addDepartment]);

  const getHRsByCompany = useCallback((companyId: string) => {
    return hrs.filter(h => h.companyId === companyId);
  }, [hrs]);

  const deleteHR = useCallback((id: string) => {
    setHrs(prev => prev.filter(h => h.id !== id));
  }, []);

  // ==================== Candidate ====================
  const registerCandidate = useCallback((data: Omit<Candidate, 'id' | 'verified'>): Candidate => {
    const candidate: Candidate = { ...data, id: generateId(), verified: false };
    setCandidates(prev => [...prev, candidate]);
    return candidate;
  }, []);

  const verifyCandidate = useCallback((id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, verified: true } : c));
  }, []);

  // ==================== Vacancy ====================
  const createVacancy = useCallback((data: Omit<Vacancy, 'id' | 'createdAt' | 'applicantCount' | 'status'>): Vacancy => {
    const vacancy: Vacancy = { ...data, id: generateId(), createdAt: now(), applicantCount: 0, status: 'active' };
    setVacancies(prev => [...prev, vacancy]);
    return vacancy;
  }, []);

  const getVacanciesByCompany = useCallback((companyId: string) => {
    return vacancies.filter(v => v.companyId === companyId);
  }, [vacancies]);

  const getVacanciesByHR = useCallback((hrId: string) => {
    return vacancies.filter(v => v.hrId === hrId);
  }, [vacancies]);

  const updateVacancyStatus = useCallback((id: string, status: 'active' | 'closed') => {
    setVacancies(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  }, []);

  // ==================== Application ====================
  const submitApplication = useCallback((candidateId: string, candidateEmail: string, vacancyId: string, resumeContent: string, resumeFile: string): Application => {
    const vacancy = vacancies.find(v => v.id === vacancyId)!;
    const app: Application = {
      id: generateId(),
      candidateId,
      candidateEmail,
      vacancyId,
      companyId: vacancy.companyId,
      companyName: vacancy.companyName,
      role: vacancy.title,
      resumeContent,
      resumeFile,
      status: 'Applied',
      appliedAt: now(),
      auditTrail: [{
        id: generateId(),
        applicationId: '',
        action: 'Application Submitted',
        actor: candidateEmail,
        actorRole: 'candidate',
        details: `Candidate applied for ${vacancy.title} at ${vacancy.companyName}`,
        timestamp: now(),
      }],
    };
    app.auditTrail[0].applicationId = app.id;
    setApplications(prev => [...prev, app]);
    setVacancies(prev => prev.map(v => v.id === vacancyId ? { ...v, applicantCount: v.applicantCount + 1 } : v));
    return app;
  }, [vacancies]);

  const getApplicationsByCandidate = useCallback((candidateId: string) => {
    return applications.filter(a => a.candidateId === candidateId);
  }, [applications]);

  const getApplicationsByVacancy = useCallback((vacancyId: string) => {
    return applications.filter(a => a.vacancyId === vacancyId);
  }, [applications]);

  const updateApplicationStatus = useCallback((id: string, status: ApplicationStatus, actor: string) => {
    setApplications(prev => prev.map(a => {
      if (a.id === id) {
        const entry: AuditEntry = {
          id: generateId(),
          applicationId: id,
          action: 'Status Updated',
          actor,
          actorRole: 'hr',
          details: `Status changed from ${a.status} to ${status}`,
          timestamp: now(),
          previousValue: a.status,
          newValue: status,
        };
        return { ...a, status, auditTrail: [...a.auditTrail, entry] };
      }
      return a;
    }));
  }, []);

  // ==================== AI Analysis ====================
  const runAIAnalysis = useCallback((applicationId: string) => {
    setApplications(prev => prev.map(app => {
      if (app.id !== applicationId) return app;

      const vacancy = vacancies.find(v => v.id === app.vacancyId);
      if (!vacancy) return app;

      const resumeText = (app.resumeContent || '').toLowerCase();

      const requirements: RequirementEvidence[] = vacancy.requiredSkills.map((skill, idx) => {
        const skillLower = skill.toLowerCase();
        const found = resumeText.includes(skillLower);

        let status: RequirementStatus;
        let evidence: string;
        let aiReasoning: string;
        let evidenceSource: string;

        if (found) {
          // Check for strong vs partial evidence
          const hasProject = resumeText.includes('project') || resumeText.includes('built') || resumeText.includes('developed') || resumeText.includes('implemented');
          const hasExperience = resumeText.includes('experience') || resumeText.includes('years') || resumeText.includes('worked');

          if (hasProject || hasExperience) {
            status = 'VERIFIED';
            evidence = `Found relevant mention of ${skill} with supporting context in the resume.`;
            aiReasoning = `The candidate's resume contains references to ${skill} along with project or experience context, indicating practical usage.`;
            evidenceSource = hasProject ? 'Projects / Work Experience' : 'Professional Experience';
          } else {
            status = 'PARTIAL';
            evidence = `${skill} is mentioned in the resume but lacks detailed supporting context.`;
            aiReasoning = `While ${skill} appears in the resume, there is insufficient detail about practical application, projects, or duration of use.`;
            evidenceSource = 'Resume - Skills Section';
          }
        } else {
          // Random chance for GAP vs UNVERIFIED for demo variety
          if (idx % 3 === 0 && vacancy.requiredSkills.length > 3) {
            status = 'GAP';
            evidence = `No mention of ${skill} found in the resume.`;
            aiReasoning = `After thorough analysis, no evidence of ${skill} knowledge or experience was found in the candidate's resume.`;
            evidenceSource = 'N/A';
          } else {
            status = 'UNVERIFIED';
            evidence = `No sufficient supporting evidence for ${skill} was found in the submitted resume.`;
            aiReasoning = `The resume does not contain clear evidence of ${skill}. This does not necessarily mean the candidate lacks this skill — it may simply not be documented in the resume.`;
            evidenceSource = 'N/A';
          }
        }

        return {
          requirementId: `req_${idx}_${generateId()}`,
          requirement: skill,
          status,
          evidence,
          evidenceSource,
          aiReasoning,
        };
      });

      // Add experience requirement
      requirements.push({
        requirementId: `req_exp_${generateId()}`,
        requirement: `Experience: ${vacancy.requiredExperience}`,
        status: resumeText.includes('experience') || resumeText.includes('years') ? 'PARTIAL' : 'UNVERIFIED',
        evidence: resumeText.includes('experience') ? 'Resume mentions professional experience.' : 'Experience details not clearly documented.',
        evidenceSource: resumeText.includes('experience') ? 'Professional Summary' : 'N/A',
        aiReasoning: resumeText.includes('experience')
          ? 'The candidate references experience but specific duration needs verification.'
          : 'Unable to determine exact experience level from resume content.',
      });

      const verified = requirements.filter(r => r.status === 'VERIFIED').length;
      const total = requirements.length;
      const score = Math.round((verified / total) * 100);

      const analysis: AIAnalysis = {
        id: generateId(),
        applicationId,
        overallScore: score,
        requirements,
        summary: `AI analysis complete. ${verified}/${total} requirements verified with evidence. Score: ${score}%.`,
        strengths: requirements.filter(r => r.status === 'VERIFIED').map(r => r.requirement),
        gaps: requirements.filter(r => r.status === 'GAP').map(r => r.requirement),
        recommendation: score >= 70 ? 'Strong candidate — recommend proceeding to interview.' :
          score >= 40 ? 'Moderate match — consider verification for unverified skills.' :
            'Weak match — significant gaps identified.',
        analyzedAt: now(),
      };

      const entry: AuditEntry = {
        id: generateId(),
        applicationId,
        action: 'AI Analysis Completed',
        actor: 'HireProof AI',
        actorRole: 'hr',
        details: `AI analysis complete. Score: ${score}%. ${verified}/${total} requirements verified.`,
        timestamp: now(),
      };

      return {
        ...app,
        status: 'Under Review' as ApplicationStatus,
        aiAnalysis: analysis,
        auditTrail: [...app.auditTrail, entry],
      };
    }));
  }, [vacancies]);

  // ==================== Verification ====================
  const createChallenge = useCallback((applicationId: string, requirementId: string, requirement: string, type: VerificationChallenge['type']): VerificationChallenge => {
    const questions: Record<string, string> = {
      challenge: `Design and explain a solution using ${requirement} that demonstrates your practical understanding. Include architecture decisions, trade-offs, and implementation details.`,
      interview: `Describe a project where you used ${requirement}. Explain the specific services/features you utilized and the challenges you encountered.`,
      evidence_upload: `Please upload certificates, project documentation, or other evidence demonstrating your proficiency in ${requirement}.`,
      work_sample: `Provide a work sample or code snippet that demonstrates your expertise in ${requirement}. Include context about the project.`,
    };

    const challenge: VerificationChallenge = {
      id: generateId(),
      applicationId,
      requirementId,
      requirement,
      type,
      question: questions[type] || questions.challenge,
      status: 'pending',
      createdAt: now(),
    };
    setChallenges(prev => [...prev, challenge]);

    // Add audit entry
    setApplications(prev => prev.map(a => {
      if (a.id === applicationId) {
        const entry: AuditEntry = {
          id: generateId(),
          applicationId,
          action: 'Verification Challenge Created',
          actor: 'HR',
          actorRole: 'hr',
          details: `${type} challenge created for requirement: ${requirement}`,
          timestamp: now(),
        };
        return { ...a, auditTrail: [...a.auditTrail, entry] };
      }
      return a;
    }));

    return challenge;
  }, []);

  const submitChallengeAnswer = useCallback((challengeId: string, answer: string) => {
    setChallenges(prev => prev.map(c =>
      c.id === challengeId ? { ...c, candidateAnswer: answer, status: 'submitted' } : c
    ));
  }, []);

  const evaluateChallenge = useCallback((challengeId: string) => {
    setChallenges(prev => prev.map(c => {
      if (c.id !== challengeId || !c.candidateAnswer) return c;

      const answerLength = c.candidateAnswer.length;
      let result: VerificationChallenge['evaluationResult'];
      let evaluation: string;

      if (answerLength > 200) {
        result = 'Strong Evidence';
        evaluation = `The candidate provided a detailed and comprehensive response demonstrating strong understanding of ${c.requirement}. The response includes specific examples, technical details, and practical application knowledge.`;
      } else if (answerLength > 80) {
        result = 'Partial Evidence';
        evaluation = `The candidate provided a reasonable response about ${c.requirement} but could benefit from more specific examples and technical depth.`;
      } else {
        result = 'Insufficient Evidence';
        evaluation = `The candidate's response regarding ${c.requirement} lacks sufficient detail and specificity to verify proficiency.`;
      }

      return { ...c, aiEvaluation: evaluation, evaluationResult: result, status: 'evaluated' };
    }));

    // Update the requirement status in the application
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge) {
      setApplications(prev => prev.map(app => {
        if (app.id !== challenge.applicationId || !app.aiAnalysis) return app;

        const updatedReqs = app.aiAnalysis.requirements.map(req => {
          if (req.requirementId === challenge.requirementId) {
            const updatedChallenge = { ...challenge };
            // Simulate evaluation
            const answerLen = (updatedChallenge.candidateAnswer || '').length;
            let newStatus: RequirementStatus = req.status;
            let verificationResult = '';

            if (answerLen > 200) {
              newStatus = 'VERIFIED';
              verificationResult = 'Verified through assessment — Strong evidence provided.';
            } else if (answerLen > 80) {
              newStatus = 'PARTIAL';
              verificationResult = 'Partially verified — Additional evidence may strengthen the case.';
            } else {
              verificationResult = 'Insufficient evidence from assessment.';
            }

            return {
              ...req,
              status: newStatus,
              verificationMethod: 'assessment' as const,
              verificationResult,
              verificationDetails: updatedChallenge.candidateAnswer,
            };
          }
          return req;
        });

        const verified = updatedReqs.filter(r => r.status === 'VERIFIED').length;
        const total = updatedReqs.length;
        const newScore = Math.round((verified / total) * 100);

        const entry: AuditEntry = {
          id: generateId(),
          applicationId: app.id,
          action: 'Verification Evaluated',
          actor: 'HireProof AI',
          actorRole: 'hr',
          details: `Assessment for ${challenge.requirement} has been evaluated.`,
          timestamp: now(),
        };

        return {
          ...app,
          aiAnalysis: {
            ...app.aiAnalysis,
            requirements: updatedReqs,
            overallScore: newScore,
          },
          auditTrail: [...app.auditTrail, entry],
        };
      }));
    }
  }, [challenges]);

  // ==================== HR Override ====================
  const overrideDecision = useCallback((applicationId: string, requirementId: string, newStatus: RequirementStatus, reason: string, hrName: string) => {
    setApplications(prev => prev.map(app => {
      if (app.id !== applicationId || !app.aiAnalysis) return app;

      const updatedReqs = app.aiAnalysis.requirements.map(req => {
        if (req.requirementId === requirementId) {
          return {
            ...req,
            status: newStatus,
            hrOverride: {
              originalStatus: req.status,
              newStatus,
              reason,
              overriddenBy: hrName,
              overriddenAt: now(),
            },
          };
        }
        return req;
      });

      const verified = updatedReqs.filter(r => r.status === 'VERIFIED').length;
      const total = updatedReqs.length;
      const newScore = Math.round((verified / total) * 100);

      const req = app.aiAnalysis.requirements.find(r => r.requirementId === requirementId);
      const entry: AuditEntry = {
        id: generateId(),
        applicationId,
        action: 'HR Override',
        actor: hrName,
        actorRole: 'hr',
        details: `HR overrode AI decision for ${req?.requirement}: ${req?.status} → ${newStatus}. Reason: ${reason}`,
        timestamp: now(),
        previousValue: req?.status,
        newValue: newStatus,
      };

      return {
        ...app,
        aiAnalysis: { ...app.aiAnalysis, requirements: updatedReqs, overallScore: newScore },
        auditTrail: [...app.auditTrail, entry],
      };
    }));
  }, []);

  // ==================== Audit ====================
  const addAuditEntry = useCallback((applicationId: string, action: string, actor: string, actorRole: UserRole, details: string, previousValue?: string, newValue?: string) => {
    setApplications(prev => prev.map(a => {
      if (a.id === applicationId) {
        const entry: AuditEntry = {
          id: generateId(),
          applicationId,
          action,
          actor,
          actorRole,
          details,
          timestamp: now(),
          previousValue,
          newValue,
        };
        return { ...a, auditTrail: [...a.auditTrail, entry] };
      }
      return a;
    }));
  }, []);

  const value: AppContextType = {
    auth, login, logout,
    ceos, registerCEO, verifyCEO,
    companies, getCompany, updateCompany, addDepartment, removeDepartment,
    hrs, createHR, getHRsByCompany, deleteHR,
    candidates, registerCandidate, verifyCandidate,
    vacancies, createVacancy, getVacanciesByCompany, getVacanciesByHR, updateVacancyStatus,
    applications, submitApplication, getApplicationsByCandidate, getApplicationsByVacancy, updateApplicationStatus, runAIAnalysis,
    challenges, createChallenge, submitChallengeAnswer, evaluateChallenge,
    overrideDecision, addAuditEntry,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
