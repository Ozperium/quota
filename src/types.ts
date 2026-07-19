// Quota — terminal-first AI usage & limit tracker
// Provider abstraction

export interface UsageStatus {
  provider: string;
  /** Remaining in the current window, as a fraction 0..1. null if unknown. */
  remainingFraction: number | null;
  /** Human-readable remaining, e.g. "3 of 5 hours", "12,450 of 40,000 tokens". */
  remainingLabel: string | null;
  /** When the current window resets. */
  resetsAt: Date | null;
  /** Human-readable reset countdown, e.g. "in 3h 20m". */
  resetsInLabel: string | null;
  /** Raw state string if we can only detect it (e.g. "ok", "limited", "unknown"). */
  state: 'ok' | 'limited' | 'unknown';
  /** Optional: error message if fetching failed. */
  error?: string;
}

export interface Provider {
  name: string;
  /** Fetch current usage status. Reads credentials from config/env. */
  fetchStatus(): Promise<UsageStatus>;
}

/** Format a future Date as a countdown from now. */
export function formatCountdown(resetsAt: Date | null, now: Date = new Date()): string | null {
  if (!resetsAt) return null;
  const ms = resetsAt.getTime() - now.getTime();
  if (ms <= 0) return 'now';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return `in ${parts.join(' ')}`;
}