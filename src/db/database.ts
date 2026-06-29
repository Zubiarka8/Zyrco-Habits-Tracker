import Database from "@tauri-apps/plugin-sql";
import type { Category, Habit, Log, Subscription, PlanType, Todo } from "../types";
import { syncToTurso, initTursoSchema } from "./turso";

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

// Retries Database.load() up to MAX_RETRIES times with a delay between each.
// This handles the rare case where the Tauri IPC bridge isn't ready on the first
// useEffect tick (e.g. during dev-mode startup or after HMR).
async function loadDbWithRetry(): Promise<Database> {
  // The Tauri IPC bridge is injected synchronously by the Rust runtime before
  // any page scripts run. If it's missing, we are NOT inside a Tauri window —
  // retrying will never fix this, so we fail immediately with an actionable message.
  const tauri = (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  if (!tauri) {
    throw new Error(
      "[Zyrco] Tauri IPC bridge (window.__TAURI_INTERNALS__) not found.\n" +
      "This app must run inside Tauri. Use: npm run tauri dev\n" +
      "If you already use that command, check the Rust terminal for a panic."
    );
  }

  const MAX_RETRIES = 10;
  const DELAY_MS = 150;
  let lastErr: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const conn = await Database.load("sqlite:zyrco.db");
      await initSchema(conn);
      db = conn;
      return conn;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise<void>((r) => setTimeout(r, DELAY_MS));
      }
    }
  }

  throw lastErr;
}

// Single promise ensures concurrent callers share one init — no SQLite lock races.
// Resets on failure so the next caller can start a fresh retry cycle.
export function getDb(): Promise<Database> {
  if (db) return Promise.resolve(db);
  if (!dbInitPromise) {
    dbInitPromise = loadDbWithRetry().catch((err) => {
      dbInitPromise = null;
      return Promise.reject(err);
    });
  }
  return dbInitPromise;
}

