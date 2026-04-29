-- Step extension: support image and emoji messages on top of the min loop.

CREATE TABLE IF NOT EXISTS messages_v2 (
  message_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'emoji')),
  text TEXT,
  image_data TEXT,
  emoji TEXT,
  client_message_id TEXT,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status = 'sent'),
  CHECK (sender_id <> receiver_id),
  CHECK (
    (type = 'text' AND text IS NOT NULL AND length(trim(text)) > 0 AND image_data IS NULL AND emoji IS NULL) OR
    (type = 'image' AND image_data IS NOT NULL AND text IS NULL AND emoji IS NULL) OR
    (type = 'emoji' AND emoji IS NOT NULL AND length(trim(emoji)) > 0 AND text IS NULL AND image_data IS NULL)
  )
);

INSERT INTO messages_v2 (
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
SELECT
  message_id,
  conversation_id,
  sender_id,
  receiver_id,
  type,
  text,
  NULL AS image_data,
  NULL AS emoji,
  client_message_id,
  sent_at,
  status
FROM messages;

DROP TABLE messages;

ALTER TABLE messages_v2 RENAME TO messages;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_sent_at
  ON messages (conversation_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_sent_at
  ON messages (receiver_id, sent_at);
