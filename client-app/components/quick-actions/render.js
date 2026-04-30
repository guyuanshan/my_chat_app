const actionItems = [
  { icon: "📷", label: "图片", action: "pick-image" },
  { icon: "☺", label: "表情", action: "toggle-emoji-picker" },
  { icon: "＋", label: "更多", action: "noop", disabled: true },
  { icon: "🔔", label: "通知", action: "noop", disabled: true }
];

const emojiGroups = [
  { id: "recent", label: "最近" },
  { id: "smile", label: "笑脸", items: ["😀", "😄", "😊", "😉", "😎", "🥳", "🤩", "😭"] },
  { id: "gesture", label: "手势", items: ["👍", "👋", "🙏", "👏", "🤝", "💪", "👌", "✌️"] },
  { id: "heart", label: "喜欢", items: ["❤️", "💛", "💚", "💙", "💜", "🫶", "💕", "💖"] },
  { id: "mood", label: "气氛", items: ["🎉", "✨", "🔥", "🌈", "🎈", "🌟", "🍀", "☀️"] }
];

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
          <div class="quick-actions__emoji-tabs">
            ${emojiGroups
              .map((group) => {
                const selectedClass = state.emojiPickerTab === group.id
                  ? "quick-actions__emoji-tab--selected"
                  : "";

                return `
                  <button
                    class="quick-actions__emoji-tab ${selectedClass}"
                    type="button"
                    data-emoji-tab="${group.id}"
                  >
                    ${group.label}
                  </button>
                `;
              })
              .join("")}
          </div>
          <div class="quick-actions__emoji-grid">
            ${(state.emojiPickerItems || [])
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
