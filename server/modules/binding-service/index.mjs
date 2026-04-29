import { randomUUID } from "node:crypto";
import { requireAuthenticatedUser } from "../auth-service/index.mjs";
import { createBinding, findBinding } from "../../repositories/binding-repository.mjs";

const MAX_USER_ID_LENGTH = 64;

function normalizeRequiredId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateBindingInput(ownerId, targetId) {
  if (!ownerId) {
    return "ownerId is required.";
  }

  if (!targetId) {
    return "targetId is required.";
  }

  if (ownerId === targetId) {
    return "ownerId and targetId must be different.";
  }

  if (ownerId.length > MAX_USER_ID_LENGTH) {
    return `ownerId must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  if (targetId.length > MAX_USER_ID_LENGTH) {
    return `targetId must be at most ${MAX_USER_ID_LENGTH} characters.`;
  }

  return null;
}

export async function bindUser(input, authContext) {
  const authResult = requireAuthenticatedUser(authContext);

  if (!authResult.ok) {
    return authResult;
  }

  const ownerId = normalizeRequiredId(input.ownerId || authResult.userId);
  const targetId = normalizeRequiredId(input.targetId);

  if (ownerId !== authResult.userId) {
    return {
      ok: false,
      statusCode: 403,
      code: "FORBIDDEN_USER_CONTEXT",
      message: "ownerId must match the authenticated user."
    };
  }

  const validationError = validateBindingInput(ownerId, targetId);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_BINDING_INPUT",
      message: validationError
    };
  }

  const existingBinding = await findBinding(ownerId, targetId);

  if (existingBinding) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        bindingId: existingBinding.bindingId,
        status: "existing"
      }
    };
  }

  const binding = await createBinding({
    bindingId: randomUUID(),
    ownerId,
    targetId
  });

  return {
    ok: true,
    statusCode: 201,
    data: {
      bindingId: binding.bindingId,
      status: "created"
    }
  };
}

export async function getBindingStatus(ownerIdInput, targetIdInput, authContext) {
  const authResult = requireAuthenticatedUser(authContext);

  if (!authResult.ok) {
    return authResult;
  }

  const ownerId = normalizeRequiredId(ownerIdInput);
  const targetId = normalizeRequiredId(targetIdInput);

  if (ownerId !== authResult.userId) {
    return {
      ok: false,
      statusCode: 403,
      code: "FORBIDDEN_USER_CONTEXT",
      message: "ownerId must match the authenticated user."
    };
  }

  const validationError = validateBindingInput(ownerId, targetId);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      code: "INVALID_BINDING_INPUT",
      message: validationError
    };
  }

  const binding = await findBinding(ownerId, targetId);

  return {
    ok: true,
    statusCode: 200,
    data: {
      bound: Boolean(binding)
    }
  };
}
