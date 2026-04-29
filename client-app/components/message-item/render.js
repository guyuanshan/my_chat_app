export function renderMessageItem(message) {
  const directionClass = message.direction === "outgoing" ? "message-item--outgoing" : "message-item--incoming";

  return `
    <article class="message-item ${directionClass}">
      <div class="message-item__bubble">${message.text}</div>
    </article>
  `;
}
