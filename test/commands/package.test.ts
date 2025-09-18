import {test} from '@oclif/test'

describe('package', function () {
  this.timeout(10000)

  test.stdout().command(['package']).exit(2).it('runs and fails')
})
