import { createBinding } from "./services/binding/api.js";
import { getConversationMessages, pollMessages, sendTextMessage } from "./services/message/api.js";
import { renderChatPage } from "./pages/chat/render.js";

const appRoot = document.querySelector("#app");
const CURRENT_USER_ID = "user_a";
const TARGET_USER_ID_STORAGE_KEY = "chat-app-target-user-id";
const POLL_INTERVAL_MS = 3000;
const state = {
  currentUserId: CURRENT_USER_ID,
  targetUserId: readStoredTargetUserId(),
  bindingStatus: "idle",
  bindingMessage: "请输入对方 ID 建立单向绑定。",
  isBound: false,
  messages: [],
  historyStatus: "idle",
  historyMessage: "完成绑定后，这里会展示最近 10 条历史消息。",
  composerText: "",
  sendStatus: "idle",
  sendMessage: "",
  pollStatus: "idle",
  latestPollServerTime: "",
  latestMessageSentAt: ""
};
let pollTimerId = null;
let pollRequestInFlight = false;

if (state.targetUserId) {
  state.isBound = true;
  state.bindingStatus = "existing";
  state.bindingMessage = `已恢复 ${state.targetUserId} 的绑定目标。`;
}

function renderApp() {
  if (!appRoot) {
    return;
  }

  appRoot.innerHTML = renderChatPage(state);
  attachEvents();
  syncPolling();
}

function attachEvents() {
  const inputForm = document.querySelector(".input-bar");

  if (inputForm) {
    inputForm.addEventListener("submit", handleSendSubmit);
  }

  const inputField = document.querySelector(".input-bar__field");

  if (inputField) {
    inputField.addEventListener("input", (event) => {
      state.composerText = event.target.value;
    });
  }

  const bindingForm = document.querySelector(".binding-entry__form");

  if (bindingForm) {
    bindingForm.addEventListener("submit", handleBindingSubmit);
  }
}

async function handleBindingSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const targetUserId = String(formData.get("targetUserId") || "").trim();

  state.targetUserId = targetUserId;
  state.bindingStatus = "submitting";
  state.bindingMessage = "正在建立绑定...";
  renderApp();

  try {
    const result = await createBinding({
      ownerId: state.currentUserId,
      targetId: targetUserId
    });

    persistTargetUserId(targetUserId);
    state.isBound = true;
    state.bindingStatus = result.status;
    state.bindingMessage =
      result.status === "created"
        ? `已绑定 ${targetUserId}，下一步可开始初始化聊天。`
        : `已存在 ${targetUserId} 的绑定，下一步可开始初始化聊天。`;
    await loadConversationHistory();
  } catch (error) {
    state.isBound = false;
    state.bindingStatus = "error";
    state.bindingMessage = error instanceof Error ? error.message : "绑定失败，请稍后重试。";
    state.historyStatus = "idle";
    state.historyMessage = "完成绑定后，这里会展示最近 10 条历史消息。";
  }

  renderApp();
}

async function handleSendSubmit(event) {
  event.preventDefault();

  if (!state.isBound || !state.targetUserId) {
    state.sendStatus = "error";
    state.sendMessage = "请先完成绑定。";
    renderApp();
    return;
  }

  const text = state.composerText.trim();

  if (!text) {
    state.sendStatus = "error";
    state.sendMessage = "请输入消息内容。";
    renderApp();
    return;
  }

  state.sendStatus = "submitting";
  state.sendMessage = "正在发送消息...";
  renderApp();

  try {
    const result = await sendTextMessage({
      senderId: state.currentUserId,
      receiverId: state.targetUserId,
      text
    });

    state.messages.push({
      id: result.messageId,
      text,
      direction: "outgoing"
    });
    state.latestMessageSentAt = result.sentAt;
    state.composerText = "";
    state.sendStatus = "success";
    state.sendMessage = "";
    state.historyStatus = "success";
    state.historyMessage = "历史消息已加载，刚发送的消息已追加到列表。";
  } catch (error) {
    state.sendStatus = "error";
    state.sendMessage = error instanceof Error ? error.message : "发送消息失败，请稍后重试。";
  }

  renderApp();
}

async function loadConversationHistory() {
  if (!state.targetUserId) {
    state.messages = [];
    state.historyStatus = "idle";
    state.historyMessage = "完成绑定后，这里会展示最近 10 条历史消息。";
    return;
  }

  state.historyStatus = "loading";
  state.historyMessage = "正在加载最近 10 条历史消息...";
  renderApp();

  try {
    const result = await getConversationMessages({
      userA: state.currentUserId,
      userB: state.targetUserId,
      limit: 10
    });

    state.messages = result.items.map((message) => ({
      id: message.messageId,
      text: message.text,
      direction: message.senderId === state.currentUserId ? "outgoing" : "incoming"
    }));
    state.latestMessageSentAt = result.items.at(-1)?.sentAt || "";
    state.historyStatus = "success";
    state.historyMessage =
      state.messages.length > 0 ? "已加载最近 10 条历史消息。" : "当前还没有历史消息。";
  } catch (error) {
    state.messages = [];
    state.historyStatus = "error";
    state.historyMessage = error instanceof Error ? error.message : "获取历史消息失败，请稍后重试。";
  }
}

function syncPolling() {
  if (!state.isBound || !state.targetUserId) {
    stopPolling();
    return;
  }

  if (pollTimerId !== null) {
    return;
  }

  startPolling();
}

function startPolling() {
  state.pollStatus = "starting";
  runPollCycle();
  pollTimerId = window.setInterval(runPollCycle, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimerId !== null) {
    window.clearInterval(pollTimerId);
    pollTimerId = null;
  }

  pollRequestInFlight = false;
  state.pollStatus = "idle";
}

async function runPollCycle() {
  if (pollRequestInFlight || !state.isBound || !state.targetUserId) {
    return;
  }

  pollRequestInFlight = true;

  try {
    const result = await pollMessages({
      receiverId: state.currentUserId,
      since: state.latestPollServerTime || undefined
    });

    const knownMessageIds = new Set(state.messages.map((message) => message.id));
    const newItems = result.items.filter((message) => !knownMessageIds.has(message.messageId));

    if (newItems.length > 0) {
      state.messages.push(
        ...newItems.map((message) => ({
          id: message.messageId,
          text: message.text,
          direction: message.senderId === state.currentUserId ? "outgoing" : "incoming"
        }))
      );
      state.historyStatus = "success";
      state.historyMessage = "已接收新的文本消息。";
      state.latestMessageSentAt = newItems.at(-1)?.sentAt || state.latestMessageSentAt;
      renderApp();
    }

    state.latestPollServerTime = result.serverTime;
    state.pollStatus = "active";
  } catch {
    state.pollStatus = "error";
  } finally {
    pollRequestInFlight = false;
  }
}

function persistTargetUserId(targetUserId) {
  window.localStorage.setItem(TARGET_USER_ID_STORAGE_KEY, targetUserId);
}

function readStoredTargetUserId() {
  return window.localStorage.getItem(TARGET_USER_ID_STORAGE_KEY) || "";
}

if (state.isBound) {
  loadConversationHistory().finally(() => {
    renderApp();
  });
}

window.addEventListener("beforeunload", stopPolling);
window.addEventListener("pagehide", stopPolling);

renderApp();
