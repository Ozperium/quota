import test from 'node:test';
import assert from 'node:assert/strict';
import { decidePreRequest, type ModelProviderMapping } from '../src/webhook.js';
import type { Provider, UsageStatus } from '../src/types.js';

function fakeProvider(name: string, status: Partial<UsageStatus>): Provider {
  return {
    name,
    async fetchStatus(): Promise<UsageStatus> {
      return {
        provider: name,
        remainingFraction: null,
        remainingLabel: null,
        resetsAt: null,
        resetsInLabel: null,
        state: 'unknown',
        ...status,
      };
    },
  };
}

test('no mapping matches the model -> passthrough, no override', async () => {
  const mappings: ModelProviderMapping[] = [
    { prefix: 'claude', provider: fakeProvider('Claude Code', { state: 'limited' }) },
  ];
  const result = await decidePreRequest({ model: 'gpt-5-codex', routing: 'single' }, mappings);
  assert.deepEqual(result, {});
});

test('matched provider ok -> passthrough, no override', async () => {
  const mappings: ModelProviderMapping[] = [
    { prefix: 'claude', provider: fakeProvider('Claude Code', { state: 'ok', remainingFraction: 0.8 }) },
  ];
  const result = await decidePreRequest({ model: 'claude-opus-4-8', routing: 'single' }, mappings);
  assert.deepEqual(result, {});
});

test('matched provider limited -> reroutes to auto-cheap by default', async () => {
  const mappings: ModelProviderMapping[] = [
    { prefix: 'claude', provider: fakeProvider('Claude Code', { state: 'limited', remainingFraction: 0.02 }) },
  ];
  const result = await decidePreRequest({ model: 'claude-opus-4-8', routing: 'single' }, mappings);
  assert.deepEqual(result, { routing: 'auto-cheap' });
});

test('matched provider limited -> honors a configured fallback routing', async () => {
  const mappings: ModelProviderMapping[] = [
    { prefix: 'claude', provider: fakeProvider('Claude Code', { state: 'limited' }) },
  ];
  const result = await decidePreRequest(
    { model: 'claude-opus-4-8', routing: 'single' },
    mappings,
    { fallbackRouting: 'auto-fast' },
  );
  assert.deepEqual(result, { routing: 'auto-fast' });
});

test('strict mode blocks instead of rerouting when quota is exhausted', async () => {
  const mappings: ModelProviderMapping[] = [
    { prefix: 'codex', provider: fakeProvider('Codex', { state: 'limited', remainingLabel: '0 of 40 requests', resetsInLabel: 'in 4h' }) },
  ];
  const result = await decidePreRequest({ model: 'gpt-5-codex', routing: 'single' }, mappings, { strict: true });
  assert.equal(result.block?.includes('Codex'), true);
  assert.equal(result.routing, undefined);
});

test('prefix match is case-insensitive', async () => {
  const mappings: ModelProviderMapping[] = [
    { prefix: 'Claude', provider: fakeProvider('Claude Code', { state: 'limited' }) },
  ];
  const result = await decidePreRequest({ model: 'CLAUDE-OPUS-4-8', routing: 'single' }, mappings);
  assert.deepEqual(result, { routing: 'auto-cheap' });
});

test('a provider whose fetchStatus rejects is treated as passthrough, not a crash', async () => {
  const mappings: ModelProviderMapping[] = [
    {
      prefix: 'claude',
      provider: {
        name: 'Claude Code',
        async fetchStatus(): Promise<UsageStatus> {
          throw new Error('boom');
        },
      },
    },
  ];
  const result = await decidePreRequest({ model: 'claude-opus-4-8', routing: 'single' }, mappings);
  assert.deepEqual(result, {});
});
