# quota

**Terminal-first AI usage & limit tracker.** Know what's left — before it stops you.

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
quota              Show usage for all connected providers
quota watch [sec]  Live-monitor (re-checks every N seconds, default 60)
quota login        Show provider connection status
quota --json       Machine-readable JSON output (for scripts, prompts, CI)
quota --help       Help
```

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
- [ ] OAuth login for Cursor, Grok
- [ ] macOS menubar app
- [ ] CI check (fail build when out of quota)
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