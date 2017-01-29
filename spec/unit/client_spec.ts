import {BlockingProxy, BPClient} from '../../lib/';

describe('BlockingProxy Client', () => {
  let bp: BlockingProxy;
  let client: BPClient;

  beforeAll(() => {
    bp = new BlockingProxy('http://localhost:3111');
    let bpPort = bp.listen(0);
    client = new BPClient(`http://localhost:${bpPort}`);
  });

  it('should toggle waiting', async() => {
    expect(bp.waitBarrier.enabled).toBe(true);

    await client.setWaitEnabled(false);
    expect(bp.waitBarrier.enabled).toBe(false);
  });

  it('can get whether wait is enabled', async() => {
    bp.waitBarrier.enabled = true;
    expect(await client.isWaitEnabled()).toBeTruthy();
    bp.waitBarrier.enabled = false;
    expect(await client.isWaitEnabled()).toBeFalsy();
  });

  it('allows changing the root selector', async() => {
    bp.waitBarrier.rootSelector = '';
    const newRoot = 'div#app';

    await client.setWaitParams(newRoot);
    expect(bp.waitBarrier.rootSelector).toBe(newRoot);
  });
});
