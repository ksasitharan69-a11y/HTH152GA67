import { apiClient } from './client';

export interface AssessmentResponse {
  id: number;
  application_id: number;
  drill_down_questions: string[];
  broken_code_snippet: string;
  status: string;
  score?: number | null;
  verdict?: string | null;
  findings_breakdown?: Record<string, any> | null;
  audit_justification?: string | null;
  created_at: string;
  evaluated_at?: string | null;
}

export interface AssessmentSubmitPayload {
  drill_down_responses: Record<string, string>;
  code_review_response: string;
}

export interface AssessmentResultResponse {
  id: number;
  application_id: number;
  score: number;
  verdict: string;
  status: string;
  findings_breakdown?: Record<string, any> | null;
  audit_justification?: string | null;
  evaluated_at?: string | null;
}

export const assessmentsApi = {
  async generateAssessment(applicationId: number): Promise<AssessmentResponse> {
    return apiClient<AssessmentResponse>(`/assessments/${applicationId}/generate`, {
      method: 'POST',
    });
  },

  async getAssessment(applicationId: number): Promise<AssessmentResponse> {
    return apiClient<AssessmentResponse>(`/assessments/${applicationId}`);
  },

  async submitAssessment(applicationId: number, payload: AssessmentSubmitPayload): Promise<AssessmentResultResponse> {
    return apiClient<AssessmentResultResponse>(`/assessments/${applicationId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAssessmentResult(applicationId: number): Promise<AssessmentResultResponse> {
    return apiClient<AssessmentResultResponse>(`/assessments/${applicationId}/result`);
  },
};
