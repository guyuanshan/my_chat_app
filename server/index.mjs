import { createServer } from "node:http";
import { handleBindingRoute } from "./api/binding/routes.mjs";
import { handleMessageRoute } from "./api/messages/routes.mjs";
import { handleSessionRoute } from "./api/session/routes.mjs";
import { getSessionFromRequest } from "./modules/auth-service/index.mjs";
import { initializeDatabase } from "./repositories/sqlite-client.mjs";
import { sendError, sendJson, sendNoContent } from "./utils/http.mjs";

const port = Number(process.env.SERVER_PORT || 3000);
const host = process.env.SERVER_HOST || "127.0.0.1";

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  const authContext = getSessionFromRequest(request);

  try {
    if (request.method === "OPTIONS") {
      sendNoContent(response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "chat-app-api"
      });
      return;
    }

    if (await handleSessionRoute(request, response, url, authContext)) {
      return;
    }

    if (await handleBindingRoute(request, response, url, authContext)) {
      return;
    }

    if (await handleMessageRoute(request, response, url, authContext)) {
      return;
    }

    sendError(response, 404, "NOT_FOUND", "Route is not implemented in the current step.");
  } catch {
    sendError(response, 500, "INTERNAL_SERVER_ERROR", "Unexpected server error.");
  }
});

await initializeDatabase();

server.listen(port, host, () => {
  console.log(`server listening on http://${host}:${port}`);
});
