/**
 * Centralized API fetch utility for all API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}/api${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }

      return data as ApiResponse<T>;
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  }

  // Leads
  async getLeads(filters?: {
    status?: string;
    source?: string;
    assignedToId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.assignedToId) params.append('assignedToId', filters.assignedToId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request(`/leads?${params.toString()}`);
  }

  async getLeadById(id: string): Promise<ApiResponse> {
    return this.request(`/leads/${id}`);
  }

  async createLead(data: any): Promise<ApiResponse> {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLead(id: string, data: any): Promise<ApiResponse> {
    return this.request(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLead(id: string): Promise<ApiResponse> {
    return this.request(`/leads/${id}`, { method: 'DELETE' });
  }

  // Call Logs
  async getCallLogs(filters?: {
    leadId?: string;
    callerId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters?.leadId) params.append('leadId', filters.leadId);
    if (filters?.callerId) params.append('callerId', filters.callerId);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request(`/calls?${params.toString()}`);
  }

  async createCallLog(data: any): Promise<ApiResponse> {
    return this.request('/calls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Follow-ups
  async getFollowUps(filters?: {
    leadId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters?.leadId) params.append('leadId', filters.leadId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request(`/followups?${params.toString()}`);
  }

  async createFollowUp(data: any): Promise<ApiResponse> {
    return this.request('/followups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFollowUp(id: string, data: any): Promise<ApiResponse> {
    return this.request(`/followups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFollowUp(id: string): Promise<ApiResponse> {
    return this.request(`/followups/${id}`, { method: 'DELETE' });
  }

  // Activity History
  async getActivityHistory(filters?: {
    leadId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters?.leadId) params.append('leadId', filters.leadId);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request(`/activity?${params.toString()}`);
  }

  async createActivity(data: any): Promise<ApiResponse> {
    return this.request('/activity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();

// Hook for React components
import { useCallback, useState } from 'react';

export function useApi<T = unknown>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFunction(...args);
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'An error occurred');
        }
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [apiFunction]
  );

  return { execute, loading, error, data };
}