async function initSchema(database: Database): Promise<void> {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT '📁',
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      frequency TEXT NOT NULL DEFAULT 'daily',
      target_days TEXT,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT '⭐',
      type TEXT NOT NULL DEFAULT 'normal',
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      reminder_time TEXT,
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(habit_id, date)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_type TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL,
      expires_at TEXT,
      cancelled_at TEXT,
      renewed_at TEXT,
      payment_provider TEXT,
      payment_reference TEXT,
      streak_shields_used INTEGER NOT NULL DEFAULT 0,
      streak_shields_reset_at TEXT
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'none',
      due_date TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS skips (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      user_id TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(habit_id, date)
    )
  `);

  // Seed a default free subscription for the current local user if none exists
  {
    const seedUid = getLocalUserId();
    const existingSubs = await database.select<{ id: string }[]>(
      "SELECT id FROM subscriptions WHERE user_id = $1 LIMIT 1",
      [seedUid]
    );
    if (existingSubs.length === 0) {
      await database.execute(
        `INSERT INTO subscriptions
          (id, user_id, plan_type, status, started_at,
           expires_at, cancelled_at, renewed_at, payment_provider,
           payment_reference, streak_shields_used, streak_shields_reset_at)
         VALUES ($1,$2,'free','active',$3,NULL,NULL,NULL,NULL,NULL,0,NULL)`,
        [crypto.randomUUID(), seedUid, new Date().toISOString()]
      );
    }
  }

  // Migrations: add columns to existing DBs that don't have them yet
  const habitCols = await database.select<{ name: string }[]>(
    "PRAGMA table_info(habits)"
  );
  const habitColNames = new Set(habitCols.map((c) => c.name));

  if (!habitColNames.has("type")) {
    await database.execute(
      "ALTER TABLE habits ADD COLUMN type TEXT NOT NULL DEFAULT 'normal'"
    );
  }
  if (!habitColNames.has("custom_type")) {
    await database.execute("ALTER TABLE habits ADD COLUMN custom_type TEXT");
  }
  if (!habitColNames.has("interval_days")) {
    await database.execute("ALTER TABLE habits ADD COLUMN interval_days INTEGER");
  }
  if (!habitColNames.has("start_date")) {
    await database.execute("ALTER TABLE habits ADD COLUMN start_date TEXT");
  }
  if (!habitColNames.has("end_date")) {
    await database.execute("ALTER TABLE habits ADD COLUMN end_date TEXT");
  }
  if (!habitColNames.has("time_start")) {
    await database.execute("ALTER TABLE habits ADD COLUMN time_start TEXT");
  }
  if (!habitColNames.has("time_end")) {
    await database.execute("ALTER TABLE habits ADD COLUMN time_end TEXT");
  }
  if (!habitColNames.has("session")) {
    await database.execute("ALTER TABLE habits ADD COLUMN session TEXT NOT NULL DEFAULT 'anytime'");
  }
  if (!habitColNames.has("completion_type")) {
    await database.execute("ALTER TABLE habits ADD COLUMN completion_type TEXT NOT NULL DEFAULT 'binary'");
  }
  if (!habitColNames.has("completion_target")) {
    await database.execute("ALTER TABLE habits ADD COLUMN completion_target REAL");
  }
  if (!habitColNames.has("completion_unit")) {
    await database.execute("ALTER TABLE habits ADD COLUMN completion_unit TEXT");
  }

  if (!habitColNames.has("paused_until")) {
    await database.execute("ALTER TABLE habits ADD COLUMN paused_until TEXT");
  }

  // One-time data fix: anchor habits with no explicit start_date to their creation date
  // so they don't appear in calendar/stats days before they existed.
  await database.execute(
    "UPDATE habits SET start_date = substr(created_at, 1, 10) WHERE start_date IS NULL"
  );

  const logCols2 = await database.select<{ name: string }[]>("PRAGMA table_info(logs)");
  if (!logCols2.some((c) => c.name === "value")) {
    await database.execute("ALTER TABLE logs ADD COLUMN value REAL");
  }

  // Migration: add user_id to all tables (per-user data partitioning)
  const localId = getLocalUserId();

  for (const table of ["habits", "categories", "todos"] as const) {
    const cols = await database.select<{ name: string }[]>(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === "user_id")) {
      await database.execute(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`);
      await database.execute(`UPDATE ${table} SET user_id = $1`, [localId]);
    }
  }

  const logCols = await database.select<{ name: string }[]>("PRAGMA table_info(logs)");
  if (!logCols.some((c) => c.name === "user_id")) {
    await database.execute("ALTER TABLE logs ADD COLUMN user_id TEXT");
    // Derive user_id from the linked habit so existing logs stay consistent
    await database.execute(
      "UPDATE logs SET user_id = (SELECT h.user_id FROM habits h WHERE h.id = logs.habit_id)"
    );
  }

  // Migration: misses table — habits that were due but explicitly marked as not done by the user
  await database.execute(`
    CREATE TABLE IF NOT EXISTS misses (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(habit_id, date, user_id)
    )
  `);
  const missCols = await database.select<{ name: string }[]>("PRAGMA table_info(misses)");
  if (!missCols.some((c) => c.name === "user_id")) {
    await database.execute("ALTER TABLE misses ADD COLUMN user_id TEXT NOT NULL DEFAULT ''");
  }

  // Migration: add type column to skips (distinguishes 'skip'=tachado vs 'exclude'=fully hidden)
  const skipCols = await database.select<{ name: string }[]>("PRAGMA table_info(skips)");
  if (!skipCols.some((c) => c.name === "type")) {
    await database.execute("ALTER TABLE skips ADD COLUMN type TEXT NOT NULL DEFAULT 'skip'");
  }

  // Mirror schema to Turso when credentials are configured
  await initTursoSchema();
}

// ---- Local user identity ----

function getLocalUserId(): string {
  let id = localStorage.getItem("zyrco-local-user-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("zyrco-local-user-id", id);
  }
  return id;
}

/**
 * Called once after successful login/register to reassign all local rows
 * (created before auth) from the old anonymous ID to the real account ID.
 * Updates localStorage so future DB calls automatically use the new ID.
 */
