import { randomUUID } from "node:crypto";

const FIXED_USERS = new Map([
  ["user_a", { password: "pass_user_a" }],
  ["user_b", { password: "pass_user_b" }]
]);

const sessions = new Map();

function normalizeRequiredText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getAllowedUserIds() {
  return [...FIXED_USERS.keys()];
}

export function getSessionFromRequest(request) {
  const authorization = request.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  return {
    token,
    userId: session.userId
  };
}

export function requireAuthenticatedUser(authContext) {
  if (!authContext?.userId) {
    return {
      ok: false,
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Authentication is required."
    };
  }

  return {
    ok: true,
    userId: authContext.userId
  };
}

export function loginUser(input) {
  const userId = normalizeRequiredText(input.userId);
  const password = normalizeRequiredText(input.password);

  if (!userId) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_LOGIN_INPUT",
      message: "userId is required."
    };
  }

  if (!password) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_LOGIN_INPUT",
      message: "password is required."
    };
  }

  const account = FIXED_USERS.get(userId);

  if (!account || account.password !== password) {
    return {
      ok: false,
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "userId or password is incorrect."
    };
  }

  const token = randomUUID();
  sessions.set(token, { userId });

  return {
    ok: true,
    statusCode: 200,
    data: {
      token,
      userId
    }
  };
}

export function getCurrentSession(authContext) {
  const authResult = requireAuthenticatedUser(authContext);

  if (!authResult.ok) {
    return authResult;
  }

  return {
    ok: true,
    statusCode: 200,
    data: {
      userId: authResult.userId
    }
  };
}

export function logoutUser(authContext) {
  const authResult = requireAuthenticatedUser(authContext);

  if (!authResult.ok) {
    return authResult;
  }

  sessions.delete(authContext.token);

  return {
    ok: true,
    statusCode: 200,
    data: {
      status: "logged_out"
    }
  };
}
