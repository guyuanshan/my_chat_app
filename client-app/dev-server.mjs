import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.CLIENT_PORT || 5173);
const host = process.env.CLIENT_HOST || "127.0.0.1";
const runtimeApiBaseUrl = String(process.env.CLIENT_API_BASE_URL || "").trim();
const rootDir = fileURLToPath(new URL(".", import.meta.url));

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function resolveRequestPath(url) {
  const pathname = new URL(url, `http://${host}:${port}`).pathname;
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  return join(rootDir, normalized === "/" ? "index.html" : normalized);
}

function sendRuntimeConfig(response) {
  response.writeHead(200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(
    `globalThis.__CHAT_APP_CONFIG__ = ${JSON.stringify({
      apiBaseUrl: runtimeApiBaseUrl
    })};\n`
  );
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method Not Allowed");
    return;
  }

  if ((request.url || "/") === "/runtime-config.js") {
    sendRuntimeConfig(response);
    return;
  }

  const filePath = resolveRequestPath(request.url || "/");

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  }
});

server.listen(port, host, () => {
  console.log(`client-app listening on http://${host}:${port}`);
  if (runtimeApiBaseUrl) {
    console.log(`client runtime api base url: ${runtimeApiBaseUrl}`);
  }
});
