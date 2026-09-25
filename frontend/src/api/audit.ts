import { apiClient } from './client';
import type { FinalAnalysisResponse } from './ai';

export interface AuditOverridePayload {
  requirement_id?: number | null;
  original_status?: string | null;
  new_status: string;
  reason: string;
}

export interface AuditOverrideResponse {
  id: number;
  application_id: number;
  requirement_id?: number | null;
  original_status?: string | null;
  new_status: string;
  reason: string;
  hr_user_id: number;
  created_at: string;
}

export interface AuditDefenseQueryRequest {
  question: string;
}

export interface AuditDefenseQueryResponse {
  application_id: number;
  question: string;
  answer: string;
  referenced_requirements: string[];
  referenced_evidence_ids: number[];
  referenced_overrides: any[];
  assessment_finding?: string | null;
}

export const auditApi = {
  async getAuditTrail(applicationId: number): Promise<FinalAnalysisResponse> {
    return apiClient<FinalAnalysisResponse>(`/audit/${applicationId}`);
  },

  async recordOverride(applicationId: number, payload: AuditOverridePayload): Promise<AuditOverrideResponse> {
    return apiClient<AuditOverrideResponse>(`/audit/${applicationId}/override`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async askAuditDefense(applicationId: number, question: string): Promise<AuditDefenseQueryResponse> {
    return apiClient<AuditDefenseQueryResponse>(`/audit/${applicationId}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },
};
