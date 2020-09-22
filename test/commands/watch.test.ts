import {test } from '@oclif/test';

describe('watch', () => {
    test
        .stdout()
        .command(['watch'])
        .exit(2)
        .it('runs and fails');
});
