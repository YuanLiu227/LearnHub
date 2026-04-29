import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.join(__dirname, '../../data/hot-monitor.db');
const dbPath = process.env.DB_PATH || defaultDbPath;

// 确保 data 目录存在
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db: DatabaseType = new Database(dbPath);

// 启用 WAL 模式，提高并发性能
db.pragma('journal_mode = WAL');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS keywords (
    id TEXT PRIMARY KEY,
    term TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'AI编程',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    last_matched_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS news_items (
    id TEXT PRIMARY KEY,
    keyword_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT NOT NULL,
    source_name TEXT NOT NULL,
    published_at INTEGER NOT NULL,
    is_real INTEGER NOT NULL,
    confidence REAL NOT NULL,
    summary TEXT,
    matched_at INTEGER NOT NULL,
    is_urgent INTEGER DEFAULT 0,
    heat REAL DEFAULT 50,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id)
  );

  CREATE TABLE IF NOT EXISTS hot_topics (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT NOT NULL,
    source_name TEXT NOT NULL,
    heat REAL NOT NULL,
    published_at INTEGER NOT NULL,
    scope TEXT NOT NULL,
    summary TEXT,
    fetched_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// 迁移已有数据库：添加新字段
try {
  db.exec(`ALTER TABLE news_items ADD COLUMN is_urgent INTEGER DEFAULT 0`);
} catch (e) {
  // 字段可能已存在
}
try {
  db.exec(`ALTER TABLE news_items ADD COLUMN heat REAL DEFAULT 50`);
} catch (e) {
  // 字段可能已存在
}
try {
  db.exec(`ALTER TABLE keywords ADD COLUMN archived INTEGER DEFAULT 0`);
} catch (e) {
  // 字段可能已存在
}

export default db;
