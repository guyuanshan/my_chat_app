import { querySql, runSql, sqlString } from "./sqlite-client.mjs";

function toBinding(row) {
  if (!row) {
    return null;
  }

  return {
    bindingId: row.binding_id,
    ownerId: row.owner_id,
    targetId: row.target_id,
    status: row.status,
    createdAt: row.created_at
  };
}

export async function findBinding(ownerId, targetId) {
  const rows = await querySql(`
    SELECT binding_id, owner_id, target_id, status, created_at
    FROM bindings
    WHERE owner_id = ${sqlString(ownerId)}
      AND target_id = ${sqlString(targetId)}
    LIMIT 1;
  `);

  return toBinding(rows[0]);
}

export async function createBinding(binding) {
  await runSql(`
    INSERT INTO bindings (binding_id, owner_id, target_id, status)
    VALUES (
      ${sqlString(binding.bindingId)},
      ${sqlString(binding.ownerId)},
      ${sqlString(binding.targetId)},
      'active'
    );
  `);

  return findBinding(binding.ownerId, binding.targetId);
}
