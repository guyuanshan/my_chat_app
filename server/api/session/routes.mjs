import {
  getAllowedUserIds,
  getCurrentSession,
  loginUser,
  logoutUser
} from "../../modules/auth-service/index.mjs";
import { sendError, sendOk } from "../../utils/http.mjs";
import { readJsonBody } from "../../utils/request-body.mjs";

export async function handleSessionRoute(request, response, url, authContext) {
  if (request.method === "GET" && url.pathname === "/session/options") {
    sendOk(response, {
      userIds: getAllowedUserIds()
    });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/session/me") {
    const result = getCurrentSession(authContext);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/session/logout") {
    const result = logoutUser(authContext);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/session/login") {
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

    const result = loginUser(body);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  return false;
}
