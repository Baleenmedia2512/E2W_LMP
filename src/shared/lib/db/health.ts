import { useEffect, useState } from 'react';

export interface ApiHealthStatus {
  isHealthy: boolean;
  hasDatabase: boolean;
  hasLeads: boolean;
  message: string;
}

export async function checkApiHealth(): Promise<ApiHealthStatus> {
  try {
    const response = await fetch('/api/health', { method: 'GET' });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }

    return {
      isHealthy: false,
      hasDatabase: false,
      hasLeads: false,
      message: 'API health check failed',
    };
  } catch (error) {
    return {
      isHealthy: false,
      hasDatabase: false,
      hasLeads: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function useApiHealth() {
  const [status, setStatus] = useState<ApiHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      setLoading(true);
      const health = await checkApiHealth();
      setStatus(health);
      setLoading(false);
    };

    check();
    const interval = setInterval(check, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { status, loading };
}




