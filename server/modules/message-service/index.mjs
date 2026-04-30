import { randomUUID } from "node:crypto";
import { requireAuthenticatedUser } from "../auth-service/index.mjs";
import { findBinding } from "../../repositories/binding-repository.mjs";
import {
  createMessage,
  listConversationMessages,
  listReceiverMessagesSince
} from "../../repositories/message-repository.mjs";

const MAX_USER_ID_LENGTH = 64;
const MAX_TEXT_LENGTH = 1000;
const MAX_EMOJI_LENGTH = 16;
const MAX_IMAGE_DATA_LENGTH = 350 * 1024;
const MAX_CONVERSATION_LIMIT = 100;

function normalizeRequiredId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmoji(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeImageData(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSince(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeCursor(value) {
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

  if (senderId.length > MAX_USER_ID_LENGTH) {
    return `senderId must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (receiverId.length > MAX_USER_ID_LENGTH) {
    return `receiverId must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return `text must be at most ${MAX_TEXT_LENGTH} characters.`;
  }

  return null;
}

function validateEmojiMessageInput(senderId, receiverId, emoji) {
  if (!senderId) {
    return "senderId is required.";
  }

  if (!receiverId) {
    return "receiverId is required.";
  }

  if (senderId === receiverId) {
    return "senderId and receiverId must be different.";
  }

  if (!emoji) {
    return "emoji is required.";
  }

  if (senderId.length > MAX_USER_ID_LENGTH) {
    return `senderId must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (receiverId.length > MAX_USER_ID_LENGTH) {
    return `receiverId must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (emoji.length > MAX_EMOJI_LENGTH) {
    return `emoji must be at most ${MAX_EMOJI_LENGTH} characters.`;
  }

  return null;
}

function validateImageMessageInput(senderId, receiverId, imageData) {
  if (!senderId) {
    return "senderId is required.";
  }

  if (!receiverId) {
    return "receiverId is required.";
  }

  if (senderId === receiverId) {
    return "senderId and receiverId must be different.";
  }

  if (!imageData) {
    return "imageData is required.";
  }

  if (senderId.length > MAX_USER_ID_LENGTH) {
    return `senderId must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (receiverId.length > MAX_USER_ID_LENGTH) {
    return `receiverId must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(imageData)) {
    return "imageData must be a valid image data URL.";
  }

  if (imageData.length > MAX_IMAGE_DATA_LENGTH) {
    return `imageData must be at most ${MAX_IMAGE_DATA_LENGTH} characters.`;
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

function validateConversationQueryInput(userA, userB, limit, cursor) {
  if (!userA) {
    return "userA is required.";
  }

  if (!userB) {
    return "userB is required.";
  }

  if (userA === userB) {
    return "userA and userB must be different.";
  }

  if (userA.length > MAX_USER_ID_LENGTH) {
    return `userA must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (userB.length > MAX_USER_ID_LENGTH) {
    return `userB must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    return "limit must be a positive integer.";
  }

  if (limit > MAX_CONVERSATION_LIMIT) {
    return `limit must be at most ${MAX_CONVERSATION_LIMIT}.`;
  }

  if (cursor) {
    try {
      decodeConversationCursor(cursor);
    } catch {
      return "cursor is invalid.";
    }
  }

  return null;
}

function encodeConversationCursor(message) {
  return Buffer.from(JSON.stringify({
    sentAt: message.sentAt,
    rowId: message.rowId
  }), "utf8").toString("base64url");
}

function decodeConversationCursor(cursor) {
  const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

  if (
    !parsed ||
    typeof parsed.sentAt !== "string" ||
    !parsed.sentAt ||
    !Number.isInteger(parsed.rowId) ||
    parsed.rowId <= 0
  ) {
    throw new Error("INVALID_CURSOR");
  }

  return {
    sentAt: parsed.sentAt,
    rowId: parsed.rowId
  };
}

function validatePollQueryInput(receiverId, since) {
  if (!receiverId) {
    return "receiverId is required.";
  }

  if (receiverId.length > MAX_USER_ID_LENGTH) {
    return `receiverId must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (since && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(since)) {
    return "since must use serverTime format.";
  }

  return null;
}

function createServerTimestamp(date = new Date()) {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

export async function sendTextMessage(input, authContext) {
  const authResult = requireAuthenticatedUser(authContext);

  if (!authResult.ok) {
    return authResult;
  }

  const senderId = normalizeRequiredId(input.senderId || authResult.userId);
  const receiverId = normalizeRequiredId(input.receiverId);
  const text = normalizeText(input.text);
  const clientMessageId = normalizeOptionalId(input.clientMessageId);

  if (senderId !== authResult.userId) {
    return {
      ok: false,
      statusCode: 403,
      code: "FORBIDDEN_USER_CONTEXT",
      message: "senderId must match the authenticated user."
    };
  }

  const validationError = validateTextMessageInput(senderId, receiverId, text);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_TEXT_MESSAGE_INPUT",
      message: validationError
    };
  }

  const binding = await findBinding(senderId, receiverId);

  if (!binding) {
    return {
      ok: false,
      statusCode: 403,
      code: "BINDING_REQUIRED",
      message: "senderId must bind receiverId before sending messages."
    };
  }

  const message = await createMessage({
    messageId: randomUUID(),
    conversationId: createConversationId(senderId, receiverId),
    senderId,
    receiverId,
    type: "text",
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

export async function sendEmojiMessage(input, authContext) {
  const authResult = requireAuthenticatedUser(authContext);

  if (!authResult.ok) {
    return authResult;
  }

  const senderId = normalizeRequiredId(input.senderId || authResult.userId);
  const receiverId = normalizeRequiredId(input.receiverId);
  const emoji = normalizeEmoji(input.emoji);
  const clientMessageId = normalizeOptionalId(input.clientMessageId);

  if (senderId !== authResult.userId) {
    return {
      ok: false,
      statusCode: 403,
      code: "FORBIDDEN_USER_CONTEXT",
      message: "senderId must match the authenticated user."
    };
  }

  const validationError = validateEmojiMessageInput(senderId, receiverId, emoji);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_EMOJI_MESSAGE_INPUT",
      message: validationError
    };
  }

  const binding = await findBinding(senderId, receiverId);

  if (!binding) {
    return {
      ok: false,
      statusCode: 403,
      code: "BINDING_REQUIRED",
      message: "senderId must bind receiverId before sending messages."
    };
  }

  const message = await createMessage({
    messageId: randomUUID(),
    conversationId: createConversationId(senderId, receiverId),
    senderId,
    receiverId,
    type: "emoji",
    emoji,
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

export async function sendImageMessage(input, authContext) {
  const authResult = requireAuthenticatedUser(authContext);

  if (!authResult.ok) {
    return authResult;
  }

  const senderId = normalizeRequiredId(input.senderId || authResult.userId);
  const receiverId = normalizeRequiredId(input.receiverId);
  const imageData = normalizeImageData(input.imageData);
  const clientMessageId = normalizeOptionalId(input.clientMessageId);

  if (senderId !== authResult.userId) {
    return {
      ok: false,
      statusCode: 403,
      code: "FORBIDDEN_USER_CONTEXT",
      message: "senderId must match the authenticated user."
    };
  }

  const validationError = validateImageMessageInput(senderId, receiverId, imageData);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_IMAGE_MESSAGE_INPUT",
      message: validationError
    };
  }

  const binding = await findBinding(senderId, receiverId);

  if (!binding) {
    return {
      ok: false,
      statusCode: 403,
      code: "BINDING_REQUIRED",
      message: "senderId must bind receiverId before sending messages."
    };
  }

  const message = await createMessage({
    messageId: randomUUID(),
    conversationId: createConversationId(senderId, receiverId),
    senderId,
    receiverId,
    type: "image",
    imageData,
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

export async function pollMessages(query, authContext) {
  const authResult = requireAuthenticatedUser(authContext);

  if (!authResult.ok) {
    return authResult;
  }

  const receiverId = normalizeRequiredId(query.receiverId || authResult.userId);
  const since = normalizeSince(query.since);

  if (receiverId !== authResult.userId) {
    return {
      ok: false,
      statusCode: 403,
      code: "FORBIDDEN_USER_CONTEXT",
      message: "receiverId must match the authenticated user."
    };
  }

  const validationError = validatePollQueryInput(receiverId, since);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_POLL_QUERY",
      message: validationError
    };
  }

  const pollStartedAt = createServerTimestamp();
  const items = await listReceiverMessagesSince(receiverId, since, pollStartedAt);

  return {
    ok: true,
    statusCode: 200,
    data: {
      items: items.map(stripMessageRowId),
      serverTime: pollStartedAt
    }
  };
}

export async function getConversationMessages(query, authContext) {
  const authResult = requireAuthenticatedUser(authContext);

  if (!authResult.ok) {
    return authResult;
  }

  const userA = normalizeRequiredId(query.userA);
  const userB = normalizeRequiredId(query.userB);
  const limit = normalizeLimit(query.limit);
  const cursor = normalizeCursor(query.cursor);

  if (userA !== authResult.userId && userB !== authResult.userId) {
    return {
      ok: false,
      statusCode: 403,
      code: "FORBIDDEN_USER_CONTEXT",
      message: "The authenticated user must be part of the conversation."
    };
  }

  const validationError = validateConversationQueryInput(userA, userB, limit, cursor);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_CONVERSATION_QUERY",
      message: validationError
    };
  }

  const conversationId = createConversationId(userA, userB);
  const items = await listConversationMessages(
    conversationId,
    limit + 1,
    cursor ? decodeConversationCursor(cursor) : undefined
  );
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? encodeConversationCursor(pageItems[pageItems.length - 1]) : null;

  return {
    ok: true,
    statusCode: 200,
    data: {
      items: pageItems.reverse().map(stripMessageRowId),
      nextCursor,
      hasMore
    }
  };
}

function stripMessageRowId(message) {
  return {
    messageId: message.messageId,
    conversationId: message.conversationId,
    senderId: message.senderId,
    receiverId: message.receiverId,
    type: message.type,
    text: message.text,
    imageData: message.imageData,
    emoji: message.emoji,
    clientMessageId: message.clientMessageId,
    sentAt: message.sentAt,
    status: message.status
  };
}
