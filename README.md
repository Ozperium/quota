# quota

**Terminal-first AI usage & limit tracker.** Know what's left — before it stops you.

[![npm version](https://img.shields.io/npm/v/@ozperium/quota)](https://www.npmjs.com/package/@ozperium/quota)
[![npm downloads](https://img.shields.io/npm/dw/@ozperium/quota)](https://www.npmjs.com/package/@ozperium/quota)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`quota` shows your remaining usage for AI coding tools (Codex, Claude Code, Cursor, Grok) right in your terminal. Stop watching the clock when your AI coding session hits a rate limit.

```
$ quota

  quota — your ai usage, at a glance

  🟢 Claude Code   ████████████░░  3h 12m of 5h               reset in 2h 48m
  🟡 Codex         ███░░░░░░░░░░░  3 of 40 requests            reset in 4h 12m
  ⚪ Cursor         ──────────────  not connected
  ⚪ Grok           ──────────────  not connected

  run `quota login` to connect a provider, `quota watch` to live-monitor.
```

## Why

AI coding assistants (Codex, Claude Code, Cursor) impose rate limits and weekly quotas that **block work mid-task**. "Codex Resets" hit the HN front page with 270+ points and 175 comments — developers are watching the clock and losing flow.

[Limits](https://getlimits.app) proved the pain is real and monetizable, but it's iOS-only. Developers who live in the terminal have no native option. **`quota` is that option.**

## Install

```bash
npm install -g @ozperium/quota
```

## Usage

```
quota                              Show usage for all connected providers
quota watch [sec]                  Live-monitor (re-checks every N seconds, default 60)
quota check [--min-remaining <n>]  Exit 1 if any provider is below n% (for CI)
quota login                        Show provider connection status
quota serve [--port <n>] [--strict]  Run as a Stoke pre_request plugin webhook (see below)
quota --json                       Machine-readable JSON output
quota --help                       Help
```

### CI integration

Fail a build if you're running low before a long test run:

```yaml
# .github/workflows/test.yml
- name: Check AI quota
  run: quota check --min-remaining 20
```

Or in any shell script:

```bash
quota check --min-remaining 10 || echo "Warning: AI quota low, skipping AI tests"
```

Exit codes: `0` = all providers above threshold, `1` = at least one below, `2` = no providers connected.

## Use as a Stoke plugin

[Stoke](https://stokegate.com) enforces *dollar*-world budget caps on metered API traffic, but its own docs say what it can't do: dollar-cap a subscription seat (Claude Max/Pro, Codex, Cursor), because there's no per-request price to meter there. That's quota-world — what `quota` already tracks.

`quota serve` runs `quota` as an HTTP server that answers Stoke's `pre_request` plugin webhook. Before Stoke dispatches a request, it POSTs the candidate `model`/`routing` here; when the matched provider's subscription quota is running low, `quota` hands back a routing override so Stoke reroutes onto a different (dollar-metered or local) route instead of the caller hitting a mid-task 429 from the provider itself. It never blocks by default — pass `--strict` if you want it to refuse instead of reroute.

```bash
quota serve --port 8790
```

```toml
# stoke.toml
[plugins]
pre_request = ["http://127.0.0.1:8790/"]
```

Model names are matched by substring against a small built-in table (`claude` → Claude Code, `codex` → Codex); providers with `state: 'unknown'` or `'ok'` are left untouched.

## Providers (MVP)

| Provider    | Status        | Source                          |
|-------------|---------------|---------------------------------|
| Claude Code | Local read    | `~/.claude` usage files         |
| Codex       | Local read    | `~/.codex` state files          |
| Cursor      | Coming soon   | OAuth                           |
| Grok        | Coming soon   | OAuth                           |

## Privacy

`quota` reads provider state **locally**. No data leaves your machine except direct calls you initiate to provider APIs. Config lives in `~/.quota` (chmod 600).

- No analytics, no ad SDKs, no profiling.
- Tokens are stored on-device only.
- Not affiliated with any provider.

## Shell prompt integration

Show remaining AI quota in your shell prompt using `quota --json`.

### Starship

Add to `~/.config/starship.toml`:

```toml
[custom.quota]
command = """quota --json 2>/dev/null | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const active=d.filter(p=>p.remainingFraction!=null);
if(!active.length) process.exit(1);
console.log(active.map(p=>p.provider.split(' ')[0]+': '+Math.floor(p.remainingFraction*100)+'%').join(' · '));
" 2>/dev/null"""
when = "quota --json 2>/dev/null | node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.exit(d.some(p=>p.remainingFraction!=null)?0:1)\" 2>/dev/null"
format = "[$output]($style) "
style = "yellow"
shell = ["bash", "--noprofile", "--norc"]
```

This adds a segment like `Claude: 64% · Codex: 42%` when providers are connected. Hide it when nothing is connected.

### oh-my-posh

Add a `command` segment to your theme JSON:

```json
{
  "type": "command",
  "style": "plain",
  "foreground": "yellow",
  "properties": {
    "command": "quota --json 2>/dev/null | node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); const a=d.filter(p=>p.remainingFraction!=null); if(a.length) console.log(a.map(p=>p.provider.split(' ')[0]+': '+Math.floor(p.remainingFraction*100)+'%').join(' · '))\" 2>/dev/null"
  }
}
```

## Roadmap

- [x] Local-read providers (Claude Code, Codex)
- [x] Terminal, JSON, watch modes
- [x] Shell prompt integration (starship / oh-my-posh)
- [x] CI check — `quota check --min-remaining <n>` exits 1 when low
- [x] Stoke plugin — `quota serve` answers Stoke's `pre_request` webhook
- [ ] OAuth login for Cursor, Grok
- [ ] macOS menubar app
- [ ] Webhook / notification on reset
- [ ] Cross-provider aggregate dashboard

## Part of the AI Dev Workflow Stack

`quota` is one tool in a three-part observability stack for AI development:

| Tool | What it does | Install |
|------|-------------|---------|
| **[AgentSpec](https://github.com/Ozperium/agentspec)** | Test AI agent behavior — catch regressions before production | `npm i -g @ozperium/agentspec` |
| **[AICostTracker](https://github.com/Ozperium/aicost-tracker)** | Track token usage and costs across projects | `npm i -g @ozperium/aicost-tracker` |
| **quota** | Monitor AI rate limits — know what's left before it stops you | `npm i -g @ozperium/quota` |

## License

MIT © pawfromoz