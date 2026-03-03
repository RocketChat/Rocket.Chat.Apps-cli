const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const output = require('../lib/utils/output.js');
const { captureConsole, requireFresh } = require('./helpers.ts');

test('output helpers print formatted messages', () => {
  const { calls, restore } = captureConsole();

  try {
    output.step('step message');
    output.success('success message');
    output.warn('warn message');
    output.failure('failure message');
    output.info('info message');
    output.verbose(false, 'hidden');
    output.verbose(true, 'visible');
    output.heading('heading message');
  } finally {
    restore();
  }

  assert.equal(calls.log.some((line: string) => line.includes('step message')), true);
  assert.equal(calls.log.some((line: string) => line.includes('success message')), true);
  assert.equal(calls.warn.some((line: string) => line.includes('warn message')), true);
  assert.equal(calls.error.some((line: string) => line.includes('failure message')), true);
  assert.equal(calls.log.includes('info message'), true);
  assert.equal(calls.log.some((line: string) => line.includes('visible')), true);
  assert.equal(calls.log.some((line: string) => line.includes('hidden')), false);
  assert.equal(calls.log.some((line: string) => line.includes('heading message')), true);
});

test('output falls back to plain text when chalk is unavailable', () => {
  const originalLoad = Module._load as (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
  Module._load = function patchedLoad(
    this: unknown,
    request: string,
    parent: NodeModule | null,
    isMain: boolean,
  ): unknown {
    if (request === 'chalk') {
      throw new Error('missing chalk');
    }
    return originalLoad.call(this, request, parent, isMain);
  } as typeof Module._load;

  const plainOutput = requireFresh('../lib/utils/output.js');
  const { calls, restore } = captureConsole();

  try {
    plainOutput.step('plain step');
  } finally {
    restore();
    Module._load = originalLoad;
  }

  assert.equal(calls.log.some((line: string) => line.includes('[*] plain step')), true);
});
