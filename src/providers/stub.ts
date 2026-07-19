// Stub provider for tools we haven't integrated yet. Lets the UI show
// "connect Cursor / Grok" affordances without crashing.

import type { Provider, UsageStatus } from '../types.js';

export class StubProvider implements Provider {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  async fetchStatus(): Promise<UsageStatus> {
    return {
      provider: this.name,
      remainingFraction: null,
      remainingLabel: null,
      resetsAt: null,
      resetsInLabel: null,
      state: 'unknown',
      error: 'not connected',
    };
  }
}