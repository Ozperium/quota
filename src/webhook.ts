// Quota as a Stoke plugin.
//
// Stoke (https://stokegate.com) enforces *dollar*-world budget caps but says so
// itself: it cannot dollar-cap subscription seats (Claude Max/Pro, Codex, Cursor)
// because there's no per-request price to meter. That's quota-world — exactly
// what Quota already tracks locally. This module lets a running `quota serve`
// answer Stoke's `pre_request` plugin webhook: before Stoke dispatches a
// request, it POSTs { model, routing, messages, api_key, metadata } here and
// applies whatever we return.
//
// We never block by default — Quota's whole ethos is "tell you before it stops
// you," not "stop you ourselves." When the matched provider's subscription
// quota is running low, we hand back a routing override (default: "auto-cheap")
// so Stoke reroutes the request off the constrained seat instead of the caller
// hitting a mid-task 429 from the provider itself.

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Provider, UsageStatus } from './types.js';

/** Maps a Stoke request's `model` string to the Quota provider that tracks its quota. */
export interface ModelProviderMapping {
  /** Case-insensitive substring match against the model name, e.g. "claude" -> Claude Code provider.
   *  Substring, not prefix: real model IDs don't always lead with the vendor keyword
   *  (e.g. "gpt-5-codex" for Codex). */
  prefix: string;
  provider: Provider;
}

export interface PreRequestBody {
  model: string;
  routing: string;
  messages?: unknown[];
  api_key?: string;
  metadata?: unknown;
}

export interface PreRequestResponse {
  model?: string;
  routing?: string;
  block?: string;
  metadata?: unknown;
}

export interface WebhookOptions {
  /** Reroute to this routing value when the matched provider is low on quota. Default: "auto-cheap". */
  fallbackRouting?: string;
  /** Refuse the request instead of rerouting when quota is exhausted. Default: false (reroute, don't block). */
  strict?: boolean;
}

function findMapping(model: string, mappings: ModelProviderMapping[]): ModelProviderMapping | null {
  const lower = model.toLowerCase();
  return mappings.find((m) => lower.includes(m.prefix.toLowerCase())) ?? null;
}

/**
 * Pure decision function: given the incoming request and the configured
 * model->provider mappings, decide what (if anything) to override.
 * Exported separately from the HTTP server so it can be unit tested without
 * sockets or timers.
 */
export async function decidePreRequest(
  body: PreRequestBody,
  mappings: ModelProviderMapping[],
  opts: WebhookOptions = {},
): Promise<PreRequestResponse> {
  const mapping = findMapping(body.model, mappings);
  if (!mapping) return {};

  let status: UsageStatus;
  try {
    status = await mapping.provider.fetchStatus();
  } catch {
    return {}; // fetch failure is not grounds to touch a live request
  }

  if (status.state !== 'limited') return {};

  if (opts.strict) {
    return { block: `quota: ${mapping.provider.name} subscription quota exhausted (${status.remainingLabel ?? 'none remaining'}, resets ${status.resetsInLabel ?? 'unknown'})` };
  }

  return { routing: opts.fallbackRouting ?? 'auto-cheap' };
}

export interface QuotaWebhookServer {
  close(): Promise<void>;
  port: number;
}

/** Starts the HTTP server Stoke's `[[plugins]] pre_request` webhook list points at. */
export function createServer(
  mappings: ModelProviderMapping[],
  opts: WebhookOptions & { port?: number } = {},
): Promise<QuotaWebhookServer> {
  const server = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"status":"ok"}');
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end('{"error":"not found"}');
      return;
    }

    let chunks = '';
    req.on('data', (c) => {
      chunks += c;
    });
    req.on('end', () => {
      (async () => {
        let body: PreRequestBody;
        try {
          body = JSON.parse(chunks || '{}');
        } catch {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end('{"error":"invalid json"}');
          return;
        }
        const result = await decidePreRequest(body, mappings, opts);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      })().catch((err) => {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      });
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(opts.port ?? 8790, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : (opts.port ?? 8790);
      resolve({
        port,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
