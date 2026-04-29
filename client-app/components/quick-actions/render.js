const actionItems = [
  { icon: "+", label: "添加" },
  { icon: "📷", label: "图片" },
  { icon: "☺", label: "表情" },
  { icon: "🔔", label: "通知" }
];

export function renderQuickActions() {
  const items = actionItems
    .map(
      (item) => `
        <div class="quick-actions__item">
          <button class="quick-actions__button" type="button" aria-label="${item.label}">
            ${item.icon}
          </button>
          <div class="quick-actions__label">${item.label}</div>
        </div>
      `
    )
    .join("");

  return `
    <section class="quick-actions" aria-label="快捷功能">
      ${items}
    </section>
  `;
}
