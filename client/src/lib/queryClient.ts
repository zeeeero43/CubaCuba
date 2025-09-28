import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// CSRF token cache
let csrfTokenCache: { token: string; timestamp: number } | null = null;
const CSRF_TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get CSRF token with caching
async function getCSRFToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid
  if (csrfTokenCache && (now - csrfTokenCache.timestamp) < CSRF_TOKEN_CACHE_DURATION) {
    return csrfTokenCache.token;
  }
  
  try {
    const res = await fetch('/api/csrf-token', {
      credentials: 'include',
    });
    
    if (!res.ok) {
      throw new Error('Failed to get CSRF token');
    }
    
    const data = await res.json();
    const token = data.csrfToken;
    
    // Cache the token
    csrfTokenCache = {
      token,
      timestamp: now
    };
    
    return token;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Determine if this is an auth endpoint that needs CSRF protection
  const authEndpoints = ['/api/login', '/api/register', '/api/verify-sms', '/api/resend-verification', 
                        '/api/reset-password', '/api/confirm-reset', '/api/logout'];
  const needsCSRF = authEndpoints.some(endpoint => url.includes(endpoint)) && method !== 'GET';
  
  let headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add CSRF token for auth endpoints
  if (needsCSRF) {
    try {
      const csrfToken = await getCSRFToken();
      headers["x-csrf-token"] = csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      // Continue without CSRF token - let the server handle the error
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
