import { apiClient } from './client';
import type { VacancyResponse, VacancyCreatePayload } from './hr';

export const vacanciesApi = {
  async listVacancies(): Promise<VacancyResponse[]> {
    return apiClient<VacancyResponse[]>('/vacancies');
  },

  async getVacancy(vacancyId: number): Promise<VacancyResponse> {
    return apiClient<VacancyResponse>(`/vacancies/${vacancyId}`);
  },

  async createVacancy(payload: VacancyCreatePayload): Promise<VacancyResponse> {
    return apiClient<VacancyResponse>('/vacancies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
