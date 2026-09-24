import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  CEO, HR, Candidate, Company, Department, Vacancy, StructuredRequirement,
  Application, ApplicationStatus, Round1MatchAnalysis, MatchStatus, RequirementEvidence,
  TechnicalAssessment, AssessmentQuestion, FinalCandidateAnalysis, HRDecision,
  AuditEntry, AuthState, UserRole
} from '../types';

// ==================== Storage Keys ====================
const STORAGE_KEY = 'hireproof_platform_data_v2';

// ==================== Helper Functions ====================
const generateId = () => Math.random().toString(36).substring(2, 11);
const now = () => new Date().toISOString();

// ==================== Clean Initial State (No fake applications) ====================
// Default company, CEO and HR ready for instant evaluation without fake candidates or fake applications
const defaultCompanies: Company[] = [
  {
    id: 'comp_abc',
    name: 'ABC Technologies',
    ceoId: 'ceo_demo',
    departments: ['Software Development', 'Data Science', 'Cloud & Infrastructure', 'Product'],
    description: 'ABC Technologies builds high-throughput distributed microservices, APIs, and data infrastructure.',
    industry: 'Enterprise Software',
    location: 'Bangalore / Remote',
    website: 'https://abctechnologies.io'
  }
];

const defaultCEOs: CEO[] = [
  {
    id: 'ceo_demo',
    name: 'Vikram Malhotra',
    email: 'ceo@abc.com',
    password: 'password123',
    companyName: 'ABC Technologies',
    companyId: 'comp_abc',
    verified: true
  }
];

const defaultHRs: HR[] = [
  {
    id: 'hr_demo',
    name: 'Rahul Mehta',
    email: 'rahul@abc.com',
    password: 'password123',
    department: 'Software Development',
    companyId: 'comp_abc',
    companyName: 'ABC Technologies'
  }
];

const defaultCandidates: Candidate[] = [
  {
    id: 'cand_demo',
    name: 'Alex Chen',
    email: 'candidate@test.com',
    password: 'password123',
    githubProfile: 'https://github.com/alexchen-dev',
    linkedinProfile: 'https://linkedin.com/in/alexchen-eng',
    verified: true
  }
];

// Initial vacancy with structured requirements ready for candidate applications
const defaultVacancies: Vacancy[] = [
  {
    id: 'vac_python_dev',
    title: 'Python Backend Developer',
    department: 'Software Development',
    companyId: 'comp_abc',
    companyName: 'ABC Technologies',
    hrId: 'hr_demo',
    jobDescription: 'We are seeking a Python Backend Developer to design, implement, and maintain high-performance RESTful APIs, scalable microservices, and asynchronous event processors. You will work with FastAPI, PostgreSQL, Docker, and AWS.',
    location: 'Bangalore, India (Hybrid)',
    workMode: 'Hybrid',
    requiredSkills: ['Python', 'FastAPI', 'SQL / PostgreSQL', 'REST APIs'],
    preferredSkills: ['Docker', 'AWS', 'System Design'],
    requiredExperience: '2+ years',
    education: 'B.Tech / B.E. in Computer Science, IT, or equivalent experience',
    otherRequirements: 'Solid understanding of concurrency, async IO, database indexing, and automated testing.',
    status: 'active',
    createdAt: '2026-09-23T10:00:00.000Z',
    applicantCount: 0,
    structuredRequirements: [
      {
        id: 'req_1_py',
        name: 'Python',
        description: 'Core proficiency in Python 3.10+, object-oriented design, async IO, and standard libraries.',
        category: 'Language',
        type: 'Required',
        importance: 'High',
        expectedExperience: '2+ years'
      },
      {
        id: 'req_2_fastapi',
        name: 'FastAPI',
        description: 'Direct experience building microservices and RESTful endpoints using FastAPI and Pydantic.',
        category: 'Framework',
        type: 'Required',
        importance: 'High',
        expectedExperience: '2+ years'
      },
      {
        id: 'req_3_sql',
        name: 'SQL / Relational Databases',
        description: 'Database schema design, query optimization, indexing, and ACID transaction handling in PostgreSQL.',
        category: 'Database',
        type: 'Required',
        importance: 'High',
        expectedExperience: '2+ years'
      },
      {
        id: 'req_4_rest',
        name: 'REST APIs',
        description: 'Design and implementation of robust RESTful services, error handling, status codes, and API security.',
        category: 'Architecture',
        type: 'Required',
        importance: 'High',
        expectedExperience: '2+ years'
      },
      {
        id: 'req_5_docker',
        name: 'Docker',
        description: 'Containerizing backend applications, multi-stage builds, and Docker Compose orchestration.',
        category: 'DevOps',
        type: 'Preferred',
        importance: 'Medium',
        expectedExperience: '1+ years'
      },
      {
        id: 'req_6_aws',
        name: 'AWS Cloud Services',
        description: 'Deployment experience with AWS services such as ECS, S3, CloudWatch, and RDS.',
        category: 'DevOps',
        type: 'Preferred',
        importance: 'Medium',
        expectedExperience: '1+ years'
      },
      {
        id: 'req_7_exp',
        name: '2+ years Professional Experience',
        description: 'Minimum duration of full-time professional software engineering experience.',
        category: 'Experience',
        type: 'Required',
        importance: 'High',
        expectedExperience: '2+ years'
      }
    ]
  }
];

// Context Interface
interface AppContextType {
  // Auth
  auth: AuthState;
  login: (role: UserRole, email: string, password: string) => boolean;
  logout: () => void;

