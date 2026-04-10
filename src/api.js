const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest(path, options = {}) {
  const token = window.localStorage.getItem("reclaim-api-token");
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export function saveAuthToken(token) {
  window.localStorage.setItem("reclaim-api-token", token);
}

export function clearAuthToken() {
  window.localStorage.removeItem("reclaim-api-token");
}
