// Codex provider for Quota.
//
// Reads Codex usage from the local Codex CLI state and the OpenAI/ChatGPT
// account. Codex (the OpenAI coding agent) exposes rate-limit headers when it
// makes requests; the Codex CLI caches recent usage locally. We read that cache
// without making network calls (privacy-first).
//
// If the local cache is missing, we fall back to 'unknown' rather than
// fabricating numbers.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Provider, UsageStatus } from '../types.js';
import { formatCountdown } from '../types.js';

const CODEX_DIR = join(homedir(), '.codex');

interface CodexStateFile {
  /** When the current rate-limit window resets, ISO string. */
  rateLimitResetsAt?: string;
  /** Remaining requests in the window, if known. */
  remaining?: number;
  /** Total requests in the window, if known. */
  limit?: number;
  /** Human-readable remaining label, if available. */
  remainingLabel?: string;
}

function readCodexState(): CodexStateFile | null {
  if (!existsSync(CODEX_DIR)) return null;
  let entries: string[] = [];
  try {
    entries = readdirSync(CODEX_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return null;
  }
  let best: { file: string; mtime: number } | null = null;
  for (const f of entries) {
    const full = join(CODEX_DIR, f);
    try {
      const st = statSync(full);
      if (!best || st.mtimeMs > best.mtime) best = { file: full, mtime: st.mtimeMs };
    } catch {
      // ignore
    }
  }
  if (!best) return null;
  try {
    return JSON.parse(readFileSync(best.file, 'utf8')) as CodexStateFile;
  } catch {
    return null;
  }
}

export class CodexProvider implements Provider {
  name = 'Codex';

  async fetchStatus(): Promise<UsageStatus> {
    const data = readCodexState();
    if (!data) {
      return {
        provider: this.name,
        remainingFraction: null,
        remainingLabel: null,
        resetsAt: null,
        resetsInLabel: null,
        state: 'unknown',
        error: `No Codex state found at ${CODEX_DIR}`,
      };
    }

    const resetsAt = data.rateLimitResetsAt ? new Date(data.rateLimitResetsAt) : null;
    let remainingFraction: number | null = null;
    let remainingLabel: string | null = data.remainingLabel ?? null;
    if (typeof data.remaining === 'number' && typeof data.limit === 'number' && data.limit > 0) {
      remainingFraction = data.remaining / data.limit;
      if (!remainingLabel) remainingLabel = `${data.remaining} of ${data.limit} requests`;
    }

    let state: UsageStatus['state'] = 'unknown';
    if (remainingFraction !== null) {
      state = remainingFraction > 0.15 ? 'ok' : 'limited';
    }

    return {
      provider: this.name,
      remainingFraction,
      remainingLabel,
      resetsAt,
      resetsInLabel: formatCountdown(resetsAt),
      state,
    };
  }
}