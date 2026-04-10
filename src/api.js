const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest(path, options = {}) {
  const timeoutMs = options.timeoutMs ?? 8000;
  const token = window.localStorage.getItem("reclaim-api-token");
  const headers = new Headers(options.headers || {});
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The server took too long to respond.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function saveAuthToken(token) {
  window.localStorage.setItem("reclaim-api-token", token);
}

export function clearAuthToken() {
  window.localStorage.removeItem("reclaim-api-token");
}
