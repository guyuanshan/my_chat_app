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
const RECENT_EMOJIS_STORAGE_KEY_PREFIX = "chat-app-recent-emojis:";
const POLL_INTERVAL_MS = 3000;
const MAX_SOURCE_IMAGE_FILE_BYTES = 8 * 1024 * 1024;
const TARGET_IMAGE_UPLOAD_BYTES = 220 * 1024;
const MAX_IMAGE_DIMENSION = 1440;
const MIN_IMAGE_DIMENSION = 720;
const IMAGE_OUTPUT_QUALITIES = [0.86, 0.78, 0.7, 0.62, 0.55];
const EMOJI_GROUPS = {
  recent: [],
  smile: ["😀", "😄", "😊", "😉", "😎", "🥳", "🤩", "😭"],
  gesture: ["👍", "👋", "🙏", "👏", "🤝", "💪", "👌", "✌️"],
  heart: ["❤️", "💛", "💚", "💙", "💜", "🫶", "💕", "💖"],
  mood: ["🎉", "✨", "🔥", "🌈", "🎈", "🌟", "🍀", "☀️"]
};
const DEFAULT_EMOJI_TAB = "smile";
const DEFAULT_PAGE_TITLE = "双人聊天移动端 App";
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
  nextHistoryCursor: null,
  hasMoreHistory: false,
  historyLoadMoreStatus: "idle",
  composerText: "",
  sendStatus: "idle",
  sendMessage: "",
  emojiPickerOpen: false,
  emojiPickerTab: DEFAULT_EMOJI_TAB,
  recentEmojis: [],
  emojiPickerItems: EMOJI_GROUPS[DEFAULT_EMOJI_TAB],
  inAppNotifications: [],
  hiddenIncomingCount: 0,
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
  const emojiTabButtons = document.querySelectorAll("[data-emoji-tab]");

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

  emojiTabButtons.forEach((button) => {
    button.addEventListener("click", handleEmojiTabClick);
  });

  const bindingForm = document.querySelector(".binding-entry__form");
  const loadMoreButton = document.querySelector('[data-action="load-more-history"]');
  const dismissNotificationButtons = document.querySelectorAll('[data-action="dismiss-notification"]');
  const clearNotificationsButton = document.querySelector('[data-action="clear-notifications"]');

  if (bindingForm) {
    bindingForm.addEventListener("submit", handleBindingSubmit);
  }

  if (loadMoreButton) {
    loadMoreButton.addEventListener("click", handleLoadMoreHistory);
  }

  dismissNotificationButtons.forEach((button) => {
    button.addEventListener("click", handleNotificationDismiss);
  });

  if (clearNotificationsButton) {
    clearNotificationsButton.addEventListener("click", clearNotifications);
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
  syncEmojiPickerItems();
  renderApp();
}

function handleEmojiTabClick(event) {
  const nextTab = event.currentTarget.getAttribute("data-emoji-tab") || DEFAULT_EMOJI_TAB;

  state.emojiPickerTab = nextTab;
  syncEmojiPickerItems();
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
    rememberRecentEmoji(emoji);
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

  if (file.size > MAX_SOURCE_IMAGE_FILE_BYTES) {
    state.sendStatus = "error";
    state.sendMessage = "原始图片请控制在 8 MB 以内。";
    renderApp();
    return;
  }

  state.sendStatus = "submitting";
  state.sendMessage = "正在压缩图片...";
  renderApp();

  try {
    const optimizedImage = await optimizeImageFile(file);

    state.sendMessage = "正在发送图片...";
    renderApp();

    const result = await sendImageMessage({
      senderId: state.currentUserId,
      receiverId: state.targetUserId,
      imageData: optimizedImage.imageData
    });

    appendOutgoingMessage({
      id: result.messageId,
      type: "image",
      imageData: optimizedImage.imageData
    });
    state.sendStatus = "success";
    state.sendMessage = `图片已压缩并发送：${formatBytes(optimizedImage.originalBytes)} -> ${formatBytes(optimizedImage.outputBytes)}。`;
    state.historyStatus = "success";
    state.historyMessage = "历史消息已加载，刚发送的图片已压缩后追加到列表。";
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
    state.nextHistoryCursor = null;
    state.hasMoreHistory = false;
    state.historyLoadMoreStatus = "idle";
    state.historyStatus = "idle";
    state.historyMessage = "完成绑定后，这里会展示最近 10 条历史消息。";
  }
}

