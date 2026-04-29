import { bindUser, getBindingStatus } from "../../modules/binding-service/index.mjs";
import { sendError, sendOk } from "../../utils/http.mjs";
import { readJsonBody } from "../../utils/request-body.mjs";

export async function handleBindingRoute(request, response, url) {
  if (request.method === "POST" && url.pathname === "/bindings") {
    let body;

    try {
      body = await readJsonBody(request);
    } catch {
      sendError(response, 400, "INVALID_JSON", "Request body must be valid JSON.");
      return true;
    }

    const result = await bindUser(body);

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
    const result = await getBindingStatus(ownerId, targetId);

    if (!result.ok) {
      sendError(response, result.statusCode, result.code, result.message);
      return true;
    }

    sendOk(response, result.data, result.statusCode);
    return true;
  }

  return false;
}
