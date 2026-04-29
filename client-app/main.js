import {
  clearStoredSession,
  getCurrentSession,
  getSessionOptions,
  loginSession,
  logoutSession
} from "./services/auth/api.js";
import { createBinding } from "./services/binding/api.js";
import {
  getConversationMessages,
  pollMessages,
  sendEmojiMessage,
  sendImageMessage,
  sendTextMessage
} from "./services/message/api.js";
import { renderChatPage } from "./pages/chat/render.js";

const appRoot = document.querySelector("#app");
const TARGET_USER_ID_STORAGE_KEY_PREFIX = "chat-app-target-user-id:";
const POLL_INTERVAL_MS = 3000;
const MAX_IMAGE_FILE_BYTES = 220 * 1024;
const preferredLoginUserId = readPreferredLoginUserId();

const state = {
  currentUserId: "",
  isAuthenticated: false,
  authStatus: "loading",
  authMessage: "正在检查登录状态...",
  loginUserOptions: ["user_a", "user_b"],
  loginUserId: preferredLoginUserId || "user_a",
  loginPassword: "",
  targetUserId: "",
  bindingStatus: "idle",
  bindingMessage: "请输入对方 ID 建立单向绑定。",
  isBound: false,
  messages: [],
  historyStatus: "idle",
  historyMessage: "完成绑定后，这里会展示最近 10 条历史消息。",
  composerText: "",
  sendStatus: "idle",
  sendMessage: "",
  emojiPickerOpen: false,
  pollStatus: "idle",
  latestPollServerTime: ""
};

let pollTimerId = null;
let pollRequestInFlight = false;

function renderApp() {
  if (!appRoot) {
    return;
  }

  appRoot.innerHTML = renderChatPage(state);
  attachEvents();
  syncPolling();
}

function attachEvents() {
  const loginForm = document.querySelector(".auth-entry__form");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  const loginPasswordField = document.querySelector(".auth-entry__field");

  if (loginPasswordField) {
    loginPasswordField.addEventListener("input", (event) => {
      state.loginPassword = event.target.value;
    });
  }

  const loginUserSelect = document.querySelector(".auth-entry__select");

  if (loginUserSelect) {
    loginUserSelect.addEventListener("change", (event) => {
      state.loginUserId = event.target.value;
    });
  }

  const logoutButton = document.querySelector('[data-action="logout"]');

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogoutClick);
  }

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

  const imageButton = document.querySelector('[data-action="pick-image"]');
  const emojiToggleButton = document.querySelector('[data-action="toggle-emoji-picker"]');
  const imageFileInput = document.querySelector(".quick-actions__file-input");
  const emojiButtons = document.querySelectorAll("[data-emoji-value]");

  if (imageButton && imageFileInput) {
    imageButton.addEventListener("click", () => {
      imageFileInput.click();
    });
  }

  if (imageFileInput) {
    imageFileInput.addEventListener("change", handleImageFileChange);
  }

  if (emojiToggleButton) {
    emojiToggleButton.addEventListener("click", handleEmojiToggleClick);
  }

  emojiButtons.forEach((button) => {
    button.addEventListener("click", handleEmojiButtonClick);
  });

  const bindingForm = document.querySelector(".binding-entry__form");

  if (bindingForm) {
    bindingForm.addEventListener("submit", handleBindingSubmit);
  }
}

async function initializeApp() {
  renderApp();

  try {
    const options = await getSessionOptions();
    state.loginUserOptions = options.userIds;
    if (preferredLoginUserId && options.userIds.includes(preferredLoginUserId)) {
      state.loginUserId = preferredLoginUserId;
    } else {
      state.loginUserId = options.userIds[0] || state.loginUserId;
    }
  } catch {
    state.authStatus = "error";
    state.authMessage = "获取登录选项失败，请稍后刷新重试。";
    renderApp();
    return;
  }

  try {
    const session = await getCurrentSession();
    applyAuthenticatedSession(session.userId);
    state.authStatus = "success";
    state.authMessage = "";
    await restoreConversationState();
  } catch (error) {
    clearStoredSession();
    resetAuthenticatedState();
    state.authStatus = "idle";
    state.authMessage =
      error instanceof Error && error.code === "UNAUTHORIZED"
        ? "请选择用户并输入密码登录。"
        : "请选择用户并输入密码登录。";
  }

  renderApp();
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  state.authStatus = "submitting";
  state.authMessage = "正在登录...";
  renderApp();

  try {
    const result = await loginSession({
      userId: state.loginUserId,
      password: state.loginPassword
    });

    applyAuthenticatedSession(result.userId);
    state.authStatus = "success";
    state.authMessage = "";
    state.loginPassword = "";
    await restoreConversationState();
  } catch (error) {
    resetAuthenticatedState();
    state.authStatus = "error";
    state.authMessage = error instanceof Error ? error.message : "登录失败，请稍后重试。";
  }

  renderApp();
}

