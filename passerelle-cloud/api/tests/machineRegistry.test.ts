// IMPORTANT: machineRegistry.ts captures MACHINES_DB_PATH at module load time
// (DB_PATH constant). We must point it at a unique tmp file BEFORE the registry
// module is imported, so that save() persists there and _reloadForTest() can
// simulate a restart from the same path. Static `import` statements are hoisted
// above imperative code, so we set the env var first then import dynamically.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP_DB = path.join(
  os.tmpdir(),
  `passerelle-registry-test-${process.pid}-${crypto.randomUUID()}.json`,
);
process.env.MACHINES_DB_PATH = TMP_DB;

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Dynamically import AFTER env is set so the module's DB_PATH picks up TMP_DB.
const { registerMachine, _reloadForTest } = await import(
  '../src/machineRegistry.js'
);
type RegisterResult = 'bound' | 'ok' | 'mismatch';

function resetRegistry() {
  // Drop any persisted state and reset the in-memory map from scratch.
  try {
    fs.unlinkSync(TMP_DB);
  } catch {
    /* not present yet */
  }
  _reloadForTest(TMP_DB);
}

beforeAll(() => {
  resetRegistry();
});

beforeEach(() => {
  resetRegistry();
});

afterAll(() => {
  try {
    fs.unlinkSync(TMP_DB);
  } catch {
    /* already gone */
  }
});

describe('machineRegistry.registerMachine', () => {
  it("returns 'bound' on the first call for a (machineId, secret) pair", () => {
    expect(registerMachine('m1', 's1')).toBe<RegisterResult>('bound');
  });

  it("returns 'ok' on a subsequent call with the SAME machineId and SAME secret", () => {
    expect(registerMachine('m1', 's1')).toBe<RegisterResult>('bound');
    expect(registerMachine('m1', 's1')).toBe<RegisterResult>('ok');
  });

  it("returns 'mismatch' when the machineId is known but the secret differs", () => {
    expect(registerMachine('m1', 's1')).toBe<RegisterResult>('bound');
    expect(registerMachine('m1', 's2')).toBe<RegisterResult>('mismatch');
  });

  it("returns 'bound' for a brand new machineId even if its secret equals another machine's secret", () => {
    // Binding is keyed by machineId, so reusing a secret across distinct
    // machineIds is fine.
    expect(registerMachine('m1', 's1')).toBe<RegisterResult>('bound');
    expect(registerMachine('m2', 's1')).toBe<RegisterResult>('bound');
    // Both pairs still verify afterwards.
    expect(registerMachine('m1', 's1')).toBe<RegisterResult>('ok');
    expect(registerMachine('m2', 's1')).toBe<RegisterResult>('ok');
  });

  it("returns 'mismatch' when machineId is empty", () => {
    expect(registerMachine('', 's1')).toBe<RegisterResult>('mismatch');
  });

  it("returns 'mismatch' when secret is empty", () => {
    expect(registerMachine('m1', '')).toBe<RegisterResult>('mismatch');
  });
});

describe('machineRegistry persistence across a simulated restart', () => {
  it('survives a reload from disk: a previously bound pair still verifies', () => {
    // Phase 1: a live gateway binds the pair (this persists to TMP_DB).
    expect(registerMachine('m1', 's1')).toBe<RegisterResult>('bound');

    // Phase 2: simulate a gateway restart — the in-memory map is dropped and
    // reloaded from the persisted file.
    _reloadForTest(TMP_DB);

    // Phase 3: the binding survived. The same secret is accepted, a different
    // one is still rejected — i.e. an attacker cannot reclaim 'm1' during the
    // reconnect window after a restart.
    expect(registerMachine('m1', 's1')).toBe<RegisterResult>('ok');
    expect(registerMachine('m1', 's2')).toBe<RegisterResult>('mismatch');
  });
});
