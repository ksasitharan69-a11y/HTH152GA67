import { apiClient } from './client';

export interface HRProfileResponse {
  id: number;
  name: string;
  email: string;
  company: { id: number; name: string };
  department: { id: number; name: string };
}

export interface RecentApplicationItem {
  application_id: number;
  candidate_name: string;
  vacancy_title: string;
  status: string;
  applied_at: string;
}

export interface HRDashboardResponse {
  company_name: string;
  department_name: string;
  active_vacancies_count: number;
  total_applicants_count: number;
  recent_applications: RecentApplicationItem[];
}

export interface JobRequirementResponse {
  id: number;
  vacancy_id: number;
  requirement_text: string;
  requirement_type: string;
  importance: string;
  created_at: string;
}

export interface VacancyCreatePayload {
  department_id: number;
  title: string;
  description: string;
  required_experience: string;
  education: string;
  required_skills: string[];
  preferred_skills: string[];
  other_requirements?: string;
}

export interface VacancyResponse {
  id: number;
  company_id: number;
  department_id: number;
  created_by_hr_id: number;
  title: string;
  description: string;
  required_experience: string;
  education: string;
  required_skills: string[];
  preferred_skills: string[];
  other_requirements?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  department_name?: string | null;
  requirements: JobRequirementResponse[];
}

export interface ApplicationResponse {
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
  has_analysis: boolean;
}

export interface HRChallengePayload {
  requirement_id?: number | null;
  reason: string;
  new_status?: string | null;
}

export interface HRChallengeResponse {
  id: number;
  application_id: number;
  requirement_id?: number | null;
  hr_user_id: number;
  original_status?: string | null;
  new_status?: string | null;
  reason: string;
  created_at: string;
}

export interface FeedbackPayload {
  feedback_type: string;
  content: string;
}

export interface FeedbackResponse {
  id: number;
  application_id: number;
  feedback_type: string;
  content: string;
  created_by: string;
  created_at: string;
}

export const hrApi = {
  async getProfile(): Promise<HRProfileResponse> {
    return apiClient<HRProfileResponse>('/hr/profile');
  },

  async getDashboard(): Promise<HRDashboardResponse> {
    return apiClient<HRDashboardResponse>('/hr/dashboard');
  },

  async createVacancy(payload: VacancyCreatePayload): Promise<VacancyResponse> {
    return apiClient<VacancyResponse>('/hr/vacancies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async publishVacancy(vacancyId: number): Promise<VacancyResponse> {
    return apiClient<VacancyResponse>(`/hr/vacancies/${vacancyId}/publish`, {
      method: 'POST',
    });
  },

  async listVacancies(): Promise<VacancyResponse[]> {
    return apiClient<VacancyResponse[]>('/hr/vacancies');
  },

  async getVacancy(vacancyId: number): Promise<VacancyResponse> {
    return apiClient<VacancyResponse>(`/hr/vacancies/${vacancyId}`);
  },

  async getVacancyApplications(vacancyId: number): Promise<ApplicationResponse[]> {
    return apiClient<ApplicationResponse[]>(`/hr/vacancies/${vacancyId}/applications`);
  },

  async getApplicationAnalysis(applicationId: number): Promise<any> {
    return apiClient<any>(`/hr/applications/${applicationId}/analysis`);
  },

  async challengeDecision(applicationId: number, payload: HRChallengePayload): Promise<HRChallengeResponse> {
    return apiClient<HRChallengeResponse>(`/hr/applications/${applicationId}/challenge`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateApplicationStatus(applicationId: number, status: string): Promise<ApplicationResponse> {
    return apiClient<ApplicationResponse>(`/hr/applications/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async addFeedback(applicationId: number, payload: FeedbackPayload): Promise<FeedbackResponse> {
    return apiClient<FeedbackResponse>(`/hr/applications/${applicationId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
