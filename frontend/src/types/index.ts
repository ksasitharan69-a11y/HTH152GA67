// ==================== User Types ====================

export type UserRole = 'ceo' | 'hr' | 'candidate';

export interface CEO {
  id: string;
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyId: string;
  verified: boolean;
}

export interface HR {
  id: string;
  name: string;
  email: string;
  password: string;
  department: string;
  companyId: string;
  companyName: string;
}

export interface Candidate {
  id: string;
  email: string;
  password: string;
  name?: string;
  githubProfile?: string;
  linkedinProfile?: string;
  verified: boolean;
}

// ==================== Company & Department ====================

export interface Company {
  id: string;
  name: string;
  ceoId: string;
  departments: string[];
  description?: string;
  industry?: string;
  location?: string;
  website?: string;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
}

// ==================== Vacancy & Structured Requirements ====================

export interface StructuredRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'Required' | 'Preferred';
  importance: 'High' | 'Medium' | 'Low';
  expectedExperience?: string;
  semanticKeywords?: string[];
}

export interface Vacancy {
  id: string;
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
  structuredRequirements: StructuredRequirement[];
  status: 'active' | 'closed';
  createdAt: string;
  applicantCount: number;
}

// ==================== Application Workflow ====================

export type ApplicationStatus =
  | 'Applied'
  | 'Screening'
  | 'Assessment Pending'
  | 'Assessment Completed'
  | 'Under HR Review'
  | 'Shortlisted'
  | 'Rejected'
  | 'Selected';

export interface Application {
  id: string;
  candidateId: string;
  candidateEmail: string;
  candidateName?: string;
  vacancyId: string;
  companyId: string;
  companyName: string;
  role: string;
  resumeFile?: string;
  resumeContent?: string;
  status: ApplicationStatus;
  appliedAt: string;

  // Round 1: Resume-JD Matching
  round1Match?: Round1MatchAnalysis;
  round1Selected?: boolean;

  // Round 2: AI Technical Assessment
  round2Assessment?: TechnicalAssessment;

  // Final Combined Explainable Analysis
  finalAnalysis?: FinalCandidateAnalysis;

  // HR Final Decision
  hrDecision?: HRDecision;

  // Explainable Audit Trail
  auditTrail: AuditEntry[];
}

// ==================== ROUND 1: Resume–JD Matching ====================

export type MatchStatus = 'MATCH' | 'PARTIAL' | 'UNVERIFIED' | 'GAP';

export interface RequirementEvidence {
  requirementId: string;
  requirement: string;
  category?: string;
  type?: 'Required' | 'Preferred';
  importance?: 'High' | 'Medium' | 'Low';
  status: MatchStatus;
  evidence: string | null;
  source: string | null;
  reasoning: string;
  confidence: number;
}

export interface Round1MatchAnalysis {
  id: string;
  applicationId: string;
  overallScore: number; // 0 - 100
  selectedInRound1?: boolean;
  requirements: RequirementEvidence[];
  summary: string;
  strengths: string[];
  partialSkills: string[];
  unverifiedSkills: string[];
  gaps: string[];
  analyzedAt: string;
}

// ==================== ROUND 2: AI Technical Assessment ====================

export interface AssessmentQuestion {
  id: string;
  question: string;
  targetSkill: string;
  category: 'technical' | 'scenario' | 'problem_solving' | 'resume_specific';
  candidateAnswer?: string;
  evaluation?: {
    score: number; // 0 - 10
    maxScore: number;
    reasoning: string;
    strengths: string;
    weaknesses: string;
  };
}

export interface TechnicalAssessment {
  id: string;
  applicationId: string;
  questions: AssessmentQuestion[];
  status: 'pending' | 'in_progress' | 'completed';
  overallScore?: number; // 0 - 100
  technicalStrengths?: string[];
  technicalWeaknesses?: string[];
  explanation?: string;
  completedAt?: string;
}

// ==================== FINAL ANALYSIS ====================

export interface FinalCandidateAnalysis {
  id: string;
  applicationId: string;
  round1Score: number;
  round2Score: number;
  overallFitScore: number; // 0 - 100
  recommendation: string;
  summary: string;
  keyStrengths: string[];
  skillGaps: string[];
  concerns: string[];
  generatedAt: string;
}

// ==================== HR Decision ====================

export interface HRDecision {
  decision: 'Shortlisted' | 'Under HR Review' | 'Rejected' | 'Selected';
  decidedBy: string;
  decidedAt: string;
  notes?: string;
}

// ==================== Audit Trail ====================

export interface AuditEntry {
  id: string;
  applicationId: string;
  action: string;
  actor: string;
  actorRole: UserRole | 'system';
  details: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}

// ==================== Auth State ====================

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  user: CEO | HR | Candidate | null;
}
