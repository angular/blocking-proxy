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
    expect(bp.waitEnabled).toBe(true);

    await client.setWaitEnabled(false);
    expect(bp.waitEnabled).toBe(false);
  });

  it('can get whether wait is enabled', async() => {
    bp.waitEnabled = true;
    expect(await client.isWaitEnabled()).toBeTruthy();
    bp.waitEnabled = false;
    expect(await client.isWaitEnabled()).toBeFalsy();
  });

  it('allows changing the root selector', async() => {
    bp.rootSelector = '';
    const newRoot = 'div#app';

    await client.setWaitParams(newRoot);
    expect(bp.rootSelector).toBe(newRoot);
  });
});
