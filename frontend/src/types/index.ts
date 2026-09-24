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
  githubProfile?: string;
  linkedinProfile?: string;
  verified: boolean;
  name?: string;
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
  logo?: string;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
}

// ==================== Vacancy ====================

export interface Vacancy {
  id: string;
  title: string;
  department: string;
  companyId: string;
  companyName: string;
  hrId: string;
  jobDescription: string;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredExperience: string;
  education: string;
  otherRequirements: string;
  status: 'active' | 'closed';
  createdAt: string;
  applicantCount: number;
}

// ==================== Application ====================

export type ApplicationStatus =
  | 'Applied'
  | 'Under Review'
  | 'Verification Required'
  | 'Assessment'
  | 'Shortlisted'
  | 'Selected'
  | 'Not Selected';

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
  aiAnalysis?: AIAnalysis;
  auditTrail: AuditEntry[];
}

// ==================== AI Matching ====================

export type RequirementStatus = 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED' | 'GAP';

export type VerificationMethod =
  | 'resume'
  | 'assessment'
  | 'interview'
  | 'evidence_upload'
  | 'work_sample'
  | 'hr_override';

export interface RequirementEvidence {
  requirementId: string;
  requirement: string;
  status: RequirementStatus;
  evidence: string;
  evidenceSource: string;
  aiReasoning: string;
  verificationMethod?: VerificationMethod;
  verificationResult?: string;
  verificationDetails?: string;
  hrOverride?: HROverride;
}

export interface AIAnalysis {
  id: string;
  applicationId: string;
  overallScore: number;
  requirements: RequirementEvidence[];
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  analyzedAt: string;
}

// ==================== Verification ====================

export interface VerificationChallenge {
  id: string;
  applicationId: string;
  requirementId: string;
  requirement: string;
  type: 'challenge' | 'interview' | 'evidence_upload' | 'work_sample';
  question: string;
  candidateAnswer?: string;
  aiEvaluation?: string;
  evaluationResult?: 'Strong Evidence' | 'Partial Evidence' | 'Insufficient Evidence';
  status: 'pending' | 'submitted' | 'evaluated';
  createdAt: string;
}

// ==================== HR Override ====================

export interface HROverride {
  originalStatus: RequirementStatus;
  newStatus: RequirementStatus;
  reason: string;
  overriddenBy: string;
  overriddenAt: string;
}

// ==================== Audit Trail ====================

export interface AuditEntry {
  id: string;
  applicationId: string;
  action: string;
  actor: string;
  actorRole: UserRole;
  details: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}

// ==================== Auth Context ====================

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  user: CEO | HR | Candidate | null;
}