export async function migrateLocalDataToUser(newUserId: string): Promise<void> {
  const oldId = getLocalUserId();
  if (oldId === newUserId) return; // already migrated or same user

  const database = await getDb();
  for (const table of ["habits", "categories", "todos", "logs", "subscriptions", "skips"]) {
    await database.execute(
      `UPDATE ${table} SET user_id = $1 WHERE user_id = $2`,
      [newUserId, oldId]
    );
  }
  localStorage.setItem("zyrco-local-user-id", newUserId);
}

// ---- Subscriptions ----

type RawSubscription = Omit<Subscription, "streak_shields_used"> & {
  streak_shields_used: number;
};

function parseSubscription(raw: RawSubscription): Subscription {
  return { ...raw, streak_shields_used: Number(raw.streak_shields_used) };
}

/** Returns the subscription for the currently logged-in user. */
export async function getSubscription(): Promise<Subscription | null> {
  const db = await getDb();
  const rows = await db.select<RawSubscription[]>(
    "SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1",
    [getLocalUserId()]
  );
  return rows.length ? parseSubscription(rows[0]) : null;
}

/**
 * [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME]
 * Activar plan premium tras pago confirmado por RevenueCat / Stripe.
 */
export async function activateSubscription(
  planType: PlanType,
  expiresAt: string | null,
  paymentProvider: "revenuecat" | "stripe",
  paymentReference: string
): Promise<void> {
  const db = await getDb();
  const sub = await getSubscription();
  if (!sub) return;
  await db.execute(
    `UPDATE subscriptions
     SET plan_type = $1, status = 'active', expires_at = $2,
         renewed_at = $3, payment_provider = $4, payment_reference = $5
     WHERE id = $6`,
    [planType, expiresAt, new Date().toISOString(), paymentProvider, paymentReference, sub.id]
  );
}

/**
 * [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME]
 * Cancela suscripción. El acceso se mantiene hasta expires_at.
 */
export async function cancelSubscription(): Promise<void> {
  const db = await getDb();
  const sub = await getSubscription();
  if (!sub) return;
  await db.execute(
    "UPDATE subscriptions SET status = 'cancelled', cancelled_at = $1 WHERE id = $2",
    [new Date().toISOString(), sub.id]
  );
}

/**
 * [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME]
 * Marca suscripción como expirada y degrada al plan free.
 */
export async function expireSubscription(): Promise<void> {
  const db = await getDb();
  const sub = await getSubscription();
  if (!sub) return;
  await db.execute(
    "UPDATE subscriptions SET status = 'expired', plan_type = 'free' WHERE id = $1",
    [sub.id]
  );
}

/**
 * [FUTURO - PREMIUM MENSUAL] 1 escudo/mes
 * [FUTURO - PREMIUM ANUAL + LIFETIME] 3+ escudos/mes
 */
export async function useStreakShield(): Promise<boolean> {
  const db = await getDb();
  const sub = await getSubscription();
  if (!sub) return false;

  const now = new Date();
  const resetDate = sub.streak_shields_reset_at
    ? new Date(sub.streak_shields_reset_at)
    : null;
  const needsReset =
    !resetDate ||
    resetDate.getMonth() !== now.getMonth() ||
    resetDate.getFullYear() !== now.getFullYear();

  const shieldsUsed = needsReset ? 0 : sub.streak_shields_used;

  if (needsReset) {
    await db.execute(
      "UPDATE subscriptions SET streak_shields_used = 0, streak_shields_reset_at = $1 WHERE id = $2",
      [now.toISOString(), sub.id]
    );
  }

  await db.execute(
    "UPDATE subscriptions SET streak_shields_used = $1 WHERE id = $2",
    [shieldsUsed + 1, sub.id]
  );
  return true;
}

// ---- Categories ----

export async function fetchCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.select<Category[]>(
    "SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC",
    [getLocalUserId()]
  );
}

