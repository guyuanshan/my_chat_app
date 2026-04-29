-- Current minimal schema for the two-person chat min loop.
-- Step 2 only defines data shape. It does not implement API or repository logic.

CREATE TABLE IF NOT EXISTS bindings (
  binding_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status = 'active'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (owner_id <> target_id),
  UNIQUE (owner_id, target_id)
);

CREATE TABLE IF NOT EXISTS messages (
  message_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type = 'text'),
  text TEXT NOT NULL CHECK (length(trim(text)) > 0),
  client_message_id TEXT,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status = 'sent'),
  CHECK (sender_id <> receiver_id)
);

-- Supports fetching the latest messages in one conversation.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sent_at
  ON messages (conversation_id, sent_at);

-- Supports polling new messages for one receiver.
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sent_at
  ON messages (receiver_id, sent_at);
