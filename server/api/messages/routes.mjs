import {
  getConversationMessages,
  pollMessages,
  sendEmojiMessage,
  sendImageMessage,
  sendTextMessage
} from "../../modules/message-service/index.mjs";
import { sendError, sendOk } from "../../utils/http.mjs";
import { readJsonBody } from "../../utils/request-body.mjs";

export async function handleMessageRoute(request, response, url, authContext) {
  if (request.method === "GET" && url.pathname === "/messages/poll") {
    const result = await pollMessages({
      receiverId: url.searchParams.get("receiverId"),
      since: url.searchParams.get("since")
    }, authContext);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  if (request.method === "GET" && url.pathname === "/messages/conversation") {
    const result = await getConversationMessages({
      userA: url.searchParams.get("userA"),
      userB: url.searchParams.get("userB"),
      limit: url.searchParams.get("limit"),
      cursor: url.searchParams.get("cursor")
    }, authContext);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/messages/text") {
    let body;

    try {
      body = await readJsonBody(request);
    } catch (error) {
      if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
        sendError(response, 413, "REQUEST_BODY_TOO_LARGE", "Request body must be at most 16 KB.");
        return true;
      }

      sendError(response, 400, "INVALID_JSON", "Request body must be valid JSON.");
      return true;
    }

    const result = await sendTextMessage(body, authContext);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/messages/emoji") {
    let body;

    try {
      body = await readJsonBody(request);
    } catch (error) {
      if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
        sendError(response, 413, "REQUEST_BODY_TOO_LARGE", "Request body must be at most 16 KB.");
        return true;
      }

      sendError(response, 400, "INVALID_JSON", "Request body must be valid JSON.");
      return true;
    }

    const result = await sendEmojiMessage(body, authContext);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/messages/image") {
    let body;

    try {
      body = await readJsonBody(request, {
        maxBytes: 512 * 1024
      });
    } catch (error) {
      if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
        sendError(response, 413, "REQUEST_BODY_TOO_LARGE", "Request body must be at most 512 KB.");
        return true;
      }

      sendError(response, 400, "INVALID_JSON", "Request body must be valid JSON.");
      return true;
    }

    const result = await sendImageMessage(body, authContext);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  return false;
}
