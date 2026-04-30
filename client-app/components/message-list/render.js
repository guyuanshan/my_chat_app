import { renderMessageItem } from "../message-item/render.js";

export function renderMessageList(state) {
  const items = state.messages.map((message) => renderMessageItem(message)).join("");
  const notifications = (state.inAppNotifications || [])
    .map((item) => {
      return `
        <div class="message-list__notification">
          <span>${item.text}</span>
          <button
            class="message-list__notification-dismiss"
            type="button"
            data-action="dismiss-notification"
            data-notification-id="${item.id}"
            aria-label="关闭通知"
          >
            关闭
          </button>
        </div>
      `;
    })
    .join("");
  const notificationArea = notifications
    ? `
        <div class="message-list__notifications" aria-label="页内通知">
          ${notifications}
          <button class="message-list__notification-clear" type="button" data-action="clear-notifications">
            清空通知
          </button>
        </div>
      `
    : "";
  const loadMoreButton = state.isAuthenticated && state.isBound
    ? `
        <button
          class="message-list__load-more"
          type="button"
          data-action="load-more-history"
          ${!state.hasMoreHistory || state.historyLoadMoreStatus === "loading" ? "disabled" : ""}
        >
          ${state.historyLoadMoreStatus === "loading" ? "正在加载更早消息..." : "加载更多消息"}
        </button>
      `
    : "";
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
      <div class="message-list__card">
        <div class="message-list__header">
          <div class="message-list__date">今天</div>
          <div class="message-list__headline">消息流</div>
        </div>
        ${notificationArea}
        <div class="message-list__notice">${notice}</div>
        ${loadMoreButton}
        <div class="message-list__items">
          ${items || '<div class="message-list__empty">还没有消息，发一句问候开始今天的聊天吧。</div>'}
        </div>
      </div>
    </section>
  `;
}
