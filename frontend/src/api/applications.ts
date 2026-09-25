import { apiClient } from './client';
import type { ApplicationResponse } from './hr';

export interface EvidenceResponseItem {
  id: number;
  source_type: string;
  source_text: string;
  source_location?: string | null;
  confidence: number;
}

export interface RequirementMatchItem {
  requirement_id: number;
  requirement: string;
  type: string;
  importance: string;
  status: string;
  evidence: EvidenceResponseItem[];
  reasoning: string;
  confidence: number;
}

export interface ApplicationDetailResponse {
  id: number;
  vacancy_id: number;
  candidate_id: number;
  status: string;
  applied_at: string;
  updated_at: string;
  resume_filename?: string | null;
  vacancy_title: string;
  company_name: string;
  candidate_name: string;
  candidate_email: string;
  candidate_github?: string | null;
  candidate_linkedin?: string | null;
  match_results: RequirementMatchItem[];
}

export const applicationsApi = {
  async submitApplication(vacancyId: number, resumeFile: File): Promise<ApplicationResponse> {
    const formData = new FormData();
    formData.append('vacancy_id', vacancyId.toString());
    formData.append('resume_file', resumeFile);

    return apiClient<ApplicationResponse>('/applications', {
      method: 'POST',
      body: formData,
    });
  },

  async listApplications(): Promise<ApplicationResponse[]> {
    return apiClient<ApplicationResponse[]>('/applications');
  },

  async getApplication(applicationId: number): Promise<ApplicationDetailResponse> {
    return apiClient<ApplicationDetailResponse>(`/applications/${applicationId}`);
  },
};
