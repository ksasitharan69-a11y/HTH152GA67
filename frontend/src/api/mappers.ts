import type {
  Company,
  Department,
  HR,
  CEO,
  Candidate,
  Vacancy,
  StructuredRequirement,
  Application,
  ApplicationStatus,
  Round1MatchAnalysis,
  RequirementEvidence,
  MatchStatus,
  TechnicalAssessment,
  AssessmentQuestion,
  FinalCandidateAnalysis,
  AuditEntry,
} from '../types';
import type { CompanyResponse, HRResponse } from './ceo';
import type { PublicCompanyResponse, PublicVacancyResponse } from './candidate';
import type { VacancyResponse, ApplicationResponse, JobRequirementResponse } from './hr';
import type { ApplicationDetailResponse, RequirementMatchItem } from './applications';
import type { FinalAnalysisResponse } from './ai';
import type { AssessmentResponse, AssessmentResultResponse } from './assessments';

export function mapBackendStatusToFrontend(backendStatus: string): ApplicationStatus {
  const s = (backendStatus || '').toUpperCase();
  switch (s) {
    case 'APPLIED':
      return 'Applied';
    case 'UNDER_REVIEW':
      return 'Under HR Review';
    case 'VERIFICATION_REQUIRED':
    case 'ASSESSMENT':
      return 'Assessment Pending';
    case 'SHORTLISTED':
      return 'Shortlisted';
    case 'SELECTED':
      return 'Selected';
    case 'NOT_SELECTED':
    case 'REJECTED':
      return 'Rejected';
    default:
      return 'Applied';
  }
}

export function mapFrontendStatusToBackend(frontendStatus: string): string {
  switch (frontendStatus) {
    case 'Applied':
      return 'APPLIED';
    case 'Under HR Review':
      return 'UNDER_REVIEW';
    case 'Assessment Pending':
      return 'ASSESSMENT';
    case 'Shortlisted':
      return 'SHORTLISTED';
    case 'Selected':
      return 'SELECTED';
    case 'Rejected':
      return 'NOT_SELECTED';
    default:
      return 'APPLIED';
  }
}

export function mapMatchStatus(status: string): MatchStatus {
  const s = (status || '').toUpperCase();
  if (s === 'VERIFIED' || s === 'MATCH') return 'MATCH';
  if (s === 'PARTIAL') return 'PARTIAL';
  if (s === 'GAP') return 'GAP';
  return 'UNVERIFIED';
}

export function mapCompany(c: CompanyResponse | PublicCompanyResponse): Company {
  return {
    id: String(c.id),
    name: c.name,
    ceoId: 'ceo_id' in c ? String((c as any).ceo_user_id) : '',
    departments: (c.departments || []).map((d: any) => d.name),
    description: `${c.name} organization`,
    industry: 'Technology',
    location: 'Global',
    website: '',
  };
}

export function mapHR(hr: HRResponse): HR {
  return {
    id: String(hr.id),
    name: hr.name,
    email: hr.email,
    password: '',
    department: hr.department_name || 'General',
    companyId: String(hr.company_id),
    companyName: hr.company_name,
  };
}

export function mapVacancy(v: VacancyResponse | PublicVacancyResponse): Vacancy {
  const reqs = 'requirements' in v && Array.isArray((v as any).requirements) ? (v as any).requirements : [];

  const structuredRequirements: StructuredRequirement[] = reqs.map((r: JobRequirementResponse) => ({
    id: String(r.id),
    name: r.requirement_text,
    description: r.requirement_text,
    category: r.requirement_type || 'Skill',
    type: r.importance === 'MANDATORY' ? 'Required' : 'Preferred',
    importance: r.importance === 'HIGH' ? 'High' : r.importance === 'MEDIUM' ? 'Medium' : 'Low',
    expectedExperience: v.required_experience,
  }));

  return {
    id: String(v.id),
    title: v.title,
    department: v.department_name || 'General',
    companyId: String(v.company_id),
    companyName: v.company_name || 'Organization',
    hrId: 'created_by_hr_id' in v ? String((v as any).created_by_hr_id) : '',
    jobDescription: v.description,
    responsibilities: v.description,
    technicalRequirements: v.description,
    location: 'Hybrid / Remote',
    workMode: 'Hybrid',
    requiredSkills: v.required_skills || [],
    preferredSkills: v.preferred_skills || [],
    requiredExperience: v.required_experience || '2+ years',
    education: v.education || 'Relevant Degree or Experience',
    otherRequirements: v.other_requirements || '',
    structuredRequirements,
    status: v.status === 'PUBLISHED' ? 'active' : 'closed',
    createdAt: v.created_at || new Date().toISOString(),
    applicantCount: 0,
  };
}