async function handleLogoutClick(event) {
  event.preventDefault();

  try {
    await logoutSession();
  } catch {
    clearStoredSession();
  }

  stopPolling();
  resetAuthenticatedState();
  state.authStatus = "idle";
  state.authMessage = "已退出登录。";
  renderApp();
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
    handleApiError(error, "绑定失败，请稍后重试。");
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

    appendOutgoingMessage({
      id: result.messageId,
      type: "text",
      text
    });
    state.composerText = "";
    state.sendStatus = "success";
    state.sendMessage = "";
    state.historyStatus = "success";
    state.historyMessage = "历史消息已加载，刚发送的消息已追加到列表。";
  } catch (error) {
    handleApiError(error, "发送消息失败，请稍后重试。");
    state.sendStatus = "error";
    state.sendMessage = error instanceof Error ? error.message : "发送消息失败，请稍后重试。";
  }

  renderApp();
}

function handleEmojiToggleClick() {
  if (!state.isBound || state.sendStatus === "submitting") {
    return;
  }

  state.emojiPickerOpen = !state.emojiPickerOpen;
  renderApp();
}

async function handleEmojiButtonClick(event) {
  const emoji = event.currentTarget.getAttribute("data-emoji-value") || "";

  if (!emoji) {
    return;
  }

  await sendEmojiSelection(emoji);
}

async function sendEmojiSelection(emoji) {
  if (!state.isBound || !state.targetUserId) {
    state.sendStatus = "error";
    state.sendMessage = "请先完成绑定。";
    renderApp();
    return;
  }

  state.sendStatus = "submitting";
  state.sendMessage = "正在发送表情...";
  renderApp();

  try {
    const result = await sendEmojiMessage({
      senderId: state.currentUserId,
      receiverId: state.targetUserId,
      emoji
    });

    appendOutgoingMessage({
      id: result.messageId,
      type: "emoji",
      emoji
    });
    state.emojiPickerOpen = false;
    state.sendStatus = "success";
    state.sendMessage = "";
    state.historyStatus = "success";
    state.historyMessage = "历史消息已加载，刚发送的表情已追加到列表。";
  } catch (error) {
    handleApiError(error, "发送表情失败，请稍后重试。");
    state.sendStatus = "error";
    state.sendMessage = error instanceof Error ? error.message : "发送表情失败，请稍后重试。";
  }

  renderApp();
}

async function handleImageFileChange(event) {
  const fileInput = event.currentTarget;
  const file = fileInput.files?.[0];
  fileInput.value = "";

  if (!file) {
    return;
  }

  if (!state.isBound || !state.targetUserId) {
    state.sendStatus = "error";
    state.sendMessage = "请先完成绑定。";
    renderApp();
    return;
  }

  if (!file.type.startsWith("image/")) {
    state.sendStatus = "error";
    state.sendMessage = "请选择图片文件。";
    renderApp();
    return;
  }

  if (file.size > MAX_IMAGE_FILE_BYTES) {
    state.sendStatus = "error";
    state.sendMessage = "图片文件请控制在 220 KB 以内。";
    renderApp();
    return;
  }

  state.sendStatus = "submitting";
  state.sendMessage = "正在发送图片...";
  renderApp();

  try {
    const imageData = await readFileAsDataUrl(file);
    const result = await sendImageMessage({
      senderId: state.currentUserId,
      receiverId: state.targetUserId,
      imageData
    });

    appendOutgoingMessage({
      id: result.messageId,
      type: "image",
      imageData
    });
    state.sendStatus = "success";
    state.sendMessage = "";
    state.historyStatus = "success";
    state.historyMessage = "历史消息已加载，刚发送的图片已追加到列表。";
  } catch (error) {
    handleApiError(error, "发送图片失败，请稍后重试。");
    state.sendStatus = "error";
    state.sendMessage = error instanceof Error ? error.message : "发送图片失败，请稍后重试。";
  }

  renderApp();
}