async function loadConversationHistory() {
  if (!state.targetUserId) {
    state.messages = [];
    state.nextHistoryCursor = null;
    state.hasMoreHistory = false;
    state.historyLoadMoreStatus = "idle";
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
    state.nextHistoryCursor = result.nextCursor || null;
    state.hasMoreHistory = Boolean(result.hasMore);
    state.historyLoadMoreStatus = "idle";
    state.historyStatus = "success";
    state.historyMessage =
      state.messages.length > 0 ? "已加载最近 10 条历史消息。" : "当前还没有历史消息。";
  } catch (error) {
    handleApiError(error, "获取历史消息失败，请稍后重试。");
    state.messages = [];
    state.nextHistoryCursor = null;
    state.hasMoreHistory = false;
    state.historyLoadMoreStatus = "idle";
    state.historyStatus = "error";
    state.historyMessage = error instanceof Error ? error.message : "获取历史消息失败，请稍后重试。";
  }
}

async function handleLoadMoreHistory() {
  if (!state.targetUserId || !state.hasMoreHistory || !state.nextHistoryCursor) {
    return;
  }

  state.historyLoadMoreStatus = "loading";
  renderApp();

  try {
    const result = await getConversationMessages({
      userA: state.currentUserId,
      userB: state.targetUserId,
      limit: 10,
      cursor: state.nextHistoryCursor
    });
    const olderMessages = result.items.map((message) => mapServerMessageToView(message, state.currentUserId));
    const knownMessageIds = new Set(state.messages.map((message) => message.id));
    const uniqueOlderMessages = olderMessages.filter((message) => !knownMessageIds.has(message.id));

    state.messages = [...uniqueOlderMessages, ...state.messages];
    state.nextHistoryCursor = result.nextCursor || null;
    state.hasMoreHistory = Boolean(result.hasMore);
    state.historyLoadMoreStatus = "success";
    state.historyStatus = "success";
    state.historyMessage = uniqueOlderMessages.length > 0 ? "已加载更早的历史消息。" : "没有更多历史消息了。";
  } catch (error) {
    handleApiError(error, "加载更多历史消息失败，请稍后重试。");
    state.historyLoadMoreStatus = "error";
    state.historyMessage = error instanceof Error ? error.message : "加载更多历史消息失败，请稍后重试。";
  }

  renderApp();
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
      const incomingItems = newItems.filter((message) => message.senderId !== state.currentUserId);
      state.messages.push(
        ...newItems.map((message) => mapServerMessageToView(message, state.currentUserId))
      );
      if (incomingItems.length > 0) {
        pushInAppNotification(`收到来自 ${state.targetUserId} 的 ${incomingItems.length} 条新消息。`);
        if (document.hidden) {
          state.hiddenIncomingCount += incomingItems.length;
        }
        syncPageTitle();
      }
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
  state.recentEmojis = readRecentEmojis(userId);
  syncEmojiPickerItems();
}

function resetAuthenticatedState() {
  state.currentUserId = "";
  state.isAuthenticated = false;
  state.targetUserId = "";
  state.bindingStatus = "idle";
  state.bindingMessage = "请输入对方 ID 建立单向绑定。";
  state.isBound = false;
  state.messages = [];
  state.nextHistoryCursor = null;
  state.hasMoreHistory = false;
  state.historyLoadMoreStatus = "idle";
  state.historyStatus = "idle";
  state.historyMessage = "完成绑定后，这里会展示最近 10 条历史消息。";
  state.composerText = "";
  state.sendStatus = "idle";
  state.sendMessage = "";
  state.emojiPickerOpen = false;
  state.emojiPickerTab = DEFAULT_EMOJI_TAB;
  state.recentEmojis = [];
  state.emojiPickerItems = EMOJI_GROUPS[DEFAULT_EMOJI_TAB];
  state.inAppNotifications = [];
  state.hiddenIncomingCount = 0;
  state.pollStatus = "idle";
  state.latestPollServerTime = "";
  syncPageTitle();
}

function appendOutgoingMessage(message) {
  state.messages.push({
    ...message,
    direction: "outgoing",
    sentAt: message.sentAt || new Date().toISOString()
  });
}

