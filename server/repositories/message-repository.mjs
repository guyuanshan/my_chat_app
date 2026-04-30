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
    text: row.text || undefined,
    imageData: row.image_data || undefined,
    emoji: row.emoji || undefined,
    clientMessageId: row.client_message_id || undefined,
    sentAt: row.sent_at,
    status: row.status,
    rowId: Number(row.row_id)
  };
}

export async function createMessage(message) {
  await runSql(`
    INSERT INTO messages (
      message_id,
      conversation_id,
      sender_id,
      receiver_id,
      type,
      text,
      image_data,
      emoji,
      client_message_id,
      sent_at,
      status
    )
    VALUES (
      ${sqlString(message.messageId)},
      ${sqlString(message.conversationId)},
      ${sqlString(message.senderId)},
      ${sqlString(message.receiverId)},
      ${sqlString(message.type)},
      ${message.text ? sqlString(message.text) : "NULL"},
      ${message.imageData ? sqlString(message.imageData) : "NULL"},
      ${message.emoji ? sqlString(message.emoji) : "NULL"},
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
      image_data,
      emoji,
      client_message_id,
      sent_at,
      status,
      rowid AS row_id
    FROM messages
    WHERE message_id = ${sqlString(message.messageId)}
    LIMIT 1;
  `);

  return toMessage(rows[0]);
}

export async function listConversationMessages(conversationId, limit, cursor) {
  const cursorClause = cursor
    ? `
      AND (
        sent_at < ${sqlString(cursor.sentAt)}
        OR (sent_at = ${sqlString(cursor.sentAt)} AND rowid < ${Number(cursor.rowId)})
      )
    `
    : "";
  const rows = await querySql(`
    SELECT
      message_id,
      conversation_id,
      sender_id,
      receiver_id,
      type,
      text,
      image_data,
      emoji,
      client_message_id,
      sent_at,
      status,
      rowid AS row_id
    FROM messages
    WHERE conversation_id = ${sqlString(conversationId)}
      ${cursorClause}
    ORDER BY sent_at DESC, rowid DESC
    LIMIT ${Number(limit)};
  `);

  return rows.map(toMessage);
}

export async function listReceiverMessagesSince(receiverId, since, until) {
  const sinceClause = since ? `AND sent_at > ${sqlString(since)}` : "";
  const untilClause = until ? `AND sent_at <= ${sqlString(until)}` : "";
  const rows = await querySql(`
    SELECT
      message_id,
      conversation_id,
      sender_id,
      receiver_id,
      type,
      text,
      image_data,
      emoji,
      client_message_id,
      sent_at,
      status,
      rowid AS row_id
    FROM messages
    WHERE receiver_id = ${sqlString(receiverId)}
      ${sinceClause}
      ${untilClause}
    ORDER BY sent_at ASC, rowid ASC;
  `);

  return rows.map(toMessage);
}

export async function deleteMessagesBefore(thresholdSentAt) {
  const rows = await querySql(`
    SELECT COUNT(*) AS total
    FROM messages
    WHERE sent_at < ${sqlString(thresholdSentAt)};
  `);
  const total = Number(rows[0]?.total || 0);

  if (total === 0) {
    return 0;
  }

  await runSql(`
    DELETE FROM messages
    WHERE sent_at < ${sqlString(thresholdSentAt)};
  `);

  return total;
}
