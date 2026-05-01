import { DatabaseSync } from 'node:sqlite';
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

export const db = new DatabaseSync(dbPath);

// 启用 WAL 模式，提高并发性能
db.exec('PRAGMA journal_mode = WAL');

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
    keyword_id TEXT,
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
    creator_id TEXT,
    creator_name TEXT
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

  CREATE TABLE IF NOT EXISTS followed_creators (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    last_fetched_at INTEGER,
    UNIQUE(platform, channel_id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'register',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  );
`);

// 迁移已有数据库
try { db.exec(`ALTER TABLE news_items ADD COLUMN is_urgent INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE news_items ADD COLUMN heat REAL DEFAULT 50`); } catch (e) {}
try { db.exec(`ALTER TABLE keywords ADD COLUMN archived INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE news_items ADD COLUMN creator_id TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE news_items ADD COLUMN creator_name TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE followed_creators ADD COLUMN archived INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE news_items ADD COLUMN completed INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE news_items ADD COLUMN favorited INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE keywords ADD COLUMN user_id TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE news_items ADD COLUMN user_id TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE followed_creators ADD COLUMN user_id TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE config ADD COLUMN user_id TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN email TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`); } catch (e) {}
try { db.exec(`ALTER TABLE news_items ADD COLUMN resource_type TEXT DEFAULT 'keyword'`); } catch (e) {}
try { db.exec(`UPDATE news_items SET resource_type = 'creator' WHERE creator_id IS NOT NULL AND resource_type IS NULL`); } catch (e) {}
try { db.exec(`UPDATE news_items SET resource_type = 'keyword' WHERE keyword_id IS NOT NULL AND resource_type IS NULL`); } catch (e) {}

// 迁移：如果 keyword_id 为 NOT NULL，则重建 news_items 表以支持空值
try {
  const cols = db.prepare("PRAGMA table_info('news_items')").all() as any[];
  const kwCol = cols.find((c: any) => c.name === 'keyword_id');
  if (kwCol && kwCol.notnull === 1) {
    db.exec(`
      CREATE TABLE news_items_new (
        id TEXT PRIMARY KEY,
        keyword_id TEXT,
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
        creator_id TEXT,
        creator_name TEXT
      );
      INSERT INTO news_items_new SELECT * FROM news_items;
      DROP TABLE news_items;
      ALTER TABLE news_items_new RENAME TO news_items;
    `);
    console.log('[DB] Migrated news_items: keyword_id is now nullable');
  }
} catch (e: any) {
  console.error('[DB] Migration error:', e.message);
}

export default db;
