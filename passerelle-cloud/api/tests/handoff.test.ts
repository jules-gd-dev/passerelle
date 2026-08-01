import { describe, expect, it } from 'vitest';
import type WebSocket from 'ws';
import { stageHandoff } from '../src/handoff.js';

function mockWs(open: boolean, captures: string[]) {
  return {
    readyState: open ? 1 : 3, // OPEN vs CLOSED
    send: (data: string) => captures.push(data),
  } as unknown as WebSocket;
}

describe('stageHandoff (C2 one-time code)', () => {
  it('pushes a code->token binding over the WS and returns the code', () => {
    const sent: string[] = [];
    const code = stageHandoff(mockWs(true, sent), 'the-real-token') as string;
    expect(code).toBeTypeOf('string');
    expect(code.length).toBeGreaterThanOrEqual(16);
    expect(sent).toHaveLength(1);
    const msg = JSON.parse(sent[0]);
    expect(msg.action).toBe('handoff');
    expect(msg.code).toBe(code);
    // The long-lived token is pushed over the trusted WS (not in any URL).
    expect(msg.token).toBe('the-real-token');
    expect(msg.expiresIn).toBeTypeOf('number');
    // The returned code must be opaque — it must NOT be the token itself.
    expect(code).not.toBe('the-real-token');
  });

  it('returns null when the daemon WS is not open (no unusable code is emitted)', () => {
    const sent: string[] = [];
    const code = stageHandoff(mockWs(false, sent), 'the-real-token');
    expect(code).toBeNull();
    expect(sent).toHaveLength(0);
  });
});
