const SESSION_TOKEN_STORAGE_KEY = "chat-app-session-token";

export function getSessionToken() {
  return window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY) || "";
}

export function setSessionToken(token) {
  window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
}

export function clearSessionToken() {
  window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
}

export function createAuthHeaders(extraHeaders = {}) {
  const token = getSessionToken();

  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}