export function mapMatchItemsToRound1(
  applicationId: string,
  overallScore: number,
  matchItems: RequirementMatchItem[],
  analyzedAt?: string
): Round1MatchAnalysis {
  const requirements: RequirementEvidence[] = matchItems.map((mr) => ({
    requirementId: String(mr.requirement_id),
    requirement: mr.requirement,
    category: mr.type,
    type: mr.importance === 'MANDATORY' ? 'Required' : 'Preferred',
    importance: mr.importance === 'HIGH' ? 'High' : mr.importance === 'MEDIUM' ? 'Medium' : 'Low',
    status: mapMatchStatus(mr.status),
    evidence: mr.evidence && mr.evidence.length > 0 ? mr.evidence[0].source_text : null,
    source: mr.evidence && mr.evidence.length > 0 ? mr.evidence[0].source_type : null,
    reasoning: mr.reasoning || '',
    confidence: mr.confidence || 0.8,
  }));

  const strengths = requirements.filter((r) => r.status === 'MATCH').map((r) => r.requirement);
  const partialSkills = requirements.filter((r) => r.status === 'PARTIAL').map((r) => r.requirement);
  const unverifiedSkills = requirements.filter((r) => r.status === 'UNVERIFIED').map((r) => r.requirement);
  const gaps = requirements.filter((r) => r.status === 'GAP').map((r) => r.requirement);

  return {
    id: `r1_${applicationId}`,
    applicationId,
    overallScore: Math.round(overallScore || 0),
    selectedInRound1: overallScore >= 60,
    requirements,
    summary: `Verified candidate evaluation: ${strengths.length} verified competencies, ${partialSkills.length} partial, and ${gaps.length} gaps identified with concrete citation evidence.`,
    strengths,
    partialSkills,
    unverifiedSkills,
    gaps,
    analyzedAt: analyzedAt || new Date().toISOString(),
  };
}

export function mapAssessmentToTechnicalAssessment(
  assessment: AssessmentResponse | AssessmentResultResponse
): TechnicalAssessment {
  const drillDownQuestions = 'drill_down_questions' in assessment ? assessment.drill_down_questions || [] : [];
  const brokenCode = 'broken_code_snippet' in assessment ? assessment.broken_code_snippet : '';
  const fb = assessment.findings_breakdown;
  const isCompleted = assessment.status === 'EVALUATED' || (assessment.score !== undefined && assessment.score !== null && assessment.score > 0);

  const questions: AssessmentQuestion[] = drillDownQuestions.map((q, idx) => {
    let evaluation = undefined;
    if (fb?.question_evaluations?.[idx]) {
      evaluation = {
        score: fb.question_evaluations[idx].score || 8,
        maxScore: 10,
        reasoning: fb.question_evaluations[idx].reasoning || 'Evaluated by Gemini rubric',
        strengths: fb.question_evaluations[idx].strengths || '',
        weaknesses: fb.question_evaluations[idx].weaknesses || '',
      };
    } else if (fb?.resume_authenticity && isCompleted) {
      const authScore = Math.max(1, Math.min(10, Math.round((fb.resume_authenticity.score || 80) / 10)));
      evaluation = {
        score: authScore,
        maxScore: 10,
        reasoning: fb.resume_authenticity.notes || 'Evaluated for practical implementation depth.',
        strengths: (fb.resume_authenticity.score || 0) >= 70 ? 'Demonstrated authentic first-hand experience' : '',
        weaknesses: (fb.resume_authenticity.score || 0) < 70 ? 'Implementation explanation lacked depth' : '',
      };
    }

    return {
      id: `q_${idx + 1}`,
      question: q,
      targetSkill: 'Technical Competency Drill-Down',
      category: 'problem_solving',
      evaluation,
    };
  });

  if (brokenCode) {
    let codeEval = undefined;
    if (fb?.code_review) {
      codeEval = {
        score: fb.code_review.score || 8,
        maxScore: 10,
        reasoning: fb.code_review.reasoning || '',
        strengths: '',
        weaknesses: '',
      };
    } else if ((fb?.error_handling_bug || fb?.concurrency_race_condition) && isCompleted) {
      const b1Score = fb.error_handling_bug?.score || 50;
      const b2Score = fb.concurrency_race_condition?.score || 50;
      const combinedScore = Math.max(1, Math.min(10, Math.round(((b1Score + b2Score) / 2) / 10)));

      const caughtList = [];
      const missedList = [];
      if (fb.error_handling_bug?.identified) caughtList.push('Caught error handling / rollback bug');
      else missedList.push('Missed error handling / rollback bug');

      if (fb.concurrency_race_condition?.identified) caughtList.push('Caught race condition / concurrency bug');
      else missedList.push('Missed race condition / concurrency bug');

      codeEval = {
        score: combinedScore,
        maxScore: 10,
        reasoning: `${fb.error_handling_bug?.notes || ''} ${fb.concurrency_race_condition?.notes || ''}`.trim() || 'Evaluated code challenge bug diagnosis.',
        strengths: caughtList.join('; '),
        weaknesses: missedList.join('; '),
      };
    }

    questions.push({
      id: `q_code_review`,
      question: `Production Code Review & Bug Diagnosis Challenge:\n\n${brokenCode}`,
      targetSkill: 'Debugging & Code Review',
      category: 'technical',
      evaluation: codeEval,
    });
  }

  return {
    id: String(assessment.id),
    applicationId: String(assessment.application_id),
    questions,
    status: isCompleted ? 'completed' : 'pending',
    overallScore: assessment.score || 0,
    technicalStrengths: assessment.findings_breakdown?.strengths || [],
    technicalWeaknesses: assessment.findings_breakdown?.gaps || [],
    explanation: assessment.audit_justification || `Assessment evaluated with score ${assessment.score || 0}/100. Verdict: ${assessment.verdict || 'PENDING'}.`,
    completedAt: assessment.evaluated_at || undefined,
  };
}

