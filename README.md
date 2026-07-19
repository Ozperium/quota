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
npm install -g quota
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

## Roadmap

- [x] Local-read providers (Claude Code, Codex)
- [x] Terminal, JSON, watch modes
- [ ] OAuth login for Cursor, Grok
- [ ] Shell prompt integration (starship / oh-my-posh segment)
- [ ] macOS menubar app
- [ ] CI check (fail build when out of quota)
- [ ] Webhook / notification on reset
- [ ] Cross-provider aggregate dashboard

## Why a second product from the same author

`quota` is a standalone product. It shares no code with [AgentSpec](https://github.com/Ozperium/agentspec) (AI agent testing). Different problem, different customers, different value proposition.

## License

MIT © pawfromoz