export function renderTopBar(state) {
  const title = state.targetUserId || "固定联系人";
  const statusText = state.isBound
    ? state.historyStatus === "loading"
      ? "已绑定，正在加载历史消息"
      : "已绑定"
    : "未绑定";

  return `
    <header class="top-bar">
      <button class="top-bar__icon-button" type="button" aria-label="返回">
        ‹
      </button>
      <div class="top-bar__center">
        <h1 class="top-bar__title">${title}</h1>
        <p class="top-bar__status">${statusText}</p>
      </div>
      <button class="top-bar__icon-button" type="button" aria-label="更多">
        ⋯
      </button>
    </header>
  `;
}
