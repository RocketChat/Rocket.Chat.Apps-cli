const test = require('node:test');
const assert = require('node:assert/strict');

const { renderHelp, renderCommandHelp } = require('../lib/commands/help.js');
const { buildCommandIndex } = require('../lib/core/command-index.js');

test('renderHelp sorts commands and includes aliases', () => {
  const output = renderHelp([
    { name: 'watch', description: 'watch', usage: 'watch' },
    { name: 'create', aliases: ['c'], description: 'create', usage: 'create' },
  ]);

  assert.equal(output.includes('create'), true);
  assert.equal(output.includes('aliases: c'), true);
  assert.equal(output.indexOf('create') < output.indexOf('watch'), true);
});

test('renderCommandHelp includes details only when present', () => {
  const withDetails = renderCommandHelp({
    name: 'deploy',
    description: 'Deploy app',
    usage: 'rc-apps deploy',
    details: ['line 1', 'line 2'],
  });
  const withoutDetails = renderCommandHelp({
    name: 'env',
    description: 'Env help',
    usage: 'rc-apps env',
  });

  assert.equal(withDetails.includes('line 1'), true);
  assert.equal(withDetails.includes('line 2'), true);
  assert.equal(withoutDetails.includes('line 1'), false);
});

test('buildCommandIndex maps names and aliases', () => {
  const commandA = {
    name: 'deploy',
    aliases: ['d'],
    description: 'x',
    usage: 'x',
    run: async () => {},
  };
  const commandB = {
    name: 'package',
    description: 'x',
    usage: 'x',
    run: async () => {},
  };

  const index = buildCommandIndex([commandA, commandB]);
  assert.equal(index.get('deploy'), commandA);
  assert.equal(index.get('d'), commandA);
  assert.equal(index.get('package'), commandB);
});