export async function insertCategory(
  data: Omit<Category, "id" | "created_at">
): Promise<Category> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const uid = getLocalUserId();
  const sql = "INSERT INTO categories (id, name, color, icon, created_at, user_id) VALUES ($1, $2, $3, $4, $5, $6)";
  const params = [id, data.name, data.color, data.icon, created_at, uid];
  await db.execute(sql, params);
  syncToTurso(sql, params);
  return { id, created_at, ...data };
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<Category, "id" | "created_at">>
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(data)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(", ");
  const sql = `UPDATE categories SET ${fields} WHERE id = $1`;
  const params = [id, ...Object.values(data)];
  await db.execute(sql, params);
  syncToTurso(sql, params);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  const sql = "DELETE FROM categories WHERE id = $1";
  await db.execute(sql, [id]);
  syncToTurso(sql, [id]);
}

// ---- Habits ----

type RawHabit = Omit<Habit, "target_days" | "reminder_enabled" | "archived"> & {
  target_days: string | null;
  reminder_enabled: number;
  archived: number;
};

function parseHabit(raw: RawHabit): Habit {
  return {
    ...raw,
    type: (raw.type as Habit["type"]) ?? "normal",
    custom_type: (raw.custom_type as Habit["custom_type"]) ?? null,
    interval_days: raw.interval_days ?? null,
    start_date: raw.start_date ?? null,
    end_date: raw.end_date ?? null,
    target_days: raw.target_days ? JSON.parse(raw.target_days) : null,
    reminder_enabled: raw.reminder_enabled === 1,
    archived: raw.archived === 1,
    session: (raw.session as Habit["session"]) ?? "anytime",
    completion_type: (raw.completion_type as Habit["completion_type"]) ?? "binary",
    completion_target: raw.completion_target ?? null,
    completion_unit: raw.completion_unit ?? null,
    paused_until: raw.paused_until ?? null,
  };
}

export async function fetchHabits(includeArchived = false): Promise<Habit[]> {
  const db = await getDb();
  const uid = getLocalUserId();
  const rows = await db.select<RawHabit[]>(
    includeArchived
      ? "SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at ASC"
      : "SELECT * FROM habits WHERE archived = 0 AND user_id = $1 ORDER BY created_at ASC",
    [uid]
  );
  return rows.map(parseHabit);
}

export async function insertHabit(
  data: Omit<Habit, "id" | "created_at" | "archived">
): Promise<Habit> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const sql = `INSERT INTO habits
      (id, name, description, category_id, frequency, custom_type, target_days,
       interval_days, start_date, end_date, color, icon,
       type, session, completion_type, completion_target, completion_unit,
       reminder_enabled, reminder_time, time_start, time_end,
       created_at, archived, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,0,$23)`;
  const params = [
    id,
    data.name,
    data.description ?? null,
    data.category_id ?? null,
    data.frequency,
    data.custom_type ?? null,
    data.target_days ? JSON.stringify(data.target_days) : null,
    data.interval_days ?? null,
    data.start_date ?? null,
    data.end_date ?? null,
    data.color,
    data.icon,
    data.type,
    data.session ?? "anytime",
    data.completion_type ?? "binary",
    data.completion_target ?? null,
    data.completion_unit ?? null,
    data.reminder_enabled ? 1 : 0,
    data.reminder_time ?? null,
    data.time_start ?? null,
    data.time_end ?? null,
    created_at,
    getLocalUserId(),
  ];
  await db.execute(sql, params);
  syncToTurso(sql, params);
  return { id, created_at, archived: false, ...data };
}

export async function updateHabit(
  id: string,
  data: Partial<Omit<Habit, "id" | "created_at">>
): Promise<void> {
  const db = await getDb();
  const normalized: Record<string, unknown> = { ...data };
  if ("target_days" in normalized) {
    normalized.target_days = normalized.target_days
      ? JSON.stringify(normalized.target_days)
      : null;
  }
  if ("reminder_enabled" in normalized) {
    normalized.reminder_enabled = normalized.reminder_enabled ? 1 : 0;
  }
  if ("archived" in normalized) {
    normalized.archived = normalized.archived ? 1 : 0;
  }
  const fields = Object.keys(normalized)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(", ");
  const sql = `UPDATE habits SET ${fields} WHERE id = $1`;
  const params = [id, ...Object.values(normalized)];
  await db.execute(sql, params);
  syncToTurso(sql, params);
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDb();
  const sql = "DELETE FROM habits WHERE id = $1";
  await db.execute(sql, [id]);
  syncToTurso(sql, [id]);
}

