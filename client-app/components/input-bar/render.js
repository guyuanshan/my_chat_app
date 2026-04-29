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
      ${renderSendFeedback(state)}
      <input
        class="input-bar__field"
        type="text"
        name="text"
        value="${state.composerText}"
        placeholder="输入消息"
        autocomplete="off"
        ${disabled}
      />
      <button class="input-bar__send" type="submit" ${disabled}>发送</button>
    </form>
  `;
}
