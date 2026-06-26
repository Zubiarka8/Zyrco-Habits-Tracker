import Database from "@tauri-apps/plugin-sql";
import type { Category, Habit, Log, Subscription, PlanType } from "../types";

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

// Polls until window.__TAURI_INTERNALS__ is injected by the webview.
// In dev mode the IPC bridge can arrive a few ms after React mounts.
function waitForTauriBridge(): Promise<void> {
  if ("__TAURI_INTERNALS__" in window) return Promise.resolve();
  return new Promise((resolve) => {
    const id = setInterval(() => {
      if ("__TAURI_INTERNALS__" in window) {
        clearInterval(id);
        resolve();
      }
    }, 20);
  });
}

// Single promise ensures concurrent callers share one init — no SQLite lock races.
// Resets on failure so the next caller can retry.
export function getDb(): Promise<Database> {
  if (db) return Promise.resolve(db);
  if (!dbInitPromise) {
    dbInitPromise = waitForTauriBridge()
      .then(() => Database.load("sqlite:zyrco.db"))
      .then(async (conn) => {
        await initSchema(conn);
        db = conn;
        return conn;
      })
      .catch((err) => {
        dbInitPromise = null; // allow retry on next call
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

  // Seed a default free subscription for local user if none exists
  const existingSubs = await database.select<{ id: string }[]>(
    "SELECT id FROM subscriptions LIMIT 1"
  );
  if (existingSubs.length === 0) {
    const localUserId = getLocalUserId();
    await database.execute(
      `INSERT INTO subscriptions
        (id, user_id, plan_type, status, started_at,
         expires_at, cancelled_at, renewed_at, payment_provider,
         payment_reference, streak_shields_used, streak_shields_reset_at)
       VALUES ($1,$2,'free','active',$3,NULL,NULL,NULL,NULL,NULL,0,NULL)`,
      [crypto.randomUUID(), localUserId, new Date().toISOString()]
    );
  }

  // Migration: add `type` column to existing DBs that don't have it yet
  const cols = await database.select<{ name: string }[]>(
    "PRAGMA table_info(habits)"
  );
  if (!cols.some((c) => c.name === "type")) {
    await database.execute(
      "ALTER TABLE habits ADD COLUMN type TEXT NOT NULL DEFAULT 'normal'"
    );
  }
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

// ---- Subscriptions ----

type RawSubscription = Omit<Subscription, "streak_shields_used"> & {
  streak_shields_used: number;
};

function parseSubscription(raw: RawSubscription): Subscription {
  return { ...raw, streak_shields_used: Number(raw.streak_shields_used) };
}

/** Returns current local subscription. Always exists (seeded as free on first launch). */
export async function getSubscription(): Promise<Subscription | null> {
  const db = await getDb();
  const rows = await db.select<RawSubscription[]>(
    "SELECT * FROM subscriptions ORDER BY started_at DESC LIMIT 1"
  );
  return rows.length ? parseSubscription(rows[0]) : null;
}

/**
 * [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME]
 * Activar plan premium tras pago confirmado por RevenueCat / Stripe.
 * Actualmente no se llama desde ningún lugar — preparado para integración futura.
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
 * Llamar desde un cron o al abrir la app si expires_at < NOW().
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
 * Usa un streak shield. Resetea el contador mensual si hace falta.
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
  return db.select<Category[]>("SELECT * FROM categories ORDER BY name ASC");
}

export async function insertCategory(
  data: Omit<Category, "id" | "created_at">
): Promise<Category> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  await db.execute(
    "INSERT INTO categories (id, name, color, icon, created_at) VALUES ($1, $2, $3, $4, $5)",
    [id, data.name, data.color, data.icon, created_at]
  );
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
  await db.execute(`UPDATE categories SET ${fields} WHERE id = $1`, [
    id,
    ...Object.values(data),
  ]);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM categories WHERE id = $1", [id]);
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
    type: (raw.type as Habit["type"]) ?? "good",
    target_days: raw.target_days ? JSON.parse(raw.target_days) : null,
    reminder_enabled: raw.reminder_enabled === 1,
    archived: raw.archived === 1,
  };
}

// [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME] Límite de hábitos activos.
// Free tendrá máximo 10. Aquí devolver todos; el hook useHabits aplicará el límite de UI.
// Cuando MONETIZATION_ACTIVE = true: SELECT ... LIMIT según PLAN_LIMITS[plan].maxHabits
export async function fetchHabits(includeArchived = false): Promise<Habit[]> {
  const db = await getDb();
  const rows = await db.select<RawHabit[]>(
    includeArchived
      ? "SELECT * FROM habits ORDER BY created_at ASC"
      : "SELECT * FROM habits WHERE archived = 0 ORDER BY created_at ASC"
  );
  return rows.map(parseHabit);
}

export async function insertHabit(
  data: Omit<Habit, "id" | "created_at" | "archived">
): Promise<Habit> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  await db.execute(
    `INSERT INTO habits
      (id, name, description, category_id, frequency, target_days, color, icon,
       type, reminder_enabled, reminder_time, created_at, archived)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0)`,
    [
      id,
      data.name,
      data.description ?? null,
      data.category_id ?? null,
      data.frequency,
      data.target_days ? JSON.stringify(data.target_days) : null,
      data.color,
      data.icon,
      data.type,
      data.reminder_enabled ? 1 : 0,
      data.reminder_time ?? null,
      created_at,
    ]
  );
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
  await db.execute(`UPDATE habits SET ${fields} WHERE id = $1`, [
    id,
    ...Object.values(normalized),
  ]);
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM habits WHERE id = $1", [id]);
}

// ---- Logs ----

type RawLog = Omit<Log, "completed"> & { completed: number };

function parseLog(raw: RawLog): Log {
  return { ...raw, completed: raw.completed === 1 };
}

export async function fetchLogsForDate(date: string): Promise<Log[]> {
  const db = await getDb();
  const rows = await db.select<RawLog[]>(
    "SELECT * FROM logs WHERE date = $1",
    [date]
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
    "SELECT * FROM logs WHERE habit_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC",
    [habitId, startDate, endDate]
  );
  return rows.map(parseLog);
}

export async function fetchAllLogs(): Promise<Log[]> {
  const db = await getDb();
  const rows = await db.select<RawLog[]>(
    "SELECT * FROM logs WHERE completed = 1 ORDER BY date DESC"
  );
  return rows.map(parseLog);
}

export async function upsertLog(
  habitId: string,
  date: string,
  completed: boolean,
  note?: string | null
): Promise<void> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  await db.execute(
    `INSERT INTO logs (id, habit_id, date, completed, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(habit_id, date) DO UPDATE SET completed = $4, note = COALESCE($5, note)`,
    [id, habitId, date, completed ? 1 : 0, note ?? null, created_at]
  );
}

export async function updateLogNote(
  habitId: string,
  date: string,
  note: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE logs SET note = $1 WHERE habit_id = $2 AND date = $3",
    [note, habitId, date]
  );
}

// ---- Import / Export ----

export interface ExportData {
  version: number;
  exportedAt: string;
  categories: Category[];
  habits: Habit[];
  logs: Log[];
}

// [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME] Exportar datos será exclusivo de pago.
// Free podrá exportar solo JSON básico; CSV/PDF serán premium.
export async function exportAllData(): Promise<ExportData> {
  const db = await getDb();
  const categories = await fetchCategories();
  const habits = await fetchHabits(true);
  const rawLogs = await db.select<RawLog[]>("SELECT * FROM logs ORDER BY date DESC");
  const logs = rawLogs.map(parseLog);
  return { version: 1, exportedAt: new Date().toISOString(), categories, habits, logs };
}

// [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME] Importar historial completo será exclusivo de pago.
export async function importData(data: ExportData): Promise<{ habits: number; categories: number; logs: number }> {
  const db = await getDb();

  const existingCats = await fetchCategories();
  const existingCatIds = new Set(existingCats.map((c) => c.id));
  const existingHabits = await fetchHabits(true);
  const existingHabitIds = new Set(existingHabits.map((h) => h.id));
  const existingRawLogs = await db.select<{ habit_id: string; date: string }[]>(
    "SELECT habit_id, date FROM logs"
  );
  const existingLogKeys = new Set(existingRawLogs.map((l) => `${l.habit_id}|${l.date}`));

  let cats = 0;
  for (const cat of data.categories ?? []) {
    if (!existingCatIds.has(cat.id)) {
      await db.execute(
        "INSERT INTO categories (id, name, color, icon, created_at) VALUES ($1,$2,$3,$4,$5)",
        [cat.id, cat.name, cat.color, cat.icon, cat.created_at]
      );
      cats++;
    }
  }

  let habits = 0;
  for (const h of data.habits ?? []) {
    if (!existingHabitIds.has(h.id)) {
      await db.execute(
        `INSERT INTO habits
          (id, name, description, category_id, frequency, target_days, color, icon,
           type, reminder_enabled, reminder_time, created_at, archived)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          h.id, h.name, h.description ?? null, h.category_id ?? null,
          h.frequency, h.target_days ? JSON.stringify(h.target_days) : null,
          h.color, h.icon, h.type ?? "good",
          h.reminder_enabled ? 1 : 0, h.reminder_time ?? null,
          h.created_at, h.archived ? 1 : 0,
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
        "INSERT INTO logs (id, habit_id, date, completed, note, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
        [l.id, l.habit_id, l.date, l.completed ? 1 : 0, l.note ?? null, l.created_at]
      );
      logs++;
    }
  }

  return { habits, categories: cats, logs };
}