// ---- Logs ----

type RawLog = Omit<Log, "completed"> & { completed: number };

function parseLog(raw: RawLog): Log {
  return { ...raw, completed: raw.completed === 1, value: raw.value ?? null };
}

export async function fetchLogsForDate(date: string): Promise<Log[]> {
  const db = await getDb();
  const rows = await db.select<RawLog[]>(
    "SELECT * FROM logs WHERE date = $1 AND user_id = $2",
    [date, getLocalUserId()]
  );
  return rows.map(parseLog);
}

export async function fetchLogsForHabit(
  habitId: string,
  startDate: string,
  endDate: string
): Promise<Log[]> {
  const db = await getDb();
  const rows = await db.select<RawLog[]>(
    "SELECT * FROM logs WHERE habit_id = $1 AND date >= $2 AND date <= $3 AND user_id = $4 ORDER BY date DESC",
    [habitId, startDate, endDate, getLocalUserId()]
  );
  return rows.map(parseLog);
}

export async function fetchLogsForDateRange(
  startDate: string,
  endDate: string
): Promise<Log[]> {
  const db = await getDb();
  try {
    const rows = await db.select<RawLog[]>(
      "SELECT * FROM logs WHERE date >= $1 AND date <= $2 AND user_id = $3 ORDER BY date",
      [startDate, endDate, getLocalUserId()]
    );
    return rows.map(parseLog);
  } catch (err) {
    throw new Error(
      `fetchLogsForDateRange(${startDate} → ${endDate}) failed: ${err}`
    );
  }
}

export async function fetchAllLogs(): Promise<Log[]> {
  const db = await getDb();
  const rows = await db.select<RawLog[]>(
    "SELECT * FROM logs WHERE completed = 1 AND user_id = $1 ORDER BY date DESC",
    [getLocalUserId()]
  );
  return rows.map(parseLog);
}

export async function upsertLog(
  habitId: string,
  date: string,
  completed: boolean,
  note?: string | null,
  value?: number | null
): Promise<void> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const sql = `INSERT INTO logs (id, habit_id, date, completed, note, value, created_at, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT(habit_id, date) DO UPDATE SET completed = $4, note = COALESCE($5, note), value = COALESCE($6, value)`;
  const params = [id, habitId, date, completed ? 1 : 0, note ?? null, value ?? null, created_at, getLocalUserId()];
  await db.execute(sql, params);
  syncToTurso(sql, params);
}

export async function deleteLogForDate(habitId: string, date: string): Promise<void> {
  const db = await getDb();
  const sql = "DELETE FROM logs WHERE habit_id = $1 AND date = $2";
  const params = [habitId, date];
  await db.execute(sql, params);
  syncToTurso(sql, params);
}

export async function deleteAllLogsForHabit(habitId: string): Promise<void> {
  const db = await getDb();
  const sql = "DELETE FROM logs WHERE habit_id = $1";
  const params = [habitId];
  await db.execute(sql, params);
  syncToTurso(sql, params);
}

// ---- Misses (habits due but explicitly not done) ----

export async function markHabitMissed(habitId: string, date: string): Promise<void> {
  const db  = await getDb();
  const uid = getLocalUserId();
  await db.execute(
    "INSERT OR IGNORE INTO misses (id, habit_id, date, user_id, created_at) VALUES ($1,$2,$3,$4,$5)",
    [crypto.randomUUID(), habitId, date, uid, new Date().toISOString()]
  );
}

export async function unmarkHabitMissed(habitId: string, date: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM misses WHERE habit_id = $1 AND date = $2 AND user_id = $3",
    [habitId, date, getLocalUserId()]
  );
}

export async function fetchMissesForDate(date: string): Promise<{ habit_id: string; date: string }[]> {
  const db = await getDb();
  return db.select<{ habit_id: string; date: string }[]>(
    "SELECT habit_id, date FROM misses WHERE date = $1 AND user_id = $2",
    [date, getLocalUserId()]
  );
}

