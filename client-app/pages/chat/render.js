import { renderInputBar } from "../../components/input-bar/render.js";
import { renderMessageList } from "../../components/message-list/render.js";
import { renderQuickActions } from "../../components/quick-actions/render.js";
import { renderTopBar } from "../../components/top-bar/render.js";

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
        <div class="binding-entry__label">当前固定用户 ID</div>
        <div class="binding-entry__value">${state.currentUserId}</div>
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

export function renderChatPage(state) {
  return `
    <main class="chat-page">
      <section class="chat-shell" aria-label="聊天页面">
        ${renderTopBar(state)}
        ${renderQuickActions()}
        ${renderBindingEntry(state)}
        ${renderMessageList(state)}
        ${renderInputBar(state)}
      </section>
    </main>
  `;
}
