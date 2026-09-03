import initSqlJs, { type Database as SqlDatabase } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { useSyncExternalStore } from 'react';

export type SaleCategory = 'moto' | 'consortium';
export type SaleDirection = 'add' | 'remove';

export type SalesState = {
  counts: Record<SaleCategory, number>;
  goal: number;
  lastAction: { category: SaleCategory; direction: SaleDirection; at: number } | null;
  updatedAt: number;
};

export type StoredAudio = {
  name: string;
  type: string;
  bytes: Uint8Array;
  updatedAt: number;
};

const DATABASE_STORAGE_KEY = 'honda-metas-sqlite-v1';
const SNAPSHOT_STORAGE_KEY = 'honda-metas-snapshot-v1';
const DEFAULT_STATE: SalesState = {
  counts: { moto: 0, consortium: 0 },
  goal: 30,
  lastAction: null,
  updatedAt: Date.now(),
};

let state = readSnapshot() ?? DEFAULT_STATE;
let database: SqlDatabase | null = null;
let databaseReady: Promise<void> | null = null;
let pendingState: SalesState | null = null;
let storedAudio: StoredAudio | null = null;
let pendingAudio: StoredAudio | null | undefined;
const listeners = new Set<() => void>();
const audioListeners = new Set<() => void>();

function isSaleCategory(value: unknown): value is SaleCategory {
  return value === 'moto' || value === 'consortium';
}

function isSaleDirection(value: unknown): value is SaleDirection {
  return value === 'add' || value === 'remove';
}

function normalizeState(value: Partial<SalesState>): SalesState {
  const legacyCounts = value.counts as Partial<
    Record<SaleCategory | 'cash' | 'finance', number>
  > | undefined;
  const legacyGoals = (
    value as Partial<SalesState> & {
      goals?: Partial<Record<SaleCategory | 'cash' | 'finance', number>>;
    }
  ).goals;
  const motoCount =
    typeof legacyCounts?.moto === 'number'
      ? legacyCounts.moto
      : legacyCounts?.cash;
  const legacyGoalValues = [legacyGoals?.moto, legacyGoals?.consortium].filter(
    (goal): goal is number => typeof goal === 'number',
  );
  const inferredLegacyGoal =
    legacyGoalValues.length > 0 &&
    legacyGoalValues.every((legacyGoal) => legacyGoal === legacyGoalValues[0])
      ? legacyGoalValues[0]
      : undefined;
  const unifiedGoal =
    typeof value.goal === 'number' ? value.goal : inferredLegacyGoal;
  const lastAction =
    value.lastAction &&
    isSaleCategory(value.lastAction.category) &&
    isSaleDirection(value.lastAction.direction) &&
    typeof value.lastAction.at === 'number'
      ? value.lastAction
      : null;
  const normalizedCounts = {
    moto:
      typeof motoCount === 'number'
        ? Math.max(0, motoCount)
        : DEFAULT_STATE.counts.moto,
    consortium:
      typeof legacyCounts?.consortium === 'number'
        ? Math.max(0, legacyCounts.consortium)
        : DEFAULT_STATE.counts.consortium,
  };
  const isLegacyDemoState =
    lastAction === null &&
    normalizedCounts.moto === 18 &&
    normalizedCounts.consortium === 9;

  return {
    ...DEFAULT_STATE,
    ...value,
    counts: isLegacyDemoState
      ? { moto: 0, consortium: 0 }
      : normalizedCounts,
    goal:
      typeof unifiedGoal === 'number'
        ? Math.max(1, unifiedGoal)
        : DEFAULT_STATE.goal,
    lastAction,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
  };
}

function readSnapshot(): SalesState | null {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const stored = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!stored) return null;
    return normalizeState(JSON.parse(stored) as Partial<SalesState>);
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function notifyAudio() {
  audioListeners.forEach((listener) => listener());
}

