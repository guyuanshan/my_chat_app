import { renderInputBar } from "../../components/input-bar/render.js";
import { renderMessageList } from "../../components/message-list/render.js";
import { renderQuickActions } from "../../components/quick-actions/render.js";
import { renderTopBar } from "../../components/top-bar/render.js";

function renderAuthEntry(state) {
  const options = state.loginUserOptions
    .map(
      (userId) => `
        <option value="${userId}" ${state.loginUserId === userId ? "selected" : ""}>${userId}</option>
      `
    )
    .join("");

  const feedbackClass = state.authStatus === "error" ? "auth-entry__feedback--error" : "";

  return `
    <section class="auth-entry" aria-label="登录入口">
      <div class="auth-entry__title">登录后再进入聊天闭环</div>
      <form class="auth-entry__form">
        <label class="auth-entry__label">
          <span>用户</span>
          <select class="auth-entry__select" name="loginUserId">
            ${options}
          </select>
        </label>
        <label class="auth-entry__label">
          <span>密码</span>
          <input
            class="auth-entry__field"
            type="password"
            name="password"
            value="${state.loginPassword}"
            placeholder="输入密码"
            autocomplete="off"
          />
        </label>
        <button class="auth-entry__submit" type="submit">登录</button>
      </form>
      <p class="auth-entry__hint">开发账号：user_a / pass_user_a，user_b / pass_user_b</p>
      <div class="auth-entry__switches">
        <a class="auth-entry__switch-link" href="/?user=user_a" target="_blank" rel="noreferrer">新开 user_a 标签页</a>
        <a class="auth-entry__switch-link" href="/?user=user_b" target="_blank" rel="noreferrer">新开 user_b 标签页</a>
      </div>
      <p class="auth-entry__feedback ${feedbackClass}">${state.authMessage}</p>
    </section>
  `;
}

function renderBindingEntry(state) {
  const statusClass =
    state.bindingStatus === "error"
      ? "binding-entry__feedback--error"
      : state.isBound
        ? "binding-entry__feedback--success"
        : "";

  return `
    <section class="binding-entry" aria-label="绑定入口">
      <div class="binding-entry__meta">
        <div class="binding-entry__eyebrow">连接聊天对象</div>
        <div class="binding-entry__value">${state.currentUserId}</div>
        <div class="binding-entry__tip">先选择要聊天的对象，绑定成功后就能开始同步历史消息和新消息。</div>
      </div>
      <form class="binding-entry__form">
        <input
          class="binding-entry__field"
          type="text"
          name="targetUserId"
          value="${state.targetUserId}"
          placeholder="输入对方 ID"
          autocomplete="off"
        />
        <button class="binding-entry__submit" type="submit">建立绑定</button>
      </form>
      <p class="binding-entry__feedback ${statusClass}">${state.bindingMessage}</p>
    </section>
  `;
}

function renderChatHero(state) {
  const partnerName = state.targetUserId || "等待绑定";
  const title = state.isBound ? `正在和 ${partnerName} 聊天` : "先绑定，再开始对话";
  const subtitle = state.isBound
    ? "消息会自动同步，图片、表情和历史记录都会保留在当前会话里。"
    : "绑定完成后，这里会自动进入你们的专属消息流。";
  const statusToneClass = state.isBound ? "chat-hero__status--active" : "";
  const statusText = state.isBound ? "已连接" : "待连接";
  const selfInitial = (state.currentUserId || "?").slice(0, 1).toUpperCase();
  const partnerInitial = partnerName.slice(0, 1).toUpperCase();

  return `
    <section class="chat-hero" aria-label="会话概览">
      <div class="chat-hero__copy">
        <p class="chat-hero__eyebrow">双人聊天空间</p>
        <h2 class="chat-hero__title">${title}</h2>
        <p class="chat-hero__subtitle">${subtitle}</p>
      </div>
      <div class="chat-hero__panel">
        <div class="chat-hero__avatars" aria-hidden="true">
          <span class="chat-hero__avatar chat-hero__avatar--self">${selfInitial}</span>
          <span class="chat-hero__avatar chat-hero__avatar--partner">${partnerInitial}</span>
        </div>
        <div class="chat-hero__details">
          <div class="chat-hero__name">${state.currentUserId} · ${partnerName}</div>
          <div class="chat-hero__status ${statusToneClass}">${statusText}</div>
        </div>
      </div>
    </section>
  `;
}

export function renderChatPage(state) {
  const authenticatedContent = state.isAuthenticated
    ? `
        <section class="chat-page__body" aria-label="聊天主区域">
          ${renderChatHero(state)}
          ${renderQuickActions(state)}
          ${renderBindingEntry(state)}
          ${renderMessageList(state)}
          ${renderInputBar(state)}
        </section>
      `
    : `
        ${renderAuthEntry(state)}
      `;

  return `
    <main class="chat-page">
      <section class="chat-shell" aria-label="聊天页面">
        ${renderTopBar(state)}
        ${authenticatedContent}
      </section>
    </main>
  `;
}
