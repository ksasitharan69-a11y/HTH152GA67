import { apiClient, setStoredToken, setStoredUser, removeStoredToken } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CEORegisterPayload {
  name: string;
  email: string;
  password: string;
  company_name: string;
}

export interface CandidateRegisterPayload {
  name?: string;
  email: string;
  password: string;
  github_url?: string;
  linkedin_url?: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface UserResponse {
  id: number;
  email: string;
  role: 'CEO' | 'HR' | 'CANDIDATE';
  is_email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: 'CEO' | 'HR' | 'CANDIDATE';
  user: UserResponse;
  company_id?: number | null;
  company_name?: string | null;
}

export interface MessageResponse {
  message: string;
  email?: string;
  otp_preview?: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const data = await apiClient<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.access_token) {
      setStoredToken(data.access_token);
      setStoredUser(data);
    }
    return data;
  },

  async registerCEO(payload: CEORegisterPayload): Promise<MessageResponse> {
    return apiClient<MessageResponse>('/auth/ceo/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async registerCandidate(payload: CandidateRegisterPayload): Promise<MessageResponse> {
    return apiClient<MessageResponse>('/auth/candidate/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async verifyEmail(payload: VerifyEmailPayload): Promise<MessageResponse> {
    return apiClient<MessageResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout(): void {
    removeStoredToken();
  }
};
