function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMessageTime(sentAt) {
  if (!sentAt) {
    return "";
  }

  const date = new Date(sentAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function renderMessageItem(message) {
  const directionClass = message.direction === "outgoing" ? "message-item--outgoing" : "message-item--incoming";
  const senderLabel = message.direction === "outgoing" ? "我" : "对方";
  const timestamp = formatMessageTime(message.sentAt);
  let content = "";

  if (message.type === "image") {
    content = `
      <div class="message-item__bubble message-item__bubble--image">
        <img class="message-item__image" src="${message.imageData}" alt="聊天图片" />
      </div>
    `;
  } else if (message.type === "emoji") {
    content = `
      <div class="message-item__bubble message-item__bubble--emoji">${escapeHtml(message.emoji || "")}</div>
    `;
  } else {
    content = `
      <div class="message-item__bubble">${escapeHtml(message.text || "")}</div>
    `;
  }

  return `
    <article class="message-item ${directionClass}">
      <div class="message-item__meta">
        <span class="message-item__sender">${senderLabel}</span>
        <span class="message-item__time">${timestamp}</span>
      </div>
      ${content}
    </article>
  `;
}
