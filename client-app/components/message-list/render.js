import { renderMessageItem } from "../message-item/render.js";

export function renderMessageList(state) {
  const items = state.messages.map((message) => renderMessageItem(message)).join("");
  const baseNotice = !state.isAuthenticated
    ? "请先登录。"
    : state.pollStatus === "error"
      ? `${state.historyMessage} 新消息同步暂时失败。`
      : state.historyMessage;
  const notice =
    state.pollStatus === "active"
      ? `${baseNotice} 当前正在轮询新消息。`
      : baseNotice;

  return `
    <section class="message-list" aria-label="消息列表">
      <div class="message-list__date">今天</div>
      <div class="message-list__notice">${notice}</div>
      <div class="message-list__items">
        ${items || '<div class="message-list__empty">暂无消息</div>'}
      </div>
    </section>
  `;
}
