import { apiClient } from './client';
import type { ApplicationResponse, FeedbackResponse } from './hr';

export interface PublicDepartmentResponse {
  id: number;
  company_id: number;
  name: string;
}

export interface PublicCompanyResponse {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  departments: PublicDepartmentResponse[];
}

export interface PublicVacancyResponse {
  id: number;
  company_id: number;
  department_id: number;
  title: string;
  description: string;
  required_experience: string;
  education: string;
  required_skills: string[];
  preferred_skills: string[];
  other_requirements?: string | null;
  status: string;
  created_at: string;
  company_name: string;
  department_name?: string | null;
}

export interface CandidateProfileResponse {
  id: number;
  user_id: number;
  name: string;
  github_url?: string | null;
  linkedin_url?: string | null;
  email: string;
  created_at: string;
}

export interface CandidateProfileUpdatePayload {
  name?: string;
  github_url?: string | null;
  linkedin_url?: string | null;
}

export interface CandidateApplicationDetailResponse {
  id: number;
  vacancy_id: number;
  candidate_id: number;
  status: string;
  applied_at: string;
  updated_at: string;
  resume_filename?: string | null;
  resume_mime_type?: string | null;
  extracted_text_preview?: string | null;
  candidate_name: string;
  candidate_email: string;
  candidate_github?: string | null;
  candidate_linkedin?: string | null;
  vacancy_title?: string | null;
  company_name?: string | null;
}

export const candidateApi = {
  async listCompanies(): Promise<PublicCompanyResponse[]> {
    return apiClient<PublicCompanyResponse[]>('/companies');
  },

  async listCompanyVacancies(companyId: number): Promise<PublicVacancyResponse[]> {
    return apiClient<PublicVacancyResponse[]>(`/companies/${companyId}/vacancies`);
  },

  async getProfile(): Promise<CandidateProfileResponse> {
    return apiClient<CandidateProfileResponse>('/candidate/profile');
  },

  async updateProfile(payload: CandidateProfileUpdatePayload): Promise<CandidateProfileResponse> {
    return apiClient<CandidateProfileResponse>('/candidate/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async applyForVacancy(vacancyId: number, resumeFile: File): Promise<ApplicationResponse> {
    const formData = new FormData();
    formData.append('vacancy_id', vacancyId.toString());
    formData.append('resume_file', resumeFile);

    return apiClient<ApplicationResponse>('/candidate/applications', {
      method: 'POST',
      body: formData,
    });
  },

  async listMyApplications(): Promise<ApplicationResponse[]> {
    return apiClient<ApplicationResponse[]>('/candidate/applications');
  },

  async getMyApplicationDetail(applicationId: number): Promise<CandidateApplicationDetailResponse> {
    return apiClient<CandidateApplicationDetailResponse>(`/candidate/applications/${applicationId}`);
  },

  async getApplicationFeedback(applicationId: number): Promise<FeedbackResponse[]> {
    return apiClient<FeedbackResponse[]>(`/candidate/applications/${applicationId}/feedback`);
  },
};