function mapServerMessageToView(message, currentUserId) {
  return {
    id: message.messageId,
    type: message.type,
    text: message.text,
    imageData: message.imageData,
    emoji: message.emoji,
    sentAt: message.sentAt,
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

async function optimizeImageFile(file) {
  const originalImageData = await readFileAsDataUrl(file);
  const sourceImage = await loadImageElement(originalImageData);
  const sourceCanvas = createScaledCanvas(sourceImage, MAX_IMAGE_DIMENSION);
  let workingCanvas = sourceCanvas;
  let bestCandidate = await createImageCandidate(workingCanvas, originalImageData, file.size);

  if (bestCandidate.outputBytes <= TARGET_IMAGE_UPLOAD_BYTES) {
    return bestCandidate;
  }

  for (const quality of IMAGE_OUTPUT_QUALITIES) {
    const candidate = await createImageCandidateFromCanvas(workingCanvas, "image/webp", quality, file.size);

    if (candidate.outputBytes < bestCandidate.outputBytes) {
      bestCandidate = candidate;
    }

    if (candidate.outputBytes <= TARGET_IMAGE_UPLOAD_BYTES) {
      return candidate;
    }
  }

  while (
    Math.max(workingCanvas.width, workingCanvas.height) > MIN_IMAGE_DIMENSION &&
    bestCandidate.outputBytes > TARGET_IMAGE_UPLOAD_BYTES
  ) {
    const nextMaxDimension = Math.max(
      MIN_IMAGE_DIMENSION,
      Math.floor(Math.max(workingCanvas.width, workingCanvas.height) * 0.82)
    );
    workingCanvas = createScaledCanvas(workingCanvas, nextMaxDimension);

    for (const quality of IMAGE_OUTPUT_QUALITIES) {
      const candidate = await createImageCandidateFromCanvas(workingCanvas, "image/webp", quality, file.size);

      if (candidate.outputBytes < bestCandidate.outputBytes) {
        bestCandidate = candidate;
      }

      if (candidate.outputBytes <= TARGET_IMAGE_UPLOAD_BYTES) {
        return candidate;
      }
    }
  }

  if (bestCandidate.outputBytes > TARGET_IMAGE_UPLOAD_BYTES) {
    throw new Error("图片压缩后仍然过大，请换一张更小的图片。");
  }

  return bestCandidate;
}

function loadImageElement(imageData) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("读取图片失败，请重新选择。"));
    image.src = imageData;
  });
}

function createScaledCanvas(source, maxDimension) {
  const longestSide = Math.max(source.width, source.height);
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("当前浏览器无法处理图片压缩。");
  }

  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

async function createImageCandidate(canvas, fallbackImageData, originalBytes) {
  const fallbackBytes = estimateDataUrlBytes(fallbackImageData);

  if (fallbackBytes <= TARGET_IMAGE_UPLOAD_BYTES) {
    return {
      imageData: fallbackImageData,
      outputBytes: fallbackBytes,
      originalBytes
    };
  }

  return createImageCandidateFromCanvas(canvas, "image/webp", IMAGE_OUTPUT_QUALITIES[0], originalBytes);
}

async function createImageCandidateFromCanvas(canvas, mimeType, quality, originalBytes) {
  const dataUrl = canvas.toDataURL(mimeType, quality);

  return {
    imageData: dataUrl,
    outputBytes: estimateDataUrlBytes(dataUrl),
    originalBytes
  };
}

function estimateDataUrlBytes(dataUrl) {
  const [, encoded = ""] = dataUrl.split(",", 2);
  const paddingLength = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return Math.floor((encoded.length * 3) / 4) - paddingLength;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

function pushInAppNotification(text) {
  state.inAppNotifications = [
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      text
    },
    ...state.inAppNotifications
  ].slice(0, 5);
}

function handleNotificationDismiss(event) {
  const notificationId = event.currentTarget.getAttribute("data-notification-id");

  if (!notificationId) {
    return;
  }

  state.inAppNotifications = state.inAppNotifications.filter((item) => item.id !== notificationId);
  renderApp();
}

function clearNotifications() {
  state.inAppNotifications = [];
  renderApp();
}

function syncPageTitle() {
  document.title = state.hiddenIncomingCount > 0
    ? `(${state.hiddenIncomingCount}) ${DEFAULT_PAGE_TITLE}`
    : DEFAULT_PAGE_TITLE;
}

function handleVisibilityChange() {
  if (!document.hidden) {
    state.hiddenIncomingCount = 0;
    syncPageTitle();
  }
}

function syncEmojiPickerItems() {
  const items = state.emojiPickerTab === "recent"
    ? state.recentEmojis
    : EMOJI_GROUPS[state.emojiPickerTab] || EMOJI_GROUPS[DEFAULT_EMOJI_TAB];

  state.emojiPickerItems = items.length > 0 ? items : ["🙂"];
}

function rememberRecentEmoji(emoji) {
  const nextRecentEmojis = [emoji, ...state.recentEmojis.filter((item) => item !== emoji)].slice(0, 8);

  state.recentEmojis = nextRecentEmojis;
  persistRecentEmojis(nextRecentEmojis);
  if (state.emojiPickerTab === "recent") {
    syncEmojiPickerItems();
  }
}

function persistRecentEmojis(emojis) {
  if (!state.currentUserId) {
    return;
  }

  window.localStorage.setItem(
    `${RECENT_EMOJIS_STORAGE_KEY_PREFIX}${state.currentUserId}`,
    JSON.stringify(emojis)
  );
}

function readRecentEmojis(currentUserId) {
  if (!currentUserId) {
    return [];
  }

  const rawValue = window.localStorage.getItem(`${RECENT_EMOJIS_STORAGE_KEY_PREFIX}${currentUserId}`);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

window.addEventListener("beforeunload", stopPolling);
window.addEventListener("pagehide", stopPolling);
document.addEventListener("visibilitychange", handleVisibilityChange);

initializeApp();
