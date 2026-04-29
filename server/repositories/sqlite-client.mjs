import { execFile } from "node:child_process";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const defaultDatabasePath = fileURLToPath(new URL("../../database/app.db", import.meta.url));
const migrationDirectoryPath = fileURLToPath(new URL("../../database/migrations", import.meta.url));

export const databasePath = process.env.DATABASE_PATH || defaultDatabasePath;

export async function initializeDatabase() {
  await mkdir(dirname(databasePath), { recursive: true });
  await runSql(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationFiles = (await readdir(migrationDirectoryPath))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const fileName of migrationFiles) {
    const version = fileName.replace(/\.sql$/, "");
    const existingRows = await querySql(`
      SELECT version
      FROM schema_migrations
      WHERE version = ${sqlString(version)}
      LIMIT 1;
    `);

    if (existingRows.length > 0) {
      continue;
    }

    const migrationSql = await readFile(`${migrationDirectoryPath}/${fileName}`, "utf8");
    await runSql(`
      BEGIN TRANSACTION;
      ${migrationSql}
      INSERT INTO schema_migrations (version)
      VALUES (${sqlString(version)});
      COMMIT;
    `);
  }
}

export async function runSql(sql) {
  await execFileAsync("sqlite3", [databasePath, normalizeSqlArgument(sql)], {
    cwd: projectRoot
  });
}

export async function querySql(sql) {
  const { stdout } = await execFileAsync("sqlite3", ["-json", databasePath, normalizeSqlArgument(sql)], {
    cwd: projectRoot
  });

  const trimmed = stdout.trim();
  return trimmed ? JSON.parse(trimmed) : [];
}

export function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeSqlArgument(sql) {
  return sql.trimStart().startsWith("-") ? `\n${sql}` : sql;
}