export function mapApplication(
  app: ApplicationResponse | ApplicationDetailResponse,
  analysis?: FinalAnalysisResponse | null,
  assessment?: AssessmentResponse | AssessmentResultResponse | null
): Application {
  const appId = String(app.id);

  let round1Match: Round1MatchAnalysis | undefined = undefined;
  if (analysis && analysis.requirement_matches) {
    round1Match = mapMatchItemsToRound1(
      appId,
      analysis.overall_score,
      analysis.requirement_matches
    );
  } else if ('match_results' in app && Array.isArray((app as any).match_results) && (app as any).match_results.length > 0) {
    const results = (app as any).match_results as RequirementMatchItem[];
    const verifiedCount = results.filter((r) => r.status === 'VERIFIED').length;
    const score = results.length > 0 ? Math.round((verifiedCount / results.length) * 100) : 0;
    round1Match = mapMatchItemsToRound1(appId, score, results);
  }

  let round2Assessment: TechnicalAssessment | undefined = undefined;
  if (assessment) {
    round2Assessment = mapAssessmentToTechnicalAssessment(assessment);
  }

  let finalAnalysis: FinalCandidateAnalysis | undefined = undefined;
  if (round1Match) {
    const r1Score = round1Match.overallScore;
    const r2Score = round2Assessment?.overallScore || 0;
    const overallFit = round2Assessment ? Math.round(r1Score * 0.4 + r2Score * 0.6) : r1Score;

    finalAnalysis = {
      id: `fa_${appId}`,
      applicationId: appId,
      round1Score: r1Score,
      round2Score: r2Score,
      overallFitScore: overallFit,
      recommendation: analysis?.final_recommendation || (overallFit >= 60 ? 'RECOMMENDED' : 'FURTHER REVIEW REQUIRED'),
      summary: analysis?.final_recommendation || round1Match.summary,
      keyStrengths: round1Match.strengths,
      skillGaps: round1Match.gaps,
      concerns: [],
      generatedAt: round1Match.analyzedAt,
    };
  }

  const auditTrail: AuditEntry[] = [];
  if (app.applied_at) {
    auditTrail.push({
      id: `audit_apply_${appId}`,
      applicationId: appId,
      action: 'Application Submitted',
      actor: app.candidate_name,
      actorRole: 'candidate',
      details: `Candidate applied with resume (${app.resume_filename || 'Uploaded Document'}). Resume text extracted and sent to AI evaluation pipeline.`,
      timestamp: app.applied_at,
    });
  }

  if (round1Match) {
    auditTrail.push({
      id: `audit_match_${appId}`,
      applicationId: appId,
      action: 'AI Evidence Match Generated',
      actor: 'Gemini AI Evaluator',
      actorRole: 'system',
      details: `Analyzed resume against vacancy requirements. Score: ${round1Match.overallScore}/100 with ${round1Match.strengths.length} verified competencies and ${round1Match.gaps.length} gaps.`,
      timestamp: round1Match.analyzedAt,
    });
  }

  if (analysis?.hr_challenges && analysis.hr_challenges.length > 0) {
    analysis.hr_challenges.forEach((ch: any, idx: number) => {
      auditTrail.push({
        id: `audit_challenge_${appId}_${idx}`,
        applicationId: appId,
        action: 'Recruiter Override Recorded',
        actor: 'HR Reviewer',
        actorRole: 'hr',
        details: `Human override: ${ch.reason || 'Requirement status updated'}. New Status: ${ch.new_status || 'OVERRIDDEN'}.`,
        timestamp: ch.created_at || new Date().toISOString(),
      });
    });
  }

  return {
    id: appId,
    candidateId: String(app.candidate_id),
    candidateEmail: 'candidate_email' in app && (app as any).candidate_email ? (app as any).candidate_email : 'candidate@hireproof.ai',
    candidateName: app.candidate_name,
    vacancyId: String(app.vacancy_id),
    companyId: 'company_id' in app ? String((app as any).company_id) : '1',
    companyName: app.company_name,
    role: app.vacancy_title,
    resumeFile: app.resume_filename || undefined,
    status: mapBackendStatusToFrontend(app.status),
    appliedAt: app.applied_at,
    round1Match,
    round1Selected: round1Match ? round1Match.overallScore >= 60 : undefined,
    round2Assessment,
    finalAnalysis,
    auditTrail,
  };
}
