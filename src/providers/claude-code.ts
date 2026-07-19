// Claude Code provider for Quota.
//
// Reads usage from Claude Code's local state files. Claude Code stores session
// usage information locally. We sniff the standard locations and expose what we
// can without any network calls (privacy-first, no API key needed for the
// local-read path).
//
// This is a best-effort local reader. If the files don't exist or the format
// changes, we return state: 'unknown' rather than fabricating data.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Provider, UsageStatus } from '../types.js';
import { formatCountdown } from '../types.js';

const CLAUDE_DIR = join(homedir(), '.claude');

interface ClaudeUsageFile {
  /** Approximate shape of the usage records Claude Code writes locally. */
  usage?: {
    /** Remaining in the current window, human readable. */
    remaining?: string;
    /** When the window resets, ISO string. */
    resetsAt?: string;
    /** Raw fraction remaining 0..1, if available. */
    remainingFraction?: number;
  };
  /** Some Claude Code builds store a top-level reset timestamp. */
  resetsAt?: string;
  /** Some builds store remaining as a fraction. */
  remainingFraction?: number;
  /** Some builds store a human-readable remaining label. */
  remaining?: string;
}

function readMostRecentUsage(): ClaudeUsageFile | null {
  if (!existsSync(CLAUDE_DIR)) return null;
  // Claude Code writes usage to a usage file; the exact name has shifted across
  // builds, so we scan the directory for the most recent *.json that looks like
  // a usage record.
  let entries: string[] = [];
  try {
    entries = readdirSync(CLAUDE_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return null;
  }

  let best: { file: string; mtime: number } | null = null;
  for (const f of entries) {
    const full = join(CLAUDE_DIR, f);
    try {
      const st = statSync(full);
      if (!best || st.mtimeMs > best.mtime) best = { file: full, mtime: st.mtimeMs };
    } catch {
      // ignore
    }
  }
  if (!best) return null;
  try {
    return JSON.parse(readFileSync(best.file, 'utf8')) as ClaudeUsageFile;
  } catch {
    return null;
  }
}

export class ClaudeCodeProvider implements Provider {
  name = 'Claude Code';

  async fetchStatus(): Promise<UsageStatus> {
    const data = readMostRecentUsage();
    if (!data) {
      return {
        provider: this.name,
        remainingFraction: null,
        remainingLabel: null,
        resetsAt: null,
        resetsInLabel: null,
        state: 'unknown',
        error: `No Claude Code usage found at ${CLAUDE_DIR}`,
      };
    }

    const remaining = data.usage?.remaining ?? data.remaining ?? null;
    const resetsAtStr = data.usage?.resetsAt ?? data.resetsAt ?? null;
    const remainingFraction = data.usage?.remainingFraction ?? data.remainingFraction ?? null;
    const resetsAt = resetsAtStr ? new Date(resetsAtStr) : null;
    let state: UsageStatus['state'] = 'unknown';
    if (remainingFraction !== null) {
      state = remainingFraction > 0.15 ? 'ok' : 'limited';
    } else if (remaining !== null) {
      state = remaining.toLowerCase().includes('0') ? 'limited' : 'ok';
    }

    return {
      provider: this.name,
      remainingFraction: remainingFraction ?? null,
      remainingLabel: remaining,
      resetsAt,
      resetsInLabel: formatCountdown(resetsAt),
      state,
    };
  }
}