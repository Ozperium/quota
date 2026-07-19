// Local file-based config for Quota.
// Stores provider credentials/tokens in ~/.quota/config.json (chmod 600).
// Privacy-first: nothing leaves the machine except direct calls to provider APIs.

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export interface QuotaConfig {
  /** Per-provider config, keyed by provider name. */
  providers: Record<string, Record<string, unknown>>;
  /** Which providers are enabled. */
  enabled: string[];
}

const CONFIG_PATH = join(homedir(), '.quota', 'config.json');

export function configPath(): string {
  return CONFIG_PATH;
}

export function loadConfig(): QuotaConfig {
  if (!existsSync(CONFIG_PATH)) return { providers: {}, enabled: [] };
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<QuotaConfig>;
    return {
      providers: parsed.providers ?? {},
      enabled: parsed.enabled ?? [],
    };
  } catch {
    return { providers: {}, enabled: [] };
  }
}

export function saveConfig(cfg: QuotaConfig): void {
  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    // best effort
  }
}

export function getProviderConfig<T = Record<string, unknown>>(name: string): T | null {
  const cfg = loadConfig();
  return (cfg.providers[name] ?? null) as T | null;
}

export function setProviderConfig(name: string, data: Record<string, unknown>): void {
  const cfg = loadConfig();
  cfg.providers[name] = data;
  if (!cfg.enabled.includes(name)) cfg.enabled.push(name);
  saveConfig(cfg);
}