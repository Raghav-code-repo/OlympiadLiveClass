export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { data, headers = {}, ...rest } = options;

  const token = localStorage.getItem("access_token");

  const configHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  let response = await fetch(url, {
    ...rest,
    headers: configHeaders,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // send httpOnly cookies
  });

  // Attempt token refresh on 401
  if (response.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/refresh")) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.accessToken) {
          localStorage.setItem("access_token", refreshData.accessToken);
          configHeaders["Authorization"] = `Bearer ${refreshData.accessToken}`;

          // Retry original request
          response = await fetch(url, {
            ...rest,
            headers: configHeaders,
            body: data ? JSON.stringify(data) : undefined,
            credentials: "include",
          });
        }
      } else {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    } catch {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
  }

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Request failed");
  }

  return result as T;
}
