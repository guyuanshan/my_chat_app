import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const defaultDatabasePath = fileURLToPath(new URL("../../database/app.db", import.meta.url));
const migrationPath = fileURLToPath(
  new URL("../../database/migrations/001_create_min_loop_tables.sql", import.meta.url)
);

export const databasePath = process.env.DATABASE_PATH || defaultDatabasePath;

export async function initializeDatabase() {
  await mkdir(dirname(databasePath), { recursive: true });
  const migrationSql = await readFile(migrationPath, "utf8");
  await runSql(migrationSql);
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
