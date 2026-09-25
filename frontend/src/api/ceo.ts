import { apiClient } from './client';

export interface DepartmentResponse {
  id: number;
  company_id: number;
  name: string;
  created_at: string;
}

export interface CompanyResponse {
  id: number;
  name: string;
  ceo_user_id: number;
  is_active: boolean;
  created_at: string;
  departments: DepartmentResponse[];
}

export interface HRCreatePayload {
  name: string;
  email: string;
  password: string;
  department_id: number;
}

export interface HRResponse {
  id: number;
  user_id: number;
  company_id: number;
  department_id: number;
  name: string;
  email: string;
  department_name?: string | null;
  company_name: string;
  created_at: string;
}

export const ceoApi = {
  async getCompany(): Promise<CompanyResponse> {
    return apiClient<CompanyResponse>('/ceo/company');
  },

  async listDepartments(): Promise<DepartmentResponse[]> {
    return apiClient<DepartmentResponse[]>('/ceo/departments');
  },

  async createDepartment(name: string): Promise<DepartmentResponse> {
    return apiClient<DepartmentResponse>('/ceo/departments', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async updateDepartment(departmentId: number, name: string): Promise<DepartmentResponse> {
    return apiClient<DepartmentResponse>(`/ceo/departments/${departmentId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  async deleteDepartment(departmentId: number): Promise<void> {
    return apiClient<void>(`/ceo/departments/${departmentId}`, {
      method: 'DELETE',
    });
  },

  async listHR(): Promise<HRResponse[]> {
    return apiClient<HRResponse[]>('/ceo/hr');
  },

  async createHR(payload: HRCreatePayload): Promise<HRResponse> {
    return apiClient<HRResponse>('/ceo/hr', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getHR(hrId: number): Promise<HRResponse> {
    return apiClient<HRResponse>(`/ceo/hr/${hrId}`);
  },
};
