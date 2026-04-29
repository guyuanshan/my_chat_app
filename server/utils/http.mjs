export function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
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
  response.writeHead(204, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end();
}
