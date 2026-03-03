const test = require('node:test');
const assert = require('node:assert/strict');

const { slugify, toManifestSlug, toPascalCase } = require('../lib/utils/strings.js');

test('slugify normalizes names for app folders', () => {
  assert.equal(slugify(' My Awesome App! '), 'my-awesome-app');
});

test('toManifestSlug removes unsupported characters for app.json nameSlug', () => {
  assert.equal(toManifestSlug(' My App 2.0 '), 'my-app');
});

test('toPascalCase creates valid class names', () => {
  assert.equal(toPascalCase('my app plugin'), 'MyAppPlugin');
  assert.equal(toPascalCase('123 app'), 'App123App');
  assert.equal(toPascalCase('DemoEndpoint'), 'DemoEndpoint');
  assert.equal(toPascalCase('!!!'), 'RocketChat');
});
