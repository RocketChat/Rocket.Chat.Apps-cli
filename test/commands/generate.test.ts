import { test } from '@oclif/test';

describe('generate', () => {
    test
        .stdout()
        .command(['generate', '-o', 'a'])
        .exit(2)
        .it('runs generate with option "a" and correctly attempts to find app.json');
        
    test
        .stdout()
        .command(['generate', '-o', 'x'])
        .exit(2)
        .it('fails when passing an invalid option not in a,b,c');
});
