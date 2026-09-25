/**
 * Centralized API Client for HireProof Backend
 * Handles base URL configuration, Bearer token injection, and structured error handling.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const TOKEN_KEY = 'hireproof_jwt_token';
const USER_KEY = 'hireproof_auth_user';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // LocalStorage quota/access fallback
  }
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore error
  }
}

export function getStoredUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser<T>(user: T): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore error
  }
}

export interface ApiError {
  status: number;
  message: string;
  detail?: any;
}

export class ApiException extends Error {
  status: number;
  detail?: any;

  constructor(status: number, message: string, detail?: any) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.detail = detail;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  // Inject JWT Bearer Token if present
  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set default JSON Content-Type if body is not FormData
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return null as unknown as T;
  }

  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        // Pydantic validation error array
        errorMessage = data.detail.map((err: any) => `${err.loc?.join('.') || 'field'}: ${err.msg}`).join(', ');
      } else if (data.message) {
        errorMessage = data.message;
      }
    } else if (typeof data === 'string' && data.length < 200) {
      errorMessage = data;
    }

    if (response.status === 401) {
      removeStoredToken();
      // Dispatch custom event so context can sync
      window.dispatchEvent(new CustomEvent('hireproof-unauthorized'));
      throw new ApiException(401, errorMessage || 'Session expired. Please sign in again.', data);
    }

    if (response.status === 403) {
      throw new ApiException(403, errorMessage || 'You do not have permission to perform this action.', data);
    }

    if (response.status === 404) {
      throw new ApiException(404, errorMessage || 'The requested resource was not found.', data);
    }

    if (response.status === 409) {
      throw new ApiException(409, errorMessage || 'A conflicting record already exists.', data);
    }

    if (response.status === 422) {
      throw new ApiException(422, errorMessage || 'Input validation failed. Please check your data.', data);
    }

    if (response.status >= 500) {
      throw new ApiException(response.status, 'Server error occurred. Please check backend service.', data);
    }

    throw new ApiException(response.status, errorMessage, data);
  }

  return data as T;
}
