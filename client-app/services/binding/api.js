const API_BASE_URL = "http://127.0.0.1:3000";

export async function createBinding(payload) {
  const response = await fetch(`${API_BASE_URL}/bindings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "绑定失败，请稍后重试。");
  }

  return result.data;
}
