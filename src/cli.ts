#!/usr/bin/env node
// Quota CLI entry point.
// Usage:
//   quota            — show usage for all connected providers
//   quota watch      — re-check every N seconds (default 60)
//   quota login      — (todo) connect a provider via OAuth
//   quota --json     — machine-readable output
//   quota --help     — help

import { ClaudeCodeProvider } from './providers/claude-code.js';
import { CodexProvider } from './providers/codex.js';
import { StubProvider } from './providers/stub.js';
import type { Provider, UsageStatus } from './types.js';
import { renderReport, renderJson } from './reporter.js';

function getProviders(): Provider[] {
  // For the MVP, show all known providers. Connected ones report real data;
  // others show a "not connected" stub so the user sees what's possible.
  return [
    new ClaudeCodeProvider(),
    new CodexProvider(),
    new StubProvider('Cursor'),
    new StubProvider('Grok'),
  ];
}

async function fetchAll(providers: Provider[]): Promise<UsageStatus[]> {
  const results = await Promise.allSettled(providers.map((p) => p.fetchStatus()));
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          provider: providers[i].name,
          remainingFraction: null,
          remainingLabel: null,
          resetsAt: null,
          resetsInLabel: null,
          state: 'unknown',
          error: String(r.reason),
        },
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const json = args.includes('--json') || args.includes('-j');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    printHelp();
    return;
  }

  const sub = args.find((a) => !a.startsWith('-'));
  const providers = getProviders();

  if (sub === 'watch') {
    const intervalArg = args[args.indexOf('watch') + 1];
    const interval = Number.parseInt(intervalArg ?? '60', 10);
    const ms = Number.isFinite(interval) && interval > 0 ? interval * 1000 : 60000;
    await printOnce(providers, json);
    setInterval(() => printOnce(providers, json, true), ms);
    return; // keep alive
  }

  if (sub === 'login') {
    console.log('\nquota login — provider setup\n');
    console.log('OAuth flows are coming in the next release. For now, Quota reads');
    console.log('local state files for Claude Code and Codex automatically — just');
    console.log('make sure the provider CLIs are installed and you have used them.');
    console.log('\nProviders detected:');
    for (const p of providers) {
      const s = await p.fetchStatus();
      const connected = s.state !== 'unknown' || !s.error;
      console.log(`  ${connected ? '✓' : '○'} ${p.name}`);
    }
    console.log('');
    return;
  }

  await printOnce(providers, json);
}

async function printOnce(providers: Provider[], json: boolean, clear = false): Promise<void> {
  const statuses = await fetchAll(providers);
  if (clear && process.stdout.isTTY) {
    process.stdout.write('\x1B[2J\x1B[H');
  }
  process.stdout.write((json ? renderJson(statuses) : renderReport(statuses)) + '\n');
}

function printHelp(): void {
  console.log(`
quota — terminal-first AI usage & limit tracker

USAGE
  quota              Show usage for all connected providers
  quota watch [sec]  Live-monitor (re-checks every N seconds, default 60)
  quota login        Show provider connection status
  quota --json       Machine-readable JSON output
  quota --help       This help

PROVIDERS (MVP)
  Claude Code        reads local usage state from ~/.claude
  Codex             reads local usage state from ~/.codex
  Cursor            (coming soon)
  Grok              (coming soon)

PRIVACY
  Quota reads provider state locally. No data leaves your machine except
  direct calls you initiate to provider APIs. Config lives in ~/.quota.

  https://github.com/pawfromoz/quota
`);
}

main().catch((err) => {
  console.error('quota: error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});