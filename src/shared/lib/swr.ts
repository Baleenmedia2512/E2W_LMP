export const fetcher = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
  
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const error = new Error('Failed to fetch');
      (error as any).status = res.status;
      throw error;
    }
    
    return res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const error = new Error('Request timeout');
      (error as any).status = 504;
      throw error;
    }
    throw err;
  }
};
