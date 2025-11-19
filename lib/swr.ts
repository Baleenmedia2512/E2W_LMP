import useSWR, { SWRConfiguration } from 'swr';
import { ApiResponse, PaginatedResponse } from '@/types';

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // @ts-expect-error - adding info to error object
    error.info = await res.json();
    // @ts-expect-error - adding status to error object
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export function useApi<T>(url: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<T>>(url, fetcher, {
    revalidateOnFocus: false,
    ...config,
  });

  return {
    data: data?.data,
    error,
    isLoading,
    mutate,
    success: data?.success,
  };
}

export function usePaginatedApi<T>(url: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<PaginatedResponse<T>>>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      ...config,
    }
  );

  return {
    data: data?.data?.data || [],
    total: data?.data?.total || 0,
    page: data?.data?.page || 1,
    pageSize: data?.data?.pageSize || 20,
    hasMore: data?.data?.hasMore || false,
    error,
    isLoading,
    mutate,
    success: data?.success,
  };
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

export async function apiPost<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: 'DELETE',
  });
}
