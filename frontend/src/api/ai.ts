import { apiClient } from './client';
import type { RequirementMatchItem, EvidenceResponseItem } from './applications';

export interface ApplicationAnalysisResponse {
  application_id: number;
  overall_score: number;
  analyzed_at: string;
  requirement_matches: RequirementMatchItem[];
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface EvidenceGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface FinalAnalysisResponse {
  application_id: number;
  candidate_name: string;
  vacancy_title: string;
  company_name: string;
  overall_score: number;
  match_status_summary: {
    verified: number;
    partial: number;
    unverified: number;
    gap: number;
  };
  requirement_matches: RequirementMatchItem[];
  evidence_graph: EvidenceGraphResponse;
  verification_history: any[];
  hr_challenges: any[];
  final_recommendation: string;
  audit_defense_available: boolean;
}

export interface ProveRequirementResponse {
  requirement_id: number;
  requirement_text: string;
  current_status: string;
  recommended_method: 'AI_CHALLENGE' | 'AI_INTERVIEW' | 'DOCUMENT_UPLOAD';
  rationale: string;
}

export interface VerificationChallengeRequest {
  application_id: number;
  requirement_id: number;
}

export interface VerificationChallengeResponse {
  challenge_id: string;
  application_id: number;
  requirement_id: number;
  challenge_type: string;
  title: string;
  problem_statement: string;
  starter_code?: string | null;
  evaluation_criteria: string[];
}

export interface VerificationInterviewQuestionRequest {
  application_id: number;
  requirement_id: number;
}

export interface VerificationInterviewQuestionResponse {
  question_id: string;
  application_id: number;
  requirement_id: number;
  question: string;
  context: string;
  suggested_focus_areas: string[];
}

export interface CandidateAnswerEvaluationRequest {
  application_id: number;
  requirement_id: number;
  question: string;
  candidate_answer: string;
}

export interface CandidateAnswerEvaluationResponse {
  application_id: number;
  requirement_id: number;
  technical_depth_score: number;
  evidence_evaluation: 'STRONG_EVIDENCE' | 'PARTIAL_EVIDENCE' | 'INSUFFICIENT_EVIDENCE';
  reasoning: string;
  new_match_status: string;
  status_updated: boolean;
}

export const aiApi = {
  async analyzeApplication(applicationId: number): Promise<ApplicationAnalysisResponse> {
    return apiClient<ApplicationAnalysisResponse>(`/ai/applications/${applicationId}/analyze`, {
      method: 'POST',
    });
  },

  async getEvidenceGraph(applicationId: number): Promise<EvidenceGraphResponse> {
    return apiClient<EvidenceGraphResponse>(`/ai/applications/${applicationId}/evidence-graph`);
  },

  async getFinalAnalysis(applicationId: number): Promise<FinalAnalysisResponse> {
    return apiClient<FinalAnalysisResponse>(`/ai/applications/${applicationId}/final-analysis`);
  },

  async getRequirements(applicationId: number): Promise<any[]> {
    return apiClient<any[]>(`/ai/requirements/${applicationId}`);
  },

  async getEvidence(applicationId: number): Promise<EvidenceResponseItem[]> {
    return apiClient<EvidenceResponseItem[]>(`/ai/evidence/${applicationId}`);
  },

  async proveRequirement(applicationId: number, requirementId: number): Promise<ProveRequirementResponse> {
    return apiClient<ProveRequirementResponse>(`/ai/applications/${applicationId}/requirements/${requirementId}/prove`, {
      method: 'POST',
    });
  },

  async generateChallenge(payload: VerificationChallengeRequest): Promise<VerificationChallengeResponse> {
    return apiClient<VerificationChallengeResponse>('/ai/verification/challenge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async generateInterviewQuestion(payload: VerificationInterviewQuestionRequest): Promise<VerificationInterviewQuestionResponse> {
    return apiClient<VerificationInterviewQuestionResponse>('/ai/verification/interview-question', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async evaluateAnswer(payload: CandidateAnswerEvaluationRequest): Promise<CandidateAnswerEvaluationResponse> {
    return apiClient<CandidateAnswerEvaluationResponse>('/ai/verification/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
