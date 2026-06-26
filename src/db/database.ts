import Database from "@tauri-apps/plugin-sql";
import type { Category, Habit, Log } from "../types";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:zyrco.db");
    await initSchema(db);
  }
  return db;
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

export async function exportAllData(): Promise<ExportData> {
  const db = await getDb();
  const categories = await fetchCategories();
  const habits = await fetchHabits(true);
  const rawLogs = await db.select<RawLog[]>("SELECT * FROM logs ORDER BY date DESC");
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
