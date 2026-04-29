import { createAuthHeaders } from "../auth/session.js";
import { API_BASE_URL } from "../../config/api.js";

export async function createBinding(payload) {
  const response = await fetch(`${API_BASE_URL}/bindings`, {
    method: "POST",
    headers: createAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "绑定失败，请稍后重试。");
  }

  return result.data;
}
