import {BlockingProxy} from '../../lib/blockingproxy';

describe('BlockingProxy', () => {
  it('should wait for angular by default', () => {
    let proxy = new BlockingProxy('http://locahost:4444');
    expect(proxy.waitBarrier.enabled).toBe(true);
  });
});