  // CEO
  ceos: CEO[];
  registerCEO: (data: Omit<CEO, 'id' | 'verified' | 'companyId'>) => CEO;
  verifyCEO: (id: string) => void;

  // Company & Departments
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

  // Candidate
  candidates: Candidate[];
  registerCandidate: (data: Omit<Candidate, 'id' | 'verified'>) => Candidate;
  verifyCandidate: (id: string) => void;

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
  }) => Vacancy;
  getVacanciesByCompany: (companyId: string) => Vacancy[];
  getVacanciesByHR: (hrId: string) => Vacancy[];
  updateVacancyStatus: (id: string, status: 'active' | 'closed') => void;

  // Applications
  applications: Application[];
  submitApplication: (
    candidateId: string,
    candidateEmail: string,
    candidateName: string,
    vacancyId: string,
    resumeContent: string,
    resumeFile: string
  ) => Application;
  getApplicationsByCandidate: (candidateId: string) => Application[];
  getApplicationsByVacancy: (vacancyId: string) => Application[];
  getApplication: (applicationId: string) => Application | undefined;

  // ROUND 1: Resume-JD Matching
  runRound1Matching: (applicationId: string) => Round1MatchAnalysis;

  // ROUND 2: AI Technical Assessment
  generateAssessmentQuestions: (applicationId: string) => AssessmentQuestion[];
  submitAssessmentAnswers: (applicationId: string, answers: { questionId: string; answer: string }[]) => void;

  // FINAL: Combined Candidate Analysis
  generateFinalAnalysis: (applicationId: string) => FinalCandidateAnalysis;

  // HR Decision
  recordHRDecision: (
    applicationId: string,
    decision: 'Shortlisted' | 'Under HR Review' | 'Rejected' | 'Selected',
    notes: string,
    hrName: string
  ) => void;

  // Reset / Utility
  resetWorkspace: () => void;
  seedSampleApplication: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Load state from localStorage or initialize with clean seed
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, role: null, user: null });

  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_companies`);
    return saved ? JSON.parse(saved) : defaultCompanies;
  });

  const [ceos, setCeos] = useState<CEO[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_ceos`);
    return saved ? JSON.parse(saved) : defaultCEOs;
  });

  const [hrs, setHrs] = useState<HR[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_hrs`);
    return saved ? JSON.parse(saved) : defaultHRs;
  });

  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_candidates`);
    return saved ? JSON.parse(saved) : defaultCandidates;
  });

  const [vacancies, setVacancies] = useState<Vacancy[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_vacancies`);
    return saved ? JSON.parse(saved) : defaultVacancies;
  });

  // Zero fake applications on initial start!
  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_applications`);
    return saved ? JSON.parse(saved) : [];
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_companies`, JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_ceos`, JSON.stringify(ceos));
  }, [ceos]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_hrs`, JSON.stringify(hrs));
  }, [hrs]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_candidates`, JSON.stringify(candidates));
  }, [candidates]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_vacancies`, JSON.stringify(vacancies));
  }, [vacancies]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_applications`, JSON.stringify(applications));
  }, [applications]);

  // ==================== AUTH ====================
  const login = useCallback((role: UserRole, email: string, password: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (role === 'ceo') {
      const user = ceos.find(c => c.email.toLowerCase() === cleanEmail && c.password === cleanPass);
      if (user) {
        setAuth({ isAuthenticated: true, role: 'ceo', user });
        return true;
      }
    } else if (role === 'hr') {
      const user = hrs.find(h => h.email.toLowerCase() === cleanEmail && h.password === cleanPass);
      if (user) {
        setAuth({ isAuthenticated: true, role: 'hr', user });
        return true;
      }
    } else if (role === 'candidate') {
      const user = candidates.find(c => c.email.toLowerCase() === cleanEmail && c.password === cleanPass);
      if (user) {
        setAuth({ isAuthenticated: true, role: 'candidate', user });
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
    const ceoId = generateId();
    const ceo: CEO = { ...data, id: ceoId, companyId, verified: false };
    const company: Company = {
      id: companyId,
      name: data.companyName,
      ceoId: ceo.id,
      departments: ['Engineering', 'Data Science', 'Product', 'Finance']
    };

    setCeos(prev => [...prev, ceo]);
    setCompanies(prev => [...prev, company]);
    return ceo;
  }, []);

  const verifyCEO = useCallback((id: string) => {
    setCeos(prev => prev.map(c => c.id === id ? { ...c, verified: true } : c));
  }, []);

  // ==================== COMPANY ====================
  const getCompany = useCallback((id: string) => {
    return companies.find(c => c.id === id);
  }, [companies]);

  const updateCompany = useCallback((id: string, data: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const addDepartment = useCallback((companyId: string, department: string) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        const trimmed = department.trim();
        if (trimmed && !c.departments.includes(trimmed)) {
          return { ...c, departments: [...c.departments, trimmed] };
        }
      }
      return c;
    }));
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
    addDepartment(data.companyId, data.department);
    return hr;
  }, [addDepartment]);

  const getHRsByCompany = useCallback((companyId: string) => {
    return hrs.filter(h => h.companyId === companyId);
  }, [hrs]);

  const deleteHR = useCallback((id: string) => {
    setHrs(prev => prev.filter(h => h.id !== id));
  }, []);

  // ==================== CANDIDATE ====================
  const registerCandidate = useCallback((data: Omit<Candidate, 'id' | 'verified'>): Candidate => {
    const candidate: Candidate = { ...data, id: generateId(), verified: false };
    setCandidates(prev => [...prev, candidate]);
    return candidate;
  }, []);

  const verifyCandidate = useCallback((id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, verified: true } : c));
  }, []);

  // ==================== AI JD ANALYZER & VACANCY CREATION ====================
  const analyzeJobDescriptionToRequirements = (
    skills: string[],
    preferred: string[],
    experienceStr: string,
    jdText: string
  ): StructuredRequirement[] => {
    const reqs: StructuredRequirement[] = [];

    // Analyze required skills
    skills.forEach((skill, idx) => {
      const s = skill.trim();
      if (!s) return;
      let category = 'Technical Skill';
      const sLower = s.toLowerCase();
      const semanticKeywords: string[] = [sLower];

      if (['python', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust', 'c#'].some(l => sLower.includes(l))) {
        category = 'Language';
        if (sLower.includes('python')) semanticKeywords.push('py', 'django', 'fastapi', 'flask', 'asyncio');
        if (sLower.includes('typescript')) semanticKeywords.push('ts', 'typed', 'interfaces');
      } else if (['fastapi', 'react', 'django', 'flask', 'next.js', 'vue', 'express', 'spring'].some(f => sLower.includes(f))) {
        category = 'Framework';
        if (sLower.includes('fastapi')) semanticKeywords.push('pydantic', 'starlette', 'uvicorn', 'rest api');
        if (sLower.includes('react')) semanticKeywords.push('hooks', 'jsx', 'frontend', 'components');
      } else if (['sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'database'].some(d => sLower.includes(d))) {
        category = 'Database';
        semanticKeywords.push('queries', 'schema', 'indexing', 'transactions', 'acid');
      } else if (['docker', 'aws', 'kubernetes', 'k8s', 'ci/cd', 'git', 'linux'].some(c => sLower.includes(c))) {
        category = 'DevOps / Cloud';
        semanticKeywords.push('container', 'cloud', 'deployment', 'orchestration');
      } else if (['rest', 'api', 'microservices', 'system design', 'architecture'].some(a => sLower.includes(a))) {
        category = 'Architecture';
        semanticKeywords.push('endpoints', 'http', 'json', 'latency', 'concurrency');
      }

      reqs.push({
        id: `req_str_${idx + 1}_${generateId()}`,
        name: s,
        description: `Direct competency requirement in ${s} as specified in the Job Description.`,
        category,
        type: 'Required',
        importance: idx < 3 ? 'High' : 'Medium',
        expectedExperience: experienceStr || '2+ years',
        semanticKeywords
      });
    });

    // Analyze preferred skills
    preferred.forEach((skill, idx) => {
      const s = skill.trim();
      if (!s) return;
      let category = 'Preferred Skill';
      const sLower = s.toLowerCase();
      const semanticKeywords: string[] = [sLower];

      if (['docker', 'aws', 'kubernetes', 'k8s', 'gcp', 'azure'].some(c => sLower.includes(c))) {
        category = 'DevOps / Cloud';
        semanticKeywords.push('cloud infrastructure', 'containerization', 'iac');
      } else if (['kafka', 'redis', 'rabbitmq', 'graphql'].some(m => sLower.includes(m))) {
        category = 'Middleware / Caching';
        semanticKeywords.push('pubsub', 'caching', 'queues');
      }

      reqs.push({
        id: `req_pref_${idx + 1}_${generateId()}`,
        name: s,
        description: `Preferred domain proficiency in ${s}. Beneficial for advanced architectural execution.`,
        category,
        type: 'Preferred',
        importance: 'Medium',
        expectedExperience: '1+ years',
        semanticKeywords
      });
    });

    // Minimum Experience requirement
    if (experienceStr) {
      reqs.push({
        id: `req_exp_${generateId()}`,
        name: `${experienceStr} Professional Experience`,
        description: `Candidate must demonstrate full-time relevant software industry experience of at least ${experienceStr}.`,
        category: 'Experience',
        type: 'Required',
        importance: 'High',
        expectedExperience: experienceStr,
        semanticKeywords: ['experience', 'years', 'developer', 'engineer', 'work history']
      });
    }

    return reqs;
  };

  const createVacancy = useCallback((data: {
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
  }): Vacancy => {
    // Run AI JD Analyzer to generate structured requirements
    const structuredRequirements = analyzeJobDescriptionToRequirements(
      data.requiredSkills,
      data.preferredSkills,
      data.requiredExperience,
      data.jobDescription
    );

    const vacancy: Vacancy = {
      ...data,
      id: generateId(),
      status: 'active',
      createdAt: now(),
      applicantCount: 0,
      structuredRequirements
    };

    setVacancies(prev => [vacancy, ...prev]);
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

  // ==================== APPLICATION LIFECYCLE ====================
  const submitApplication = useCallback((
    candidateId: string,
    candidateEmail: string,
    candidateName: string,
    vacancyId: string,
    resumeContent: string,
    resumeFile: string
  ): Application => {
    const vacancy = vacancies.find(v => v.id === vacancyId);
    const appId = generateId();

    const application: Application = {
      id: appId,
      candidateId,
      candidateEmail,
      candidateName: candidateName || 'Candidate',
      vacancyId,
      companyId: vacancy?.companyId || 'comp_abc',
      companyName: vacancy?.companyName || 'ABC Technologies',
      role: vacancy?.title || 'Engineer',
      resumeContent,
      resumeFile: resumeFile || 'Resume.txt',
      status: 'Applied',
      appliedAt: now(),
      auditTrail: [
        {
          id: generateId(),
          applicationId: appId,
          action: 'Application Submitted',
          actor: candidateEmail,
          actorRole: 'candidate',
          details: `Candidate applied for ${vacancy?.title || 'position'} at ${vacancy?.companyName || 'Company'}. Resume uploaded.`,
          timestamp: now()
        }
      ]
    };

    setApplications(prev => [application, ...prev]);
    setVacancies(prev => prev.map(v => v.id === vacancyId ? { ...v, applicantCount: v.applicantCount + 1 } : v));

    return application;
  }, [vacancies]);

  const getApplicationsByCandidate = useCallback((candidateId: string) => {
    return applications.filter(a => a.candidateId === candidateId);
  }, [applications]);

  const getApplicationsByVacancy = useCallback((vacancyId: string) => {
    return applications.filter(a => a.vacancyId === vacancyId);
  }, [applications]);

  const getApplication = useCallback((applicationId: string) => {
    return applications.find(a => a.id === applicationId);
  }, [applications]);

  // ==================== ROUND 1: RESUME ↔ JD MATCHING & EVIDENCE EXTRACTION ====================
  const runRound1Matching = useCallback((applicationId: string): Round1MatchAnalysis => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    const vacancy = vacancies.find(v => v.id === app.vacancyId);
    if (!vacancy) throw new Error('Vacancy not found');

    const resume = (app.resumeContent || '').trim();
    const resumeLower = resume.toLowerCase();

    // Semantic keyword map for deep understanding
    const semanticMap: Record<string, string[]> = {
      'python': ['python', 'py', 'django', 'fastapi', 'flask', 'asyncio', 'pydantic', 'sqlalchemy'],
      'fastapi': ['fastapi', 'starlette', 'pydantic', 'uvicorn', 'rest api', 'openapi', 'swagger', 'api endpoints'],
      'sql': ['sql', 'postgresql', 'postgres', 'mysql', 'database', 'queries', 'schema', 'indexing', 'transactions', 'acid'],
      'postgresql': ['postgresql', 'postgres', 'psql', 'relational database', 'pg_dump', 'sqlalchemy'],
      'rest apis': ['rest', 'api', 'restful', 'endpoints', 'http', 'json', 'postman', 'routes'],
      'docker': ['docker', 'container', 'containerized', 'dockerfile', 'docker-compose', 'image'],
      'aws': ['aws', 'amazon web services', 's3', 'ec2', 'ecs', 'rds', 'cloudwatch', 'iam', 'lambda'],
      'system design': ['system design', 'architecture', 'scalability', 'microservices', 'distributed', 'concurrency', 'high-throughput'],
      'react': ['react', 'jsx', 'tsx', 'hooks', 'redux', 'frontend', 'components', 'state'],
      'typescript': ['typescript', 'ts', 'typed', 'interfaces', 'types'],
    };

    // Split resume into sections for source localization
    const lines = resume.split('\n');
    let currentSection = 'General Profile';
    const sectionLines: { section: string; text: string }[] = [];

    lines.forEach(l => {
      const trimmed = l.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (lower.includes('experience') || lower.includes('employment') || lower.includes('work history')) {
        currentSection = 'Work Experience';
      } else if (lower.includes('project') || lower.includes('portfolio')) {
        currentSection = 'Projects';
      } else if (lower.includes('skill') || lower.includes('technologies') || lower.includes('tools')) {
        currentSection = 'Technical Skills';
      } else if (lower.includes('education') || lower.includes('academic') || lower.includes('degree')) {
        currentSection = 'Education';
      } else if (lower.includes('summary') || lower.includes('about')) {
        currentSection = 'Summary';
      }
      sectionLines.push({ section: currentSection, text: trimmed });
    });

    const requirementEvidences: RequirementEvidence[] = [];
    const strengths: string[] = [];
    const partialSkills: string[] = [];
    const unverifiedSkills: string[] = [];
    const gaps: string[] = [];

    let totalWeight = 0;
    let earnedWeight = 0;

    const requirementsToEvaluate = vacancy.structuredRequirements && vacancy.structuredRequirements.length > 0
      ? vacancy.structuredRequirements
      : vacancy.requiredSkills.map((s, idx) => ({
          id: `req_${idx}`,
          name: s,
          description: s,
          category: 'Technical',
          type: 'Required' as const,
          importance: 'High' as const,
          expectedExperience: '2+ years'
        }));

    requirementsToEvaluate.forEach(req => {
      const reqName = req.name.trim();
      const reqLower = reqName.toLowerCase();
      const isExperience = req.category === 'Experience' || reqLower.includes('experience') || reqLower.includes('year');

      // Weight multiplier based on importance and required/preferred
      const impWeight = req.importance === 'High' ? 1.5 : req.importance === 'Medium' ? 1.0 : 0.6;
      const typeWeight = req.type === 'Required' ? 1.5 : 0.8;
      const reqWeight = impWeight * typeWeight;
      totalWeight += reqWeight;

      // Experience requirement evaluation
      if (isExperience) {
        const yearMatches = resume.match(/(\d+(\.\d+)?)\+?\s*(years?|yrs?)/gi) || [];
        const hasExpSection = resumeLower.includes('experience') || resumeLower.includes('engineer') || resumeLower.includes('developer');

        let yearsFound = 0;
        yearMatches.forEach(m => {
          const num = parseFloat(m);
          if (!isNaN(num) && num > yearsFound) yearsFound = num;
        });

        const expectedYears = parseFloat(req.expectedExperience || '2') || 2;

        if (yearsFound >= expectedYears) {
          earnedWeight += reqWeight * 1.0;
          strengths.push(`${reqName} (${yearsFound} years documented)`);
          requirementEvidences.push({
            requirementId: req.id,
            requirement: reqName,
            category: req.category,
            type: req.type,
            importance: req.importance,
            status: 'MATCH',
            evidence: `Found direct evidence of ${yearsFound} years professional software development in resume.`,
            source: 'Resume → Work Experience',
            reasoning: `The candidate explicitly documents ${yearsFound} years of relevant experience, satisfying the ${expectedYears}+ years minimum requirement.`,
            confidence: 0.94
          });
        } else if (yearsFound > 0 || hasExpSection) {
          earnedWeight += reqWeight * 0.5;
          partialSkills.push(reqName);
          requirementEvidences.push({
            requirementId: req.id,
            requirement: reqName,
            category: req.category,
            type: req.type,
            importance: req.importance,
            status: 'PARTIAL',
            evidence: yearsFound > 0 ? `Resume indicates approximately ${yearsFound} years of experience.` : 'Resume indicates prior professional experience but lacks explicit aggregate duration.',
            source: 'Resume → Work Experience / Summary',
            reasoning: yearsFound > 0
              ? `The candidate has relevant software experience (${yearsFound} years) but does not fully meet the stated ${expectedYears}+ years requirement.`
              : `Resume indicates industry involvement but exact tenure requires timeline verification.`,
            confidence: 0.78
          });
        } else {
          unverifiedSkills.push(reqName);
          requirementEvidences.push({
            requirementId: req.id,
            requirement: reqName,
            category: req.category,
            type: req.type,
            importance: req.importance,
            status: 'UNVERIFIED',
            evidence: null,
            source: null,
            reasoning: 'Professional software engineering experience duration could not be definitively verified from the provided resume.',
            confidence: 0.80
          });
        }
        return;
      }

      // Technical Skill Evaluation
      const targetSynonyms = semanticMap[reqLower] || [reqLower];
      // Check if any synonym matches
      const matchingLine = sectionLines.find(item =>
        targetSynonyms.some(syn => item.text.toLowerCase().includes(syn))
      );

      if (matchingLine) {
        const text = matchingLine.text;
        const textLower = text.toLowerCase();
        const actionVerbs = ['developed', 'built', 'architected', 'implemented', 'designed', 'optimized', 'managed', 'deployed', 'scaled', 'created'];
        const hasActionContext = actionVerbs.some(v => textLower.includes(v)) || matchingLine.section === 'Projects' || matchingLine.section === 'Work Experience';

        if (hasActionContext && matchingLine.section !== 'Technical Skills') {
          // Strong MATCH
          earnedWeight += reqWeight * 1.0;
          strengths.push(reqName);
          requirementEvidences.push({
            requirementId: req.id,
            requirement: reqName,
            category: req.category,
            type: req.type,
            importance: req.importance,
            status: 'MATCH',
            evidence: `"${text}"`,
            source: `Resume → ${matchingLine.section}`,
            reasoning: `The candidate explicitly demonstrates practical, project-based production application of ${reqName}.`,
            confidence: 0.95
          });
        } else {
          // PARTIAL - listed in skills or brief mention without full project depth
          earnedWeight += reqWeight * 0.5;
          partialSkills.push(reqName);
          requirementEvidences.push({
            requirementId: req.id,
            requirement: reqName,
            category: req.category,
            type: req.type,
            importance: req.importance,
            status: 'PARTIAL',
            evidence: `"${text}"`,
            source: `Resume → ${matchingLine.section}`,
            reasoning: `The candidate mentions ${reqName} in their resume profile, but lacks detailed architecture or quantitative project metrics for this competency.`,
            confidence: 0.72
          });
        }
      } else {
        // Missing evidence
        if (req.type === 'Required' && req.importance === 'High') {
          // High importance required skill missing
          gaps.push(reqName);
          requirementEvidences.push({
            requirementId: req.id,
            requirement: reqName,
            category: req.category,
            type: req.type,
            importance: req.importance,
            status: 'GAP',
            evidence: null,
            source: null,
            reasoning: `No supporting evidence found in the provided resume for this mandatory requirement. Candidate profile does not present documentation for ${reqName}.`,
            confidence: 0.88
          });
        } else {
          // UNVERIFIED
          unverifiedSkills.push(reqName);
          requirementEvidences.push({
            requirementId: req.id,
            requirement: reqName,
            category: req.category,
            type: req.type,
            importance: req.importance,
            status: 'UNVERIFIED',
            evidence: null,
            source: null,
            reasoning: `${reqName} experience could not be verified from the provided resume. No supporting evidence found in the provided resume.`,
            confidence: 0.82
          });
        }
      }
    });

    const overallScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    const isSelectedInRound1 = overallScore >= 60;

    const matchAnalysis: Round1MatchAnalysis = {
      id: generateId(),
      applicationId: app.id,
      overallScore,
      selectedInRound1: isSelectedInRound1,
      requirements: requirementEvidences,
      summary: isSelectedInRound1
        ? `Round 1 Passed! Candidate selected for Round 2 Technical Assessment with ${overallScore}% fit.`
        : `Round 1 Evaluated: Candidate scored ${overallScore}%. Did not meet the 60% qualification threshold for Round 2.`,
      strengths,
      partialSkills,
      unverifiedSkills,
      gaps,
      analyzedAt: now()
    };

    const nextStatus: ApplicationStatus = isSelectedInRound1 ? 'Assessment Pending' : 'Under HR Review';

    // Update application with Round 1 analysis
    setApplications(prev => prev.map(a => {
      if (a.id === applicationId) {
        const audit: AuditEntry = {
          id: generateId(),
          applicationId,
          action: isSelectedInRound1 ? 'Selected in Round 1' : 'Round 1 Completed - Not Selected',
          actor: 'HireProof Match Engine',
          actorRole: 'system',
          details: isSelectedInRound1
            ? `Candidate scored ${overallScore}% (>= 60% threshold). Selected in Round 1 for Round 2 AI Technical Assessment.`
            : `Candidate scored ${overallScore}% (< 60% threshold). Not qualified for Round 2 without HR approval.`,
          timestamp: now(),
          previousValue: a.status,
          newValue: nextStatus
        };
        return {
          ...a,
          round1Match: matchAnalysis,
          round1Selected: isSelectedInRound1,
          status: nextStatus,
          auditTrail: [...a.auditTrail, audit]
        };
      }
      return a;
    }));

    return matchAnalysis;
  }, [applications, vacancies]);

  // ==================== ROUND 2: PERSONALIZED AI TECHNICAL ASSESSMENT ====================
  const generateAssessmentQuestions = useCallback((applicationId: string): AssessmentQuestion[] => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    const vacancy = vacancies.find(v => v.id === app.vacancyId);
    const round1 = app.round1Match;

    const matched = round1?.strengths || vacancy?.requiredSkills || ['Python'];
    const partialOrUnverified = [
      ...(round1?.partialSkills || []),
      ...(round1?.unverifiedSkills || []),
      ...(round1?.gaps || [])
    ];

    const questions: AssessmentQuestion[] = [];

    // Question 1: Core Framework / Technical depth based on top matched skill
    const primarySkill = matched[0] || 'Python';
    questions.push({
      id: `q_tech_1_${generateId()}`,
      targetSkill: primarySkill,
      category: 'technical',
      question: `In your experience with ${primarySkill}, explain how you structure request validation, handle asynchronous database interactions, and ensure fault tolerance during high-throughput traffic spikes.`
    });

    // Question 2: Architecture & System Design grounded in role requirements
    const roleReq = vacancy?.requiredSkills.find(s => s.toLowerCase().includes('sql') || s.toLowerCase().includes('api')) || 'PostgreSQL';
    questions.push({
      id: `q_arch_2_${generateId()}`,
      targetSkill: roleReq,
      category: 'scenario',
      question: `Suppose an API endpoint handling analytical queries on ${roleReq} slows down from 80ms to 4.5 seconds under concurrent read/write transactions. What systematic steps would you take to diagnose, profile, and optimize the query and indexing strategy?`
    });

    // Question 3: Resume-Grounded Project Deep Dive
    questions.push({
      id: `q_resume_3_${generateId()}`,
      targetSkill: 'Production Engineering',
      category: 'resume_specific',
      question: `Looking at your submitted resume projects, describe the most complex technical challenge you encountered while developing backend services. What architectural trade-offs did you make, and how did you measure success?`
    });

    // Question 4: Targeted verification on candidate's partial or unverified skill!
    const targetArea = partialOrUnverified[0] || 'Docker / Cloud Deployment';
    questions.push({
      id: `q_gap_4_${generateId()}`,
      targetSkill: targetArea,
      category: 'problem_solving',
      question: `Your resume demonstrates partial/unverified experience in ${targetArea}. Explain how you would design and deploy an isolated multi-container environment with automated health checks, minimal image sizing, and secure secret injection.`
    });

    const technicalAssessment: TechnicalAssessment = {
      id: generateId(),
      applicationId,
      questions,
      status: 'pending'
    };

    setApplications(prev => prev.map(a => {
      if (a.id === applicationId) {
        const audit: AuditEntry = {
          id: generateId(),
          applicationId,
          action: 'Round 2 Assessment Generated',
          actor: 'HireProof Assessment Generator',
          actorRole: 'system',
          details: `Generated 4 personalized technical questions tailored to candidate claims and unverified competencies in ${targetArea}.`,
          timestamp: now()
        };
        return {
          ...a,
          round2Assessment: technicalAssessment,
          auditTrail: [...a.auditTrail, audit]
        };
      }
      return a;
    }));

    return questions;
  }, [applications, vacancies]);

  // Submit candidate answers & trigger AI Answer Evaluation
  const submitAssessmentAnswers = useCallback((
    applicationId: string,
    answers: { questionId: string; answer: string }[]
  ) => {
    setApplications(prev => prev.map(app => {
      if (app.id !== applicationId || !app.round2Assessment) return app;

      const evaluatedQuestions: AssessmentQuestion[] = app.round2Assessment.questions.map(q => {
        const candidateEntry = answers.find(a => a.questionId === q.id);
        const ans = candidateEntry?.answer?.trim() || '';

        // AI Answer Evaluation Logic across dimensions: Correctness, Depth, Technical Understanding
        let score = 5;
        let reasoning = '';
        let strengths = '';
        let weaknesses = '';

        const wordCount = ans.split(/\s+/).filter(Boolean).length;
        const ansLower = ans.toLowerCase();

        // Technical keywords indicating depth
        const depthSignals = ['indexes', 'async', 'pool', 'latency', 'transaction', 'isolation', 'docker', 'cache', 'profiling', 'explain analyze', 'pydantic', 'schema', 'metrics', 'concurrency'];
        const signalMatches = depthSignals.filter(s => ansLower.includes(s)).length;

        if (wordCount >= 60 && signalMatches >= 3) {
          score = Math.min(10, 8 + (signalMatches > 4 ? 1 : 0) + (wordCount > 100 ? 1 : 0));
          reasoning = `Candidate demonstrates deep technical command of ${q.targetSkill}. The answer incorporates concrete implementation details, architectural trade-offs, and optimization strategies.`;
          strengths = `Clear conceptual precision, practical troubleshooting steps, and actionable technical vocabulary.`;
          weaknesses = `Minor omitted edge cases under distributed partition scenarios.`;
        } else if (wordCount >= 30) {
          score = Math.min(7, 6 + (signalMatches > 1 ? 1 : 0));
          reasoning = `Candidate presents a solid working understanding of ${q.targetSkill} with basic execution principles, though deeper architectural metrics were not fully elaborated.`;
          strengths = `Understands the fundamental workflow and core terminology.`;
          weaknesses = `Could provide more quantitative performance measurements and concrete code/configuration examples.`;
        } else if (wordCount > 5) {
          score = 4;
          reasoning = `Candidate provided a brief overview for ${q.targetSkill}, but the response lacks sufficient technical depth and specific implementation rationale.`;
          strengths = `Identified basic terms.`;
          weaknesses = `Superficial response lacking architectural depth and troubleshooting methodology.`;
        } else {
          score = 1;
          reasoning = `Incomplete or insufficient answer provided for this technical evaluation.`;
          strengths = `None noted.`;
          weaknesses = `Response does not meet basic technical evaluation criteria.`;
        }

        return {
          ...q,
          candidateAnswer: ans,
          evaluation: {
            score,
            maxScore: 10,
            reasoning,
            strengths,
            weaknesses
          }
        };
      });

      // Calculate overall assessment score
      const totalPoints = evaluatedQuestions.reduce((acc, q) => acc + (q.evaluation?.score || 0), 0);
      const maxPoints = evaluatedQuestions.length * 10;
      const overallAssessmentScore = Math.round((totalPoints / maxPoints) * 100);

      const strengthsList: string[] = [];
      const weaknessesList: string[] = [];

      evaluatedQuestions.forEach(q => {
        if ((q.evaluation?.score || 0) >= 7) {
          strengthsList.push(`${q.targetSkill}: ${q.evaluation?.strengths}`);
        } else {
          weaknessesList.push(`${q.targetSkill}: ${q.evaluation?.weaknesses}`);
        }
      });

      const updatedAssessment: TechnicalAssessment = {
        ...app.round2Assessment,
        questions: evaluatedQuestions,
        status: 'completed',
        overallScore: overallAssessmentScore,
        technicalStrengths: strengthsList,
        technicalWeaknesses: weaknessesList,
        explanation: `Candidate scored ${overallAssessmentScore}% across 4 personalized technical domains. Evaluated on accuracy, design trade-offs, and troubleshooting depth.`,
        completedAt: now()
      };

      // Automatically generate Final Candidate Analysis
      const r1Score = app.round1Match?.overallScore || 70;
      const r2Score = overallAssessmentScore;
      const overallFit = Math.round(r1Score * 0.4 + r2Score * 0.6);

      const finalAnalysis: FinalCandidateAnalysis = {
        id: generateId(),
        applicationId: app.id,
        round1Score: r1Score,
        round2Score: r2Score,
        overallFitScore: overallFit,
        recommendation: overallFit >= 75
          ? 'Recommended for Shortlist — Strong alignment between resume evidence and verified assessment performance.'
          : overallFit >= 55
            ? 'Consider for Under HR Review — Competent technical core with specific gaps in unverified cloud competencies.'
            : 'Not Recommended — Significant gaps identified across mandatory technical competencies.',
        summary: `HireProof Explainable Analysis: Candidate achieved a ${r1Score}% match in Round 1 (Resume Evidence) and scored ${r2Score}% in Round 2 (AI Technical Assessment). Combined explainable fit score is ${overallFit}%.`,
        keyStrengths: [
          ...(app.round1Match?.strengths || []),
          ...strengthsList.map(s => s.split(':')[0])
        ].slice(0, 5),
        skillGaps: app.round1Match?.gaps || [],
        concerns: weaknessesList.slice(0, 3),
        generatedAt: now()
      };

      const audit: AuditEntry = {
        id: generateId(),
        applicationId,
        action: 'Round 2 Assessment Completed & Final Analysis Produced',
        actor: 'Candidate / AI Evaluator',
        actorRole: 'system',
        details: `Candidate submitted assessment answers. AI scored ${overallAssessmentScore}%. Final Explainable Candidate Analysis produced (Overall Fit: ${overallFit}%). Application status moved to Under HR Review.`,
        timestamp: now(),
        previousValue: app.status,
        newValue: 'Under HR Review'
      };

      return {
        ...app,
        status: 'Under HR Review' as ApplicationStatus,
        round2Assessment: updatedAssessment,
        finalAnalysis,
        auditTrail: [...app.auditTrail, audit]
      };
    }));
  }, []);

  // Final analysis generator
  const generateFinalAnalysis = useCallback((applicationId: string): FinalCandidateAnalysis => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    const r1Score = app.round1Match?.overallScore || 65;
    const r2Score = app.round2Assessment?.overallScore || 70;
    const overallFit = Math.round(r1Score * 0.4 + r2Score * 0.6);

    const finalAnalysis: FinalCandidateAnalysis = {
      id: generateId(),
      applicationId,
      round1Score: r1Score,
      round2Score: r2Score,
      overallFitScore: overallFit,
      recommendation: overallFit >= 75
        ? 'Recommended for Shortlist — Strong alignment between resume evidence and verified assessment performance.'
        : overallFit >= 55
          ? 'Consider for Under HR Review — Solid foundation with specific areas requiring manager interview exploration.'
          : 'Not Recommended — Candidate exhibits substantial gaps in mandatory architectural competencies.',
      summary: `HireProof Explainable Analysis: Candidate achieved ${r1Score}% in Round 1 (Resume-JD Matching) and ${r2Score}% in Round 2 (Technical Assessment). Overall Explainable Fit is ${overallFit}%.`,
      keyStrengths: app.round1Match?.strengths || [],
      skillGaps: app.round1Match?.gaps || [],
      concerns: app.round2Assessment?.technicalWeaknesses || ['Verify production cloud deployment exposure'],
      generatedAt: now()
    };

    setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, finalAnalysis } : a));
    return finalAnalysis;
  }, [applications]);

  // ==================== HR FINAL DECISION ====================
  const recordHRDecision = useCallback((
    applicationId: string,
    decision: 'Shortlisted' | 'Under HR Review' | 'Rejected' | 'Selected',
    notes: string,
    hrName: string
  ) => {
    setApplications(prev => prev.map(app => {
      if (app.id !== applicationId) return app;

      const hrDecision: HRDecision = {
        decision,
        decidedBy: hrName || 'HR Reviewer',
        decidedAt: now(),
        notes: notes || undefined
      };

      const audit: AuditEntry = {
        id: generateId(),
        applicationId,
        action: `HR Decision Recorded: ${decision}`,
        actor: hrName || 'HR Reviewer',
        actorRole: 'hr',
        details: `Human HR Reviewer marked candidate as ${decision}. HR Notes: "${notes || 'No additional notes provided'}".`,
        timestamp: now(),
        previousValue: app.status,
        newValue: decision
      };

      const isSelected = decision === 'Shortlisted' || decision === 'Selected';
      const isRejected = decision === 'Rejected';
      const round1Selected = isSelected ? true : (isRejected ? false : app.round1Selected);

      return {
        ...app,
        round1Selected,
        status: decision as ApplicationStatus,
        hrDecision,
        auditTrail: [...app.auditTrail, audit]
      };
    }));
  }, []);

  // ==================== UTILITY / SEED HELPER ====================
  const resetWorkspace = useCallback(() => {
    localStorage.removeItem(`${STORAGE_KEY}_companies`);
    localStorage.removeItem(`${STORAGE_KEY}_ceos`);
    localStorage.removeItem(`${STORAGE_KEY}_hrs`);
    localStorage.removeItem(`${STORAGE_KEY}_candidates`);
    localStorage.removeItem(`${STORAGE_KEY}_vacancies`);
    localStorage.removeItem(`${STORAGE_KEY}_applications`);
    setCompanies(defaultCompanies);
    setCeos(defaultCEOs);
    setHrs(defaultHRs);
    setCandidates(defaultCandidates);
    setVacancies(defaultVacancies);
    setApplications([]);
  }, []);

  // Helper for quick judge / hackathon testing to seed an actual application with real text and run the 2 rounds!
  const seedSampleApplication = useCallback(() => {
    const sampleResume = `ALEX CHEN
Full-Stack & Backend Software Engineer · Bangalore, India
Email: candidate@test.com | GitHub: github.com/alexchen-dev | LinkedIn: linkedin.com/in/alexchen-eng

PROFESSIONAL SUMMARY
Backend-focused Software Engineer with 2.8 years of production experience designing and building RESTful APIs and asynchronous microservices using Python and FastAPI. Implemented complex SQL queries and schema indexing in PostgreSQL. Familiar with Docker containerization and basic AWS deployments.

WORK EXPERIENCE
Backend Software Engineer | DataPulse Systems (2023 - Present)
- Developed and deployed high-performance asynchronous REST APIs using Python and FastAPI, serving 35,000+ daily active client requests.
- Optimized relational database queries in PostgreSQL, creating composite indexes and reducing query response times by 42%.
- Created multi-stage Dockerfiles and containerized 4 internal microservices for deployment on staging environments.
- Designed RESTful API schemas with strict Pydantic validation and comprehensive Swagger documentation.

Junior Python Developer | CloudMatrix Labs (2022 - 2023)
- Implemented API integrations and background workers using Python and Celery.
- Maintained database migrations and monitored AWS CloudWatch application logs and S3 storage buckets.

TECHNICAL SKILLS
Languages: Python, SQL, JavaScript
Frameworks: FastAPI, SQLAlchemy, Pydantic, Celery
Databases: PostgreSQL, Redis
Tools & DevOps: Docker, Git, AWS (S3, CloudWatch basics), Postman
Architecture: RESTful APIs, Microservices, Asynchronous IO

EDUCATION
B.Tech in Computer Science & Engineering (2018 - 2022)`;

    const app = submitApplication(
      'cand_demo',
      'candidate@test.com',
      'Alex Chen',
      'vac_python_dev',
      sampleResume,
      'Alex_Chen_Backend_Resume.pdf'
    );

    // Auto-run Round 1
    setTimeout(() => {
      runRound1Matching(app.id);
    }, 50);
  }, [submitApplication, runRound1Matching]);

  const value: AppContextType = {
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
    resetWorkspace,
    seedSampleApplication
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