function persistSnapshot(next: SalesState) {
  try {
    window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The SQLite database remains the source of truth when storage is blocked.
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function ensureSchema(db: SqlDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS sales_progress (
      category TEXT PRIMARY KEY NOT NULL,
      sales_count INTEGER NOT NULL,
      goal INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audio_assets (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      audio_blob BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

function readAudioFromDatabase(db: SqlDatabase): StoredAudio | null {
  const result = db.exec(
    'SELECT file_name, mime_type, audio_blob, updated_at FROM audio_assets WHERE id = 1',
  );
  const [name, type, bytes, updatedAt] = result[0]?.values[0] ?? [];
  if (
    typeof name !== 'string' ||
    typeof type !== 'string' ||
    !(bytes instanceof Uint8Array)
  ) {
    return null;
  }
  return {
    name,
    type,
    bytes,
    updatedAt: typeof updatedAt === 'number' ? updatedAt : Date.now(),
  };
}

function readStateFromDatabase(db: SqlDatabase): SalesState | null {
  const result = db.exec(
    'SELECT category, sales_count, goal FROM sales_progress',
  );
  const rows = result[0]?.values ?? [];
  if (rows.length === 0) return null;

  const counts = { ...DEFAULT_STATE.counts };
  const databaseGoals: number[] = [];
  rows.forEach(([category, count, goal]) => {
    const normalizedCategory = category === 'cash' ? 'moto' : category;
    if (!isSaleCategory(normalizedCategory)) return;
    if (typeof count === 'number') {
      counts[normalizedCategory] = Math.max(0, count);
    }
    if (typeof goal === 'number') {
      databaseGoals.push(goal);
    }
  });
  const goal =
    databaseGoals.length > 0 &&
    databaseGoals.every((databaseGoal) => databaseGoal === databaseGoals[0])
      ? Math.max(1, databaseGoals[0])
      : DEFAULT_STATE.goal;

  const meta = db.exec(
    `SELECT key, value FROM app_meta WHERE key IN ('lastAction', 'updatedAt')`,
  );
  let lastAction: SalesState['lastAction'] = null;
  let updatedAt = Date.now();
  (meta[0]?.values ?? []).forEach(([key, value]) => {
    if (key === 'lastAction' && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as SalesState['lastAction'];
        if (
          parsed &&
          isSaleCategory(parsed.category) &&
          isSaleDirection(parsed.direction) &&
          typeof parsed.at === 'number'
        ) {
          lastAction = parsed;
        }
      } catch {
        lastAction = null;
      }
    }
    if (key === 'updatedAt' && typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) updatedAt = parsed;
    }
  });

  return normalizeState({ counts, goal, lastAction, updatedAt });
}

function writeStateToDatabase(next: SalesState) {
  if (!database) return;
  database.run('DELETE FROM sales_progress');
  (Object.keys(next.counts) as SaleCategory[]).forEach((category) => {
    database?.run(
      'INSERT INTO sales_progress (category, sales_count, goal) VALUES (?, ?, ?)',
      [category, next.counts[category], next.goal],
    );
  });
  database.run(
    `INSERT INTO app_meta (key, value) VALUES ('lastAction', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [next.lastAction ? JSON.stringify(next.lastAction) : 'null'],
  );
  database.run(
    `INSERT INTO app_meta (key, value) VALUES ('updatedAt', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(next.updatedAt)],
  );
  persistSnapshot(next);
  persistDatabaseBytes();
}

function persistDatabaseBytes() {
  if (!database) return;
  try {
    window.localStorage.setItem(
      DATABASE_STORAGE_KEY,
      bytesToBase64(database.export()),
    );
  } catch {
    // Browsers can block persistence in private or restricted contexts.
  }
}

function writeAudioToDatabase(next: StoredAudio | null) {
  if (!database) return;
  database.run('DELETE FROM audio_assets');
  if (next) {
    database.run(
      `INSERT INTO audio_assets (id, file_name, mime_type, audio_blob, updated_at)
       VALUES (1, ?, ?, ?, ?)`,
      [next.name, next.type, next.bytes, next.updatedAt],
    );
  }
  persistDatabaseBytes();
}

async function initializeDatabase() {
  if (typeof window === 'undefined' || databaseReady) return databaseReady;
  databaseReady = (async () => {
    const SQL = await initSqlJs({
      locateFile: () => wasmUrl,
    });
    let db: SqlDatabase;
    const serialized = window.localStorage.getItem(DATABASE_STORAGE_KEY);
    try {
      db = serialized
        ? new SQL.Database(base64ToBytes(serialized))
        : new SQL.Database();
    } catch {
      db = new SQL.Database();
    }
    ensureSchema(db);
    database = db;
    storedAudio = readAudioFromDatabase(db);
    notifyAudio();

    if (pendingState) {
      writeStateToDatabase(pendingState);
      pendingState = null;
    }

    if (pendingAudio !== undefined) {
      storedAudio = pendingAudio;
      writeAudioToDatabase(pendingAudio);
      pendingAudio = undefined;
      notifyAudio();
    }

    if (!pendingState) {
      const loaded = readStateFromDatabase(db);
      if (loaded) {
        state = loaded;
        persistSnapshot(loaded);
        notify();
      } else {
        writeStateToDatabase(state);
      }
    }
  })().catch(() => {
    databaseReady = null;
  });
  return databaseReady;
}

function persist(next: SalesState) {
  state = next;
  persistSnapshot(next);
  if (database) {
    writeStateToDatabase(next);
  } else {
    pendingState = next;
    void initializeDatabase();
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  void initializeDatabase();
  window.addEventListener('storage', (event) => {
    if (event.key === SNAPSHOT_STORAGE_KEY) {
      const next = readSnapshot();
      if (!next) return;
      state = next;
      notify();
      return;
    }
    if (event.key === DATABASE_STORAGE_KEY && event.newValue) {
      void syncDatabaseFromStorage(event.newValue);
    }
  });
}

async function syncDatabaseFromStorage(serialized: string) {
  try {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const nextDatabase = new SQL.Database(base64ToBytes(serialized));
    ensureSchema(nextDatabase);
    database = nextDatabase;
    state = readStateFromDatabase(nextDatabase) ?? state;
    storedAudio = readAudioFromDatabase(nextDatabase);
    notify();
    notifyAudio();
  } catch {
    // The current tab keeps its last known state if another tab's update is unreadable.
  }
}

export function useSalesState() {
  return useSyncExternalStore(subscribe, () => state, () => DEFAULT_STATE);
}

export function useStoredAudio() {
  return useSyncExternalStore(
    (listener) => {
      audioListeners.add(listener);
      return () => audioListeners.delete(listener);
    },
    () => storedAudio,
    () => null,
  );
}

export async function uploadAudioFile(file: File) {
  const isMp3 =
    file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3');
  if (!isMp3) {
    throw new Error('Escolha um arquivo MP3.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('O arquivo MP3 deve ter no máximo 5 MB.');
  }

  const next: StoredAudio = {
    name: file.name,
    type: file.type || 'audio/mpeg',
    bytes: new Uint8Array(await file.arrayBuffer()),
    updatedAt: Date.now(),
  };
  storedAudio = next;
  pendingAudio = next;
  notifyAudio();
  await initializeDatabase();
  if (!database) {
    throw new Error('Não foi possível abrir o SQLite local.');
  }
  writeAudioToDatabase(next);
  pendingAudio = undefined;
  notifyAudio();
}

export async function clearAudioFile() {
  storedAudio = null;
  pendingAudio = null;
  notifyAudio();
  await initializeDatabase();
  if (!database) {
    throw new Error('Não foi possível abrir o SQLite local.');
  }
  writeAudioToDatabase(null);
  pendingAudio = undefined;
  notifyAudio();
}

export function recordSale(category: SaleCategory, direction: SaleDirection) {
  const current = state.counts[category];
  const nextCount = direction === 'add' ? current + 1 : Math.max(0, current - 1);
  persist({
    ...state,
    counts: { ...state.counts, [category]: nextCount },
    lastAction: { category, direction, at: Date.now() },
    updatedAt: Date.now(),
  });
}

export function updateGoal(goal: number) {
  persist({ ...state, goal: Math.max(1, Math.round(goal)), updatedAt: Date.now() });
}

export function resetSales() {
  persist({
    ...state,
    counts: { moto: 0, consortium: 0 },
    lastAction: null,
    updatedAt: Date.now(),
  });
}

export function getTotal(stateValue: SalesState) {
  return Object.values(stateValue.counts).reduce((sum, value) => sum + value, 0);
}

export const CATEGORY_META: Record<SaleCategory, { label: string; shortLabel: string; detail: string; color: string }> = {
  moto: { label: 'Moto', shortLabel: 'Moto', detail: 'Venda de motocicleta', color: '#e40521' },
  consortium: { label: 'Consórcio', shortLabel: 'Consórcio', detail: 'Plano de conquista', color: '#78aeb4' },
};