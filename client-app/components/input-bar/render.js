function renderSendFeedback(state) {
  if (!state.sendMessage) {
    return '<p class="input-bar__feedback"></p>';
  }

  const modifierClass = state.sendStatus === "error" ? "input-bar__feedback--error" : "";
  return `<p class="input-bar__feedback ${modifierClass}">${state.sendMessage}</p>`;
}

export function renderInputBar(state) {
  const disabled = !state.isBound || state.sendStatus === "submitting" ? "disabled" : "";

  return `
    <form class="input-bar">
      <div class="input-bar__hint">按下发送，把这一刻传过去。</div>
      ${renderSendFeedback(state)}
      <input
        class="input-bar__field"
        type="text"
        name="text"
        value="${state.composerText}"
        placeholder="输入一条想说的话..."
        autocomplete="off"
        ${disabled}
      />
      <button class="input-bar__send" type="submit" ${disabled}>发送</button>
    </form>
  `;
}
