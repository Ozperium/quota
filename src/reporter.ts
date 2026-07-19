// Terminal renderer for Quota. Formats a list of UsageStatus into a compact,
// scannable view. No external deps in the hot path (chalk optional).

import type { UsageStatus } from './types.js';

function bar(fraction: number | null, width = 14): string {
  if (fraction === null) return '─'.repeat(width);
  const f = Math.max(0, Math.min(1, fraction));
  const filled = Math.round(f * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function stateGlyph(state: UsageStatus['state']): string {
  switch (state) {
    case 'ok':
      return '🟢';
    case 'limited':
      return '🟡';
    case 'unknown':
      return '⚪';
  }
}

export function renderReport(statuses: UsageStatus[]): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('  quota — your ai usage, at a glance');
  lines.push('');
  for (const s of statuses) {
    const glyph = stateGlyph(s.state);
    const name = s.provider.padEnd(14);
    const barStr = bar(s.remainingFraction);
    const remaining = (s.remainingLabel ?? '—').padEnd(28);
    const reset = (s.resetsInLabel ?? '—').padEnd(14);
    lines.push(`  ${glyph} ${name} ${barStr}  ${remaining} reset ${reset}`);
    if (s.error) {
      lines.push(`    └ ${s.error}`);
    }
  }
  lines.push('');
  lines.push('  run `quota login` to connect a provider, `quota watch` to live-monitor.');
  lines.push('');
  return lines.join('\n');
}

export function renderJson(statuses: UsageStatus[]): string {
  return JSON.stringify(
    statuses.map((s) => ({
      provider: s.provider,
      state: s.state,
      remainingFraction: s.remainingFraction,
      remainingLabel: s.remainingLabel,
      resetsAt: s.resetsAt?.toISOString() ?? null,
      resetsInLabel: s.resetsInLabel,
      error: s.error ?? null,
    })),
    null,
    2,
  );
}