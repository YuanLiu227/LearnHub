import db from '../db/sqlite.js';
import { encrypt, decrypt, isEncrypted } from './encryption.js';

export const USER_CONFIG_KEYS = [
  'DEEPSEEK_API_KEY',
  'YOUTUBE_API_KEY',
  'YOUTUBE_PROXY_URL',
  'YOUTUBE_SUBSCRIPTION_URL',
  'ENABLE_BILIBILI',
  'ENABLE_YOUTUBE',
  'ENABLE_CODENAV',
  'ENABLE_AI_CODEFATHER',
] as const;

export type UserConfigKey = typeof USER_CONFIG_KEYS[number];

const SECRET_KEYS = new Set(['DEEPSEEK_API_KEY', 'YOUTUBE_API_KEY', 'YOUTUBE_PROXY_URL', 'YOUTUBE_SUBSCRIPTION_URL']);

/**
 * 获取用户配置值，未设置时回退到 process.env
 * 数据源开关默认值为 true
 */
export function getUserConfigValue(key: string, userId?: string): string | null {
  if (userId) {
    const row = db.prepare('SELECT value FROM user_config WHERE key = ? AND user_id = ?').get(key, userId) as { value: string } | undefined;
    if (row) {
      const val = row.value;
      if (SECRET_KEYS.has(key) && isEncrypted(val)) {
        return decrypt(val);
      }
      return val;
    }
  }
  // 回退到环境变量
  if (process.env[key] !== undefined) return process.env[key]!;
  // 数据源开关默认 true
  if (key.startsWith('ENABLE_')) return 'true';
  return null;
}

/** 设置用户配置值（API 密钥自动加密存储） */
export function setUserConfigValue(key: string, value: string, userId: string): void {
  const storedValue = SECRET_KEYS.has(key) ? encrypt(value) : value;
  db.prepare('INSERT OR REPLACE INTO user_config (key, user_id, value) VALUES (?, ?, ?)').run(key, userId, storedValue);
}

/** 删除用户配置值（恢复为 env 默认） */
export function deleteUserConfigValue(key: string, userId: string): void {
  db.prepare('DELETE FROM user_config WHERE key = ? AND user_id = ?').run(key, userId);
}

/**
 * 获取用户所有有效配置，包含来源信息
 */
export function getEffectiveConfig(userId: string): Record<string, { value: string | null; source: 'user' | 'env' | 'none' | 'default' }> {
  const result: Record<string, any> = {};
  for (const key of USER_CONFIG_KEYS) {
    // 查用户配置
    const userRow = db.prepare('SELECT value FROM user_config WHERE key = ? AND user_id = ?').get(key, userId) as { value: string } | undefined;
    if (userRow) {
      const val = SECRET_KEYS.has(key) && isEncrypted(userRow.value) ? decrypt(userRow.value) : userRow.value;
      result[key] = { value: val, source: 'user' };
      continue;
    }
    // 查环境变量
    if (process.env[key] !== undefined) {
      result[key] = { value: process.env[key]!, source: 'env' };
      continue;
    }
    // 数据源开关默认 true
    if (key.startsWith('ENABLE_')) {
      result[key] = { value: 'true', source: 'default' };
      continue;
    }
    result[key] = { value: null, source: 'none' };
  }
  return result;
}
