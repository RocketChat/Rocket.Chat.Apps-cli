const test = require('node:test');
const assert = require('node:assert/strict');

const { slugify, toPascalCase } = require('../lib/utils/strings.js');

test('slugify normalizes names for app folders', () => {
  assert.equal(slugify(' My Awesome App! '), 'my-awesome-app');
});

test('toPascalCase creates valid class names', () => {
  assert.equal(toPascalCase('my app plugin'), 'MyAppPlugin');
  assert.equal(toPascalCase('123 app'), 'App123App');
});
