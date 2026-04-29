export function renderTopBar(state) {
  const title = state.isAuthenticated ? state.targetUserId || state.currentUserId || "聊天" : "登录";
  const statusText = !state.isAuthenticated
    ? state.authStatus === "loading"
      ? "正在恢复登录状态"
      : "请先登录"
    : state.isBound
      ? state.historyStatus === "loading"
        ? "已绑定，正在加载历史消息"
        : "已绑定"
      : "未绑定";
  const actionLabel = state.isAuthenticated ? "退出" : "⋯";
  const actionAttr = state.isAuthenticated ? 'data-action="logout"' : "";

  return `
    <header class="top-bar">
      <button class="top-bar__icon-button" type="button" aria-label="返回">
        ‹
      </button>
      <div class="top-bar__center">
        <h1 class="top-bar__title">${title}</h1>
        <p class="top-bar__status">${statusText}</p>
      </div>
      <button class="top-bar__icon-button" type="button" aria-label="更多" ${actionAttr}>
        ${actionLabel}
      </button>
    </header>
  `;
}
