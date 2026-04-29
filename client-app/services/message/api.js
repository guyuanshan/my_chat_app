const API_BASE_URL = "http://127.0.0.1:3000";

export async function getConversationMessages(query) {
  const searchParams = new URLSearchParams({
    userA: query.userA,
    userB: query.userB,
    limit: String(query.limit ?? 10)
  });

  const response = await fetch(`${API_BASE_URL}/messages/conversation?${searchParams.toString()}`);
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "获取历史消息失败，请稍后重试。");
  }

  return result.data;
}

export async function sendTextMessage(payload) {
  const response = await fetch(`${API_BASE_URL}/messages/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "发送消息失败，请稍后重试。");
  }

  return result.data;
}

export async function pollMessages(query) {
  const searchParams = new URLSearchParams({
    receiverId: query.receiverId
  });

  if (query.since) {
    searchParams.set("since", query.since);
  }

  const response = await fetch(`${API_BASE_URL}/messages/poll?${searchParams.toString()}`);
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "轮询新消息失败，请稍后重试。");
  }

  return result.data;
}