export async function fetchMissesForRange(
  startDate: string,
  endDate: string
): Promise<{ habit_id: string; date: string }[]> {
  const db = await getDb();
  return db.select<{ habit_id: string; date: string }[]>(
    "SELECT habit_id, date FROM misses WHERE date >= $1 AND date <= $2 AND user_id = $3",
    [startDate, endDate, getLocalUserId()]
  );
}

export async function updateLogNote(
  habitId: string,
  date: string,
  note: string
): Promise<void> {
  const db = await getDb();
  const sql = "UPDATE logs SET note = $1 WHERE habit_id = $2 AND date = $3";
  const params = [note, habitId, date];
  await db.execute(sql, params);
  syncToTurso(sql, params);
}

// ---- Todos ----

type RawTodo = Omit<Todo, "completed"> & { completed: number };

function parseTodo(raw: RawTodo): Todo {
  return { ...raw, completed: raw.completed === 1 };
}

// ---- Skips (per-day habit exceptions) ----

export async function fetchSkipsForDate(date: string): Promise<{ habit_id: string; date: string; type: string }[]> {
  const db = await getDb();
  return db.select<{ habit_id: string; date: string; type: string }[]>(
    "SELECT habit_id, date, COALESCE(type, 'skip') AS type FROM skips WHERE date = $1 AND user_id = $2",
    [date, getLocalUserId()]
  );
}

export async function fetchSkipsForRange(
  startDate: string,
  endDate: string
): Promise<{ habit_id: string; date: string; type: string }[]> {
  const db = await getDb();
  // Returns ALL types (skip + exclude) so calendar and month-strip can filter both out of counts
  return db.select<{ habit_id: string; date: string; type: string }[]>(
    "SELECT habit_id, date, COALESCE(type,'skip') AS type FROM skips WHERE date >= $1 AND date <= $2 AND user_id = $3",
    [startDate, endDate, getLocalUserId()]
  );
}

export async function skipHabitOnDate(habitId: string, date: string): Promise<void> {
  const db  = await getDb();
  const uid = getLocalUserId();
  // Delete any existing entry first (could be type='exclude'), then insert fresh skip
  await db.execute(
    "DELETE FROM skips WHERE habit_id = $1 AND date = $2 AND user_id = $3",
    [habitId, date, uid]
  );
  await db.execute(
    "INSERT INTO skips (id, habit_id, date, user_id, created_at, type) VALUES ($1,$2,$3,$4,$5,$6)",
    [crypto.randomUUID(), habitId, date, uid, new Date().toISOString(), "skip"]
  );
}

export async function excludeHabitOnDate(habitId: string, date: string): Promise<void> {
  const db  = await getDb();
  const uid = getLocalUserId();
  await db.execute(
    "DELETE FROM skips WHERE habit_id = $1 AND date = $2 AND user_id = $3",
    [habitId, date, uid]
  );
  await db.execute(
    "INSERT INTO skips (id, habit_id, date, user_id, created_at, type) VALUES ($1,$2,$3,$4,$5,$6)",
    [crypto.randomUUID(), habitId, date, uid, new Date().toISOString(), "exclude"]
  );
}

export async function unskipHabitOnDate(habitId: string, date: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM skips WHERE habit_id = $1 AND date = $2 AND user_id = $3",
    [habitId, date, getLocalUserId()]
  );
}

export async function fetchTodos(): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.select<RawTodo[]>(
    "SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC",
    [getLocalUserId()]
  );
  return rows.map(parseTodo);
}

export async function insertTodo(
  data: Omit<Todo, "id" | "created_at">
): Promise<Todo> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const sql = "INSERT INTO todos (id, title, completed, priority, due_date, created_at, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7)";
  const params = [id, data.title, data.completed ? 1 : 0, data.priority, data.due_date ?? null, created_at, getLocalUserId()];
  await db.execute(sql, params);
  syncToTurso(sql, params);
  return { id, created_at, ...data };
}

