import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import db from '../db/sqlite.js';
import { setUserConfigValue, deleteUserConfigValue } from './config.js';
import { decrypt, isEncrypted } from './encryption.js';

interface ProxyInstance {
  hash: string;
  url: string;
  port: number;
  process: ChildProcess | null;
  userIds: Set<string>;
}

const BASE_PORT = 15733;
const MAX_PORT = 15833;
const PROXY_DIR = path.join(process.cwd(), 'server/data/proxy');

class ProxyManager {
  private instances: Map<string, ProxyInstance> = new Map();
  private usedPorts: Set<number> = new Set();

  async init(): Promise<void> {
    try {
      fs.mkdirSync(PROXY_DIR, { recursive: true });
    } catch (e) {
      console.error('[ProxyManager] Failed to create config dir:', e);
      return;
    }

    try {
      const rows = db.prepare(
        "SELECT user_id, value FROM user_config WHERE key = 'YOUTUBE_SUBSCRIPTION_URL'"
      ).all() as { user_id: string; value: string }[];

      if (rows.length === 0) {
        console.log('[ProxyManager] No saved subscriptions found');
        return;
      }

      const groups = new Map<string, { userId: string; url: string }[]>();
      for (const row of rows) {
        const url = isEncrypted(row.value) ? decrypt(row.value) : row.value;
        const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
        if (!groups.has(hash)) groups.set(hash, []);
        groups.get(hash)!.push({ userId: row.user_id, url });
      }

      for (const [hash, users] of groups) {
        const port = this.allocatePort();
        if (!port) {
          console.error(`[ProxyManager] No available port for ${hash}`);
          continue;
        }
        await this.startInstance(hash, users[0].url, port, users.map(u => u.userId));
      }

      console.log(`[ProxyManager] Initialized ${this.instances.size} proxy instance(s) for ${rows.length} user(s)`);
    } catch (e) {
      console.error('[ProxyManager] Init error:', e);
    }
  }

  async register(userId: string, url: string): Promise<void> {
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
    const existing = this.instances.get(hash);

    if (existing) {
      existing.userIds.add(userId);
      setUserConfigValue('YOUTUBE_PROXY_URL', `http://127.0.0.1:${existing.port}`, userId);
      console.log(`[ProxyManager] User ${userId.slice(0, 8)} → existing proxy ${hash}:${existing.port}`);
    } else {
      const port = this.allocatePort();
      if (!port) throw new Error('无可用代理端口（上限 100 个实例）');
      await this.startInstance(hash, url, port, [userId]);
      setUserConfigValue('YOUTUBE_PROXY_URL', `http://127.0.0.1:${port}`, userId);
      console.log(`[ProxyManager] User ${userId.slice(0, 8)} → new proxy ${hash}:${port}`);
    }
  }

  unregister(userId: string): void {
    for (const [hash, inst] of this.instances) {
      if (inst.userIds.has(userId)) {
        inst.userIds.delete(userId);
        deleteUserConfigValue('YOUTUBE_PROXY_URL', userId);
        console.log(`[ProxyManager] User ${userId.slice(0, 8)} removed from ${hash}`);

        if (inst.userIds.size === 0) {
          this.stopInstance(hash);
          this.freePort(inst.port);
          console.log(`[ProxyManager] Proxy ${hash} stopped (no users)`);
        }
        return;
      }
    }
  }

  shutdown(): void {
    const count = this.instances.size;
    for (const [hash] of this.instances) {
      this.stopInstance(hash);
    }
    this.instances.clear();
    this.usedPorts.clear();
    console.log(`[ProxyManager] Shutdown complete (${count} instance(s) stopped)`);
  }

  /** Get proxy URL for a user (public, not used yet — kept for convenience) */
  getProxyUrl(userId: string): string | null {
    for (const inst of this.instances.values()) {
      if (inst.userIds.has(userId)) {
        return `http://127.0.0.1:${inst.port}`;
      }
    }
    return null;
  }

  // ─── private ──────────────────────────────────────────

  private startInstance(hash: string, url: string, port: number, userIds: string[]): Promise<void> {
    const configDir = path.join(PROXY_DIR, hash);
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.yaml'), this.generateConfig(port, url));

    return new Promise((resolve) => {
      const proc = spawn('mihomo', ['-d', configDir], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let started = false;
      const onData = (data: Buffer) => {
        const text = data.toString();
        if (!started && (text.includes('mixed proxy') || text.includes('HTTP proxy') || text.includes('started') || text.includes('Running'))) {
          started = true;
          resolve();
        }
      };

      proc.stdout?.on('data', onData);
      proc.stderr?.on('data', onData);

      // Fallback: resolve after 3s even if startup message not detected
      const fallbackTimer = setTimeout(() => {
        if (!started) {
          started = true;
          console.log(`[ProxyManager] ${hash} started (fallback timeout)`);
          resolve();
        }
      }, 3000);

      proc.on('error', (err) => {
        clearTimeout(fallbackTimer);
        if (!started) { started = true; resolve(); }
        console.error(`[ProxyManager] ${hash} spawn error:`, err.message);
      });

      proc.on('exit', (code, signal) => {
        console.log(`[ProxyManager] ${hash} exited (code=${code}, signal=${signal})`);
        // Auto-restart if still registered
        if (this.instances.has(hash)) {
          console.log(`[ProxyManager] ${hash} auto-restart in 2s...`);
          setTimeout(() => {
            if (this.instances.has(hash)) {
              const inst = this.instances.get(hash)!;
              inst.process = null;
              this.startInstance(hash, inst.url, inst.port, [...inst.userIds]);
            }
          }, 2000);
        }
      });

      this.instances.set(hash, { hash, url, port, process: proc, userIds: new Set(userIds) });
    });
  }

  private stopInstance(hash: string): void {
    const inst = this.instances.get(hash);
    if (!inst) return;
    if (inst.process) {
      inst.process.kill('SIGTERM');
      setTimeout(() => {
        if (inst.process && !inst.process.killed) {
          inst.process.kill('SIGKILL');
        }
      }, 3000);
    }
    this.instances.delete(hash);
  }

  private allocatePort(): number | null {
    for (let p = BASE_PORT; p <= MAX_PORT; p++) {
      if (!this.usedPorts.has(p)) {
        this.usedPorts.add(p);
        return p;
      }
    }
    return null;
  }

  private freePort(port: number): void {
    this.usedPorts.delete(port);
  }

  private generateConfig(port: number, subscriptionUrl: string): string {
    return `mixed-port: ${port}
allow-lan: false
mode: rule
log-level: warning
ipv6: false

proxy-providers:
  provider1:
    type: http
    url: "${subscriptionUrl}"
    interval: 86400

proxy-groups:
  - name: Proxy
    type: select
    use:
      - provider1

rules:
  - MATCH,Proxy
`;
  }
}

export const proxyManager = new ProxyManager();
