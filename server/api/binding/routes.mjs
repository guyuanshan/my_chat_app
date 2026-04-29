import { bindUser, getBindingStatus } from "../../modules/binding-service/index.mjs";
import { sendError, sendOk } from "../../utils/http.mjs";
import { readJsonBody } from "../../utils/request-body.mjs";

export async function handleBindingRoute(request, response, url, authContext) {
  if (request.method === "POST" && url.pathname === "/bindings") {
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

    const result = await bindUser(body, authContext);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  const match = url.pathname.match(/^\/bindings\/([^/]+)\/([^/]+)$/);

  if (request.method === "GET" && match) {
    const ownerId = decodeURIComponent(match[1]);
    const targetId = decodeURIComponent(match[2]);
    const result = await getBindingStatus(ownerId, targetId, authContext);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  return false;
}