export async function updateTodo(
  id: string,
  data: Partial<Omit<Todo, "id" | "created_at">>
): Promise<void> {
  const db = await getDb();
  const normalized: Record<string, unknown> = { ...data };
  if ("completed" in normalized) {
    normalized.completed = normalized.completed ? 1 : 0;
  }
  const fields = Object.keys(normalized)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(", ");
  const sql = `UPDATE todos SET ${fields} WHERE id = $1`;
  const params = [id, ...Object.values(normalized)];
  await db.execute(sql, params);
  syncToTurso(sql, params);
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDb();
  const sql = "DELETE FROM todos WHERE id = $1";
  await db.execute(sql, [id]);
  syncToTurso(sql, [id]);
}

// ---- Import / Export ----

export interface ExportData {
  version: number;
  exportedAt: string;
  categories: Category[];
  habits: Habit[];
  logs: Log[];
}

export async function exportAllData(): Promise<ExportData> {
  const db = await getDb();
  const categories = await fetchCategories();
  const habits = await fetchHabits(true);
  const rawLogs = await db.select<RawLog[]>(
    "SELECT * FROM logs WHERE user_id = $1 ORDER BY date DESC",
    [getLocalUserId()]
  );
  const logs = rawLogs.map(parseLog);
  return { version: 1, exportedAt: new Date().toISOString(), categories, habits, logs };
}

export async function importData(data: ExportData): Promise<{ habits: number; categories: number; logs: number }> {
  const db = await getDb();

  const existingCats = await fetchCategories();
  const existingCatIds = new Set(existingCats.map((c) => c.id));
  const existingHabits = await fetchHabits(true);
  const existingHabitIds = new Set(existingHabits.map((h) => h.id));
  const existingRawLogs = await db.select<{ habit_id: string; date: string }[]>(
    "SELECT habit_id, date FROM logs WHERE user_id = $1",
    [getLocalUserId()]
  );
  const existingLogKeys = new Set(existingRawLogs.map((l) => `${l.habit_id}|${l.date}`));

  const userId = getLocalUserId();

  let cats = 0;
  for (const cat of data.categories ?? []) {
    if (!existingCatIds.has(cat.id)) {
      await db.execute(
        "INSERT INTO categories (id, name, color, icon, created_at, user_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [cat.id, cat.name, cat.color, cat.icon, cat.created_at, userId]
      );
      cats++;
    }
  }

  let habits = 0;
  for (const h of data.habits ?? []) {
    if (!existingHabitIds.has(h.id)) {
      await db.execute(
        `INSERT INTO habits
          (id, name, description, category_id, frequency, custom_type, target_days,
           interval_days, start_date, end_date, color, icon,
           type, reminder_enabled, reminder_time, created_at, archived,
           session, completion_type, completion_target, completion_unit,
           time_start, time_end, paused_until, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
        [
          h.id, h.name, h.description ?? null, h.category_id ?? null,
          h.frequency, h.custom_type ?? null,
          h.target_days ? JSON.stringify(h.target_days) : null,
          h.interval_days ?? null, h.start_date ?? null, h.end_date ?? null,
          h.color, h.icon, h.type ?? "normal",
          h.reminder_enabled ? 1 : 0, h.reminder_time ?? null,
          h.created_at, h.archived ? 1 : 0,
          h.session ?? "anytime",
          h.completion_type ?? "binary",
          h.completion_target ?? null,
          h.completion_unit ?? null,
          h.time_start ?? null, h.time_end ?? null,
          h.paused_until ?? null,
          userId,
        ]
      );
      habits++;
    }
  }

  let logs = 0;
  for (const l of data.logs ?? []) {
    const key = `${l.habit_id}|${l.date}`;
    if (!existingLogKeys.has(key)) {
      await db.execute(
        "INSERT INTO logs (id, habit_id, date, completed, note, value, created_at, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [l.id, l.habit_id, l.date, l.completed ? 1 : 0, l.note ?? null, l.value ?? null, l.created_at, userId]
      );
      logs++;
    }
  }

  return { habits, categories: cats, logs };
}
