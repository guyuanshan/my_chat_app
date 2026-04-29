import { randomUUID } from "node:crypto";
import {
  createTextMessage,
  listConversationMessages,
  listReceiverMessagesSince
} from "../../repositories/message-repository.mjs";

function normalizeRequiredId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSince(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function createConversationId(userAInput, userBInput) {
  const userA = normalizeRequiredId(userAInput);
  const userB = normalizeRequiredId(userBInput);
  const [firstUserId, secondUserId] = [userA, userB].sort();

  return `dm:${firstUserId}:${secondUserId}`;
}

function validateTextMessageInput(senderId, receiverId, text) {
  if (!senderId) {
    return "senderId is required.";
  }

  if (!receiverId) {
    return "receiverId is required.";
  }

  if (senderId === receiverId) {
    return "senderId and receiverId must be different.";
  }

  if (!text) {
    return "text is required.";
  }

  return null;
}

function normalizeLimit(value) {
  if (value === null || value === undefined || value === "") {
    return 10;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? NaN : parsed;
}

function validateConversationQueryInput(userA, userB, limit) {
  if (!userA) {
    return "userA is required.";
  }

  if (!userB) {
    return "userB is required.";
  }

  if (userA === userB) {
    return "userA and userB must be different.";
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    return "limit must be a positive integer.";
  }

  return null;
}

function validatePollQueryInput(receiverId, since) {
  if (!receiverId) {
    return "receiverId is required.";
  }

  if (since && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(since)) {
    return "since must use serverTime format.";
  }

  return null;
}

function createServerTimestamp(date = new Date()) {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

export async function sendTextMessage(input) {
  const senderId = normalizeRequiredId(input.senderId);
  const receiverId = normalizeRequiredId(input.receiverId);
  const text = normalizeText(input.text);
  const clientMessageId = normalizeOptionalId(input.clientMessageId);
  const validationError = validateTextMessageInput(senderId, receiverId, text);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_TEXT_MESSAGE_INPUT",
      message: validationError
    };
  }

  const message = await createTextMessage({
    messageId: randomUUID(),
    conversationId: createConversationId(senderId, receiverId),
    senderId,
    receiverId,
    text,
    clientMessageId,
    sentAt: createServerTimestamp()
  });

  return {
    ok: true,
    statusCode: 201,
    data: {
      messageId: message.messageId,
      sentAt: message.sentAt,
      status: message.status
    }
  };
}

export async function pollMessages(query) {
  const receiverId = normalizeRequiredId(query.receiverId);
  const since = normalizeSince(query.since);
  const validationError = validatePollQueryInput(receiverId, since);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_POLL_QUERY",
      message: validationError
    };
  }

  const items = await listReceiverMessagesSince(receiverId, since);

  return {
    ok: true,
    statusCode: 200,
    data: {
      items,
      serverTime: createServerTimestamp()
    }
  };
}

export async function getConversationMessages(query) {
  const userA = normalizeRequiredId(query.userA);
  const userB = normalizeRequiredId(query.userB);
  const limit = normalizeLimit(query.limit);
  const validationError = validateConversationQueryInput(userA, userB, limit);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_CONVERSATION_QUERY",
      message: validationError
    };
  }

  const conversationId = createConversationId(userA, userB);
  const items = await listConversationMessages(conversationId, limit);

  return {
    ok: true,
    statusCode: 200,
    data: {
      items: items.reverse()
    }
  };
}
