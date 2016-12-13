import {processArgs} from '../../lib/config';

describe('cli launcher', () => {
  it('should read selenium address from commandline', () => {
    let argv = processArgs(['--seleniumAddress', 'http://test.com']);
    expect(argv.seleniumAddress).toBe('http://test.com');
  });
});
