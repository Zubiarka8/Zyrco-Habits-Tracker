// Turso cloud sync — fires after every local SQLite write.
// Uses Turso's libSQL HTTP API (/v2/pipeline) via native fetch.
// No extra npm packages required.
// Requires VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN in .env.
// (Vite only exposes variables with the VITE_ prefix to the browser.)

const RAW_URL = import.meta.env.VITE_TURSO_URL as string | undefined;
const TOKEN   = import.meta.env.VITE_TURSO_TOKEN as string | undefined;

// Turso CLI gives libsql:// URLs; the HTTP pipeline API needs https://
const BASE_URL = RAW_URL?.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");

export const tursoEnabled = !!(BASE_URL && TOKEN);

// ── Argument serialisation ────────────────────────────────

type LibSqlArg = { type: "null" } | { type: "integer" | "real" | "text"; value: string };

function toArg(val: unknown): LibSqlArg {
  if (val === null || val === undefined) return { type: "null" };
  if (typeof val === "boolean") return { type: "integer", value: val ? "1" : "0" };
  if (typeof val === "number") {
    return Number.isInteger(val)
      ? { type: "integer", value: String(val) }
      : { type: "real", value: String(val) };
  }
  return { type: "text", value: String(val) };
}

// plugin-sql uses $1/$2/... positional markers; libSQL HTTP uses ?
function toLibSql(sql: string): string {
  return sql.replace(/\$\d+/g, "?");
}

// ── Core HTTP call ────────────────────────────────────────

// Awaitable SELECT — returns typed rows from Turso.
// Throws when Turso is unreachable or returns an error (caller decides how to handle).
export async function tursoQuery<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!tursoEnabled) throw new Error("Turso credentials not configured (VITE_TURSO_URL / VITE_TURSO_TOKEN)");

  const res = await fetch(`${BASE_URL}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql: toLibSql(sql), args: params.map(toArg) } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json() as {
    results: Array<{
      type: string;
      error?: { message: string };
      response?: {
        type: string;
        result?: {
          cols: Array<{ name: string }>;
          rows: Array<Array<{ type: string; value?: string } | null>>;
        };
      };
    }>;
  };

  const first = data.results[0];

  // Surface Turso-level errors (e.g. table not found, constraint violation)
  if (first.type === "error") {
    throw new Error(`Turso error: ${first.error?.message ?? JSON.stringify(first)}`);
  }

  if (first.type !== "ok" || !first.response?.result) return [];

  const { cols, rows } = first.response.result;
  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => {
      const cell = row[i];
      obj[col.name] = cell && cell.type !== "null" ? cell.value ?? null : null;
    });
    return obj as T;
  });
}

// ── Users table (auth) ───────────────────────────────────

export interface TursoUser extends Record<string, unknown> {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  created_at: string;
}

export async function initTursoUsersTable(): Promise<void> {
  if (!tursoEnabled) return;
  await tursoExec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
}

export async function tursoFindUser(email: string): Promise<TursoUser | null> {
  // Ensure the table exists — may not if Turso was added after first app launch
  await initTursoUsersTable();
  const rows = await tursoQuery<TursoUser>(
    "SELECT id, email, password_hash, salt, created_at FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] ?? null;
}

export async function tursoUpdatePassword(
  userId: string,
  newHash: string,
  newSalt: string
): Promise<void> {
  await initTursoUsersTable();
  await tursoQuery(
    "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
    [newHash, newSalt, userId]
  );
}

export async function tursoFindUserById(id: string): Promise<TursoUser | null> {
  await initTursoUsersTable();
  const rows = await tursoQuery<TursoUser>(
    "SELECT id, email, password_hash, salt, created_at FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function tursoCreateUser(
  id: string,
  email: string,
  passwordHash: string,
  salt: string
): Promise<void> {
  await initTursoUsersTable();
  const created_at = new Date().toISOString();
  await tursoQuery(
    "INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, email, passwordHash, salt, created_at]
  );
}

async function pipeline(sql: string, params: unknown[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: { sql: toLibSql(sql), args: params.map(toArg) },
        },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
}

// ── Public API ────────────────────────────────────────────

/**
 * Fire-and-forget sync. Call after every local SQLite write.
 * Never throws — errors go to console so local data is never blocked.
 */
export function syncToTurso(sql: string, params: unknown[] = []): void {
  if (!tursoEnabled) return;
  pipeline(sql, params).catch((err) => {
    console.error("[Turso] sync failed:", err);
  });
}

/**
 * Awaitable version used only during schema init at startup.
 * Errors are non-fatal — app continues even if Turso is unreachable.
 */
export async function tursoExec(sql: string, params: unknown[] = []): Promise<void> {
  if (!tursoEnabled) return;
  try {
    await pipeline(sql, params);
  } catch (err) {
    console.error("[Turso] exec failed:", err);
  }
}

/**
 * Creates the same tables that exist in local SQLite.
 * Called once during initSchema so Turso is always schema-compatible.
 */
export async function initTursoSchema(): Promise<void> {
  if (!tursoEnabled) return;

  const tables = [
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT '📁',
      created_at TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      category_id TEXT, frequency TEXT NOT NULL DEFAULT 'daily',
      custom_type TEXT, target_days TEXT, interval_days INTEGER,
      start_date TEXT, end_date TEXT,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT '⭐',
      type TEXT NOT NULL DEFAULT 'normal',
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      reminder_time TEXT, created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      session TEXT NOT NULL DEFAULT 'anytime',
      completion_type TEXT NOT NULL DEFAULT 'binary',
      completion_target INTEGER,
      completion_unit TEXT,
      time_start TEXT,
      time_end TEXT,
      paused_until TEXT,
      user_id TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY, habit_id TEXT NOT NULL,
      date TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0,
      note TEXT, value REAL, created_at TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT '',
      UNIQUE(habit_id, date)
    )`,
    `CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY, title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'none',
      due_date TEXT, created_at TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS skips (
      id TEXT PRIMARY KEY, habit_id TEXT NOT NULL,
      date TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(habit_id, date, user_id)
    )`,
  ];

  for (const sql of tables) {
    await tursoExec(sql);
  }

  await initTursoUsersTable();
}
