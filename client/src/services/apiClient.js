/**
 * Shared API Client
 * Configured according to Section 11 of frontend_design.md:
 * - base URL
 * - credentials/cookie behavior (SameSite/HttpOnly)
 * - JSON parsing
 * - normalized errors
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  } else {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  if (!headers.Authorization && !headers.authorization && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('pathwise_active_session');
      if (stored) {
        const session = JSON.parse(stored);
        const token =
          session.token ||
          session.session?.access_token ||
          session.access_token ||
          (session.id ? `mock_token_${session.id}_session` : null);
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  const config = {
    ...options,
    headers,
    credentials: options.credentials || 'include', // Support HttpOnly cookies
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Parse JSON safely
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      if (data) {
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data.message === 'string' && data.message) {
          errorMessage = data.message;
        } else if (typeof data.error === 'string' && data.error) {
          errorMessage = data.error;
        } else if (data.error && typeof data.error === 'object') {
          if (Array.isArray(data.error.details) && data.error.details.length > 0) {
            errorMessage = data.error.details
              .map((d) => (d.issue || d.message ? `${d.field ? `${d.field}: ` : ''}${d.issue || d.message}` : JSON.stringify(d)))
              .join(', ');
          } else if (typeof data.error.message === 'string' && data.error.message) {
            errorMessage = data.error.message;
          }
        }
      }
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or parse error
    throw new ApiError(error.message || 'Network connection error. Please verify server status.', 0);
  }
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};

