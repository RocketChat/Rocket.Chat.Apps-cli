import { test } from '@oclif/test';

describe('package', () => {
    test
        .stdout()
        .command(['package'])
        .exit(2)
        .it('runs and fails');
});