async function restoreConversationState() {
  state.targetUserId = readStoredTargetUserId(state.currentUserId);
  state.isBound = Boolean(state.targetUserId);
  state.bindingStatus = state.isBound ? "existing" : "idle";
  state.bindingMessage = state.isBound
    ? `已恢复 ${state.targetUserId} 的绑定目标。`
    : "请输入对方 ID 建立单向绑定。";

  if (state.isBound) {
    await loadConversationHistory();
  } else {
    state.messages = [];
    state.historyStatus = "idle";
    state.historyMessage = "完成绑定后，这里会展示最近 10 条历史消息。";
  }
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

    state.messages = result.items.map((message) => mapServerMessageToView(message, state.currentUserId));
    state.historyStatus = "success";
    state.historyMessage =
      state.messages.length > 0 ? "已加载最近 10 条历史消息。" : "当前还没有历史消息。";
  } catch (error) {
    handleApiError(error, "获取历史消息失败，请稍后重试。");
    state.messages = [];
    state.historyStatus = "error";
    state.historyMessage = error instanceof Error ? error.message : "获取历史消息失败，请稍后重试。";
  }
}

function syncPolling() {
  if (!state.isAuthenticated || !state.isBound || !state.targetUserId) {
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
  if (pollRequestInFlight || !state.isAuthenticated || !state.isBound || !state.targetUserId) {
    return;
  }

  pollRequestInFlight = true;

  try {
    const currentConversationId = createConversationId(state.currentUserId, state.targetUserId);
    const result = await pollMessages({
      receiverId: state.currentUserId,
      since: state.latestPollServerTime || undefined
    });

    const knownMessageIds = new Set(state.messages.map((message) => message.id));
    const newItems = result.items.filter((message) => {
      return message.conversationId === currentConversationId && !knownMessageIds.has(message.messageId);
    });

    if (newItems.length > 0) {
      state.messages.push(
        ...newItems.map((message) => mapServerMessageToView(message, state.currentUserId))
      );
      state.historyStatus = "success";
      state.historyMessage = "已接收新的消息。";
      renderApp();
    }

    state.latestPollServerTime = result.serverTime;
    state.pollStatus = "active";
  } catch (error) {
    handleApiError(error, "轮询新消息失败，请稍后重试。");
    state.pollStatus = "error";
  } finally {
    pollRequestInFlight = false;
  }
}

function applyAuthenticatedSession(userId) {
  state.currentUserId = userId;
  state.isAuthenticated = true;
  state.isBound = false;
}

function resetAuthenticatedState() {
  state.currentUserId = "";
  state.isAuthenticated = false;
  state.targetUserId = "";
  state.bindingStatus = "idle";
  state.bindingMessage = "请输入对方 ID 建立单向绑定。";
  state.isBound = false;
  state.messages = [];
  state.historyStatus = "idle";
  state.historyMessage = "完成绑定后，这里会展示最近 10 条历史消息。";
  state.composerText = "";
  state.sendStatus = "idle";
  state.sendMessage = "";
  state.emojiPickerOpen = false;
  state.pollStatus = "idle";
  state.latestPollServerTime = "";
}

function appendOutgoingMessage(message) {
  state.messages.push({
    ...message,
    direction: "outgoing"
  });
}

function mapServerMessageToView(message, currentUserId) {
  return {
    id: message.messageId,
    type: message.type,
    text: message.text,
    imageData: message.imageData,
    emoji: message.emoji,
    direction: message.senderId === currentUserId ? "outgoing" : "incoming"
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };

    reader.onerror = () => {
      reject(new Error("读取图片失败，请重新选择。"));
    };

    reader.readAsDataURL(file);
  });
}

function handleApiError(error, fallbackMessage) {
  if (!(error instanceof Error)) {
    return;
  }

  if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN_USER_CONTEXT") {
    clearStoredSession();
    stopPolling();
    resetAuthenticatedState();
    state.authStatus = "error";
    state.authMessage = "登录状态失效，请重新登录。";
    state.bindingMessage = fallbackMessage;
  }
}

function persistTargetUserId(targetUserId) {
  if (!state.currentUserId) {
    return;
  }

  window.localStorage.setItem(`${TARGET_USER_ID_STORAGE_KEY_PREFIX}${state.currentUserId}`, targetUserId);
}

function readStoredTargetUserId(currentUserId) {
  if (!currentUserId) {
    return "";
  }

  return window.localStorage.getItem(`${TARGET_USER_ID_STORAGE_KEY_PREFIX}${currentUserId}`) || "";
}

function createConversationId(userA, userB) {
  return ["dm", ...[userA.trim(), userB.trim()].sort()].join(":");
}

function readPreferredLoginUserId() {
  const searchParams = new URLSearchParams(window.location.search);
  const userId = searchParams.get("user");
  return typeof userId === "string" ? userId.trim() : "";
}

window.addEventListener("beforeunload", stopPolling);
window.addEventListener("pagehide", stopPolling);

initializeApp();
