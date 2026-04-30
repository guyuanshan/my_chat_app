import { createAuthHeaders } from "../auth/session.js";
import { API_BASE_URL } from "../../config/api.js";

export async function getConversationMessages(query) {
  const searchParams = new URLSearchParams({
    userA: query.userA,
    userB: query.userB,
    limit: String(query.limit ?? 10)
  });

  if (query.cursor) {
    searchParams.set("cursor", query.cursor);
  }

  const response = await fetch(`${API_BASE_URL}/messages/conversation?${searchParams.toString()}`, {
    headers: createAuthHeaders()
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "获取历史消息失败，请稍后重试。");
  }

  return result.data;
}

export async function sendTextMessage(payload) {
  const response = await fetch(`${API_BASE_URL}/messages/text`, {
    method: "POST",
    headers: createAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "发送消息失败，请稍后重试。");
  }

  return result.data;
}

export async function sendEmojiMessage(payload) {
  const response = await fetch(`${API_BASE_URL}/messages/emoji`, {
    method: "POST",
    headers: createAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "发送表情失败，请稍后重试。");
  }

  return result.data;
}

export async function sendImageMessage(payload) {
  const response = await fetch(`${API_BASE_URL}/messages/image`, {
    method: "POST",
    headers: createAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "发送图片失败，请稍后重试。");
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

  const response = await fetch(`${API_BASE_URL}/messages/poll?${searchParams.toString()}`, {
    headers: createAuthHeaders()
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message || "轮询新消息失败，请稍后重试。");
  }

  return result.data;
}
