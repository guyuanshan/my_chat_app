export function renderTopBar(state) {
  const title = state.isAuthenticated ? state.targetUserId || "今天聊点什么" : "欢迎回来";
  const statusText = !state.isAuthenticated
    ? state.authStatus === "loading"
      ? "正在恢复登录状态"
      : "登录后继续你们的聊天"
    : state.isBound
      ? state.historyStatus === "loading"
        ? "历史消息加载中"
        : `与你的 ${state.targetUserId} 会话已连接`
      : "还没有绑定聊天对象";
  const actionLabel = state.isAuthenticated ? "退出登录" : "···";
  const actionAttr = state.isAuthenticated ? 'data-action="logout"' : "";
  const leadLabel = state.isAuthenticated ? state.currentUserId : "CHAT";

  return `
    <header class="top-bar">
      <div class="top-bar__lead" aria-label="当前用户">${leadLabel}</div>
      <div class="top-bar__center">
        <h1 class="top-bar__title">${title}</h1>
        <p class="top-bar__status">${statusText}</p>
      </div>
      <button class="top-bar__action" type="button" aria-label="更多" ${actionAttr}>
        ${actionLabel}
      </button>
    </header>
  `;
}
