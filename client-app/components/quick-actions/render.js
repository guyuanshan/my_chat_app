const actionItems = [
  { icon: "📷", label: "图片", action: "pick-image" },
  { icon: "☺", label: "表情", action: "toggle-emoji-picker" },
  { icon: "＋", label: "更多", action: "noop", disabled: true },
  { icon: "🔔", label: "通知", action: "noop", disabled: true }
];

const emojiOptions = ["😀", "🥳", "👍", "❤️", "🎉", "😭"];

export function renderQuickActions(state) {
  const disabled = !state.isAuthenticated || !state.isBound || state.sendStatus === "submitting";
  const items = actionItems
    .map(
      (item) => `
        <div class="quick-actions__item">
          <button
            class="quick-actions__button"
            type="button"
            aria-label="${item.label}"
            data-action="${item.action}"
            ${disabled || item.disabled ? "disabled" : ""}
          >
            ${item.icon}
          </button>
          <div class="quick-actions__label">${item.label}</div>
        </div>
      `
    )
    .join("");

  const emojiPicker = state.emojiPickerOpen
    ? `
        <div class="quick-actions__emoji-picker" aria-label="表情选择">
          ${emojiOptions
            .map((emoji) => {
              return `
                <button
                  class="quick-actions__emoji-button"
                  type="button"
                  data-emoji-value="${emoji}"
                  aria-label="发送表情 ${emoji}"
                >
                  ${emoji}
                </button>
              `;
            })
            .join("")}
        </div>
      `
    : "";

  return `
    <section class="quick-actions" aria-label="快捷功能">
      ${items}
      ${emojiPicker}
      <input class="quick-actions__file-input" type="file" accept="image/*" hidden />
    </section>
  `;
}
