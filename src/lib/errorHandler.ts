// Error handling utilities for better debugging and user experience

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  hint?: string;
}

export function handleApiError(error: any): ApiError {
  console.error('API Error:', error);
  
  if (error?.message) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }
  
  if (error?.error_description) {
    return {
      message: error.error_description,
      code: error.error,
    };
  }
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  return {
    message: 'An unexpected error occurred',
    details: error,
  };
}

export function isNetworkError(error: any): boolean {
  return error?.message?.includes('Failed to fetch') || 
         error?.message?.includes('NetworkError') ||
         error?.message?.includes('ERR_FAILED') ||
         error?.message?.includes('ERR_CONNECTION_RESET');
}

export function shouldRetry(error: any): boolean {
  return isNetworkError(error) || 
         error?.code === 'PGRST301' || // Service unavailable
         error?.code === 'PGRST302';   // Service overloaded
}

export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error) || i === maxRetries - 1) {
        throw error;
      }
      
      console.log(`Retrying request (${i + 1}/${maxRetries}) after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw lastError;
}
