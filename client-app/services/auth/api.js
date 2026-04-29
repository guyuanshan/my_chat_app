import { clearSessionToken, createAuthHeaders, setSessionToken } from "./session.js";
import { API_BASE_URL } from "../../config/api.js";

function createApiError(result, fallbackMessage) {
  const error = new Error(result.error?.message || fallbackMessage);
  error.code = result.error?.code || "UNKNOWN_ERROR";
  return error;
}

export async function getSessionOptions() {
  const response = await fetch(`${API_BASE_URL}/session/options`);
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw createApiError(result, "获取登录选项失败，请稍后重试。");
  }

  return result.data;
}

export async function loginSession(payload) {
  const response = await fetch(`${API_BASE_URL}/session/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw createApiError(result, "登录失败，请稍后重试。");
  }

  setSessionToken(result.data.token);
  return result.data;
}

export async function getCurrentSession() {
  const response = await fetch(`${API_BASE_URL}/session/me`, {
    headers: createAuthHeaders()
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw createApiError(result, "获取登录状态失败，请稍后重试。");
  }

  return result.data;
}

export async function logoutSession() {
  const response = await fetch(`${API_BASE_URL}/session/logout`, {
    method: "POST",
    headers: createAuthHeaders()
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw createApiError(result, "退出登录失败，请稍后重试。");
  }

  clearSessionToken();
  return result.data;
}

export function clearStoredSession() {
  clearSessionToken();
}
