import {BlockingProxy} from '../../lib/blockingproxy'

describe('BlockingProxy', () => {
  it('should be able to be created',
     () => {
       let proxy = new BlockingProxy(8111);
       expect(proxy.stabilityEnabled).toBe(true);
     });
});
