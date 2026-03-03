const test = require('node:test');
const assert = require('node:assert/strict');
const readline = require('node:readline');

const { patch } = require('./helpers.ts');
const { prompt } = require('../lib/utils/prompt.js');

test('prompt uses trimmed answer and falls back to default', async () => {
  const answers = ['   answer   ', '   '];
  const questions: string[] = [];
  let closeCount = 0;

  const restore = patch(readline, 'createInterface', () => ({
    question(message: string, callback: (answer: string) => void) {
      questions.push(message);
      callback(answers.shift() ?? '');
    },
    close() {
      closeCount += 1;
    },
  }));

  try {
    const first = await prompt('Question');
    const second = await prompt('Question', 'fallback');

    assert.equal(first, 'answer');
    assert.equal(second, 'fallback');
    assert.equal(questions[0], 'Question: ');
    assert.equal(questions[1], 'Question (fallback): ');
    assert.equal(closeCount, 2);
  } finally {
    restore();
  }
});
