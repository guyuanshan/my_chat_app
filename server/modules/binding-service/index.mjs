import { randomUUID } from "node:crypto";
import { createBinding, findBinding } from "../../repositories/binding-repository.mjs";

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

  return null;
}

export async function bindUser(input) {
  const ownerId = normalizeRequiredId(input.ownerId);
  const targetId = normalizeRequiredId(input.targetId);
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

export async function getBindingStatus(ownerIdInput, targetIdInput) {
  const ownerId = normalizeRequiredId(ownerIdInput);
  const targetId = normalizeRequiredId(targetIdInput);
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
