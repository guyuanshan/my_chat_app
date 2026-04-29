import { querySql, runSql, sqlString } from "./sqlite-client.mjs";

function toMessage(row) {
  if (!row) {
    return null;
  }

  return {
    messageId: row.message_id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    type: row.type,
    text: row.text,
    clientMessageId: row.client_message_id || undefined,
    sentAt: row.sent_at,
    status: row.status
  };
}

export async function createTextMessage(message) {
  await runSql(`
    INSERT INTO messages (
      message_id,
      conversation_id,
      sender_id,
      receiver_id,
      type,
      text,
      client_message_id,
      sent_at,
      status
    )
    VALUES (
      ${sqlString(message.messageId)},
      ${sqlString(message.conversationId)},
      ${sqlString(message.senderId)},
      ${sqlString(message.receiverId)},
      'text',
      ${sqlString(message.text)},
      ${message.clientMessageId ? sqlString(message.clientMessageId) : "NULL"},
      ${sqlString(message.sentAt)},
      'sent'
    );
  `);

  const rows = await querySql(`
    SELECT
      message_id,
      conversation_id,
      sender_id,
      receiver_id,
      type,
      text,
      client_message_id,
      sent_at,
      status
    FROM messages
    WHERE message_id = ${sqlString(message.messageId)}
    LIMIT 1;
  `);

  return toMessage(rows[0]);
}

export async function listConversationMessages(conversationId, limit) {
  const rows = await querySql(`
    SELECT
      message_id,
      conversation_id,
      sender_id,
      receiver_id,
      type,
      text,
      client_message_id,
      sent_at,
      status
    FROM messages
    WHERE conversation_id = ${sqlString(conversationId)}
    ORDER BY sent_at DESC, rowid DESC
    LIMIT ${Number(limit)};
  `);

  return rows.map(toMessage);
}

export async function listReceiverMessagesSince(receiverId, since) {
  const sinceClause = since ? `AND sent_at > ${sqlString(since)}` : "";
  const rows = await querySql(`
    SELECT
      message_id,
      conversation_id,
      sender_id,
      receiver_id,
      type,
      text,
      client_message_id,
      sent_at,
      status
    FROM messages
    WHERE receiver_id = ${sqlString(receiverId)}
      ${sinceClause}
    ORDER BY sent_at ASC, rowid ASC;
  `);

  return rows.map(toMessage);
}
