const corsAllowOrigin = String(process.env.CORS_ALLOW_ORIGIN || "*").trim() || "*";

function createCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": corsAllowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

export function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...createCorsHeaders()
  });
  response.end(JSON.stringify(body));
}

export function sendOk(response, data, statusCode = 200) {
  sendJson(response, statusCode, {
    ok: true,
    data
  });
}

export function sendError(response, statusCode, code, message) {
  sendJson(response, statusCode, {
    ok: false,
    error: {
      code,
      message
    }
  });
}

export function sendNoContent(response) {
  response.writeHead(204, createCorsHeaders());
  response.end();
}
