import {
  getConversationMessages,
  pollMessages,
  sendTextMessage
} from "../../modules/message-service/index.mjs";
import { sendError, sendOk } from "../../utils/http.mjs";
import { readJsonBody } from "../../utils/request-body.mjs";

export async function handleMessageRoute(request, response, url) {
  if (request.method === "GET" && url.pathname === "/messages/poll") {
    const result = await pollMessages({
      receiverId: url.searchParams.get("receiverId"),
      since: url.searchParams.get("since")
    });

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
      limit: url.searchParams.get("limit")
    });

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
    } catch {
      sendError(response, 400, "INVALID_JSON", "Request body must be valid JSON.");
      return true;
    }

    const result = await sendTextMessage(body);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  return false;
}
