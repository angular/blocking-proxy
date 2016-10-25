import {BPClient, BlockingProxy} from '../../lib/';

describe('BlockingProxy Client', () => {
  let bp: BlockingProxy;
  let client: BPClient;

  // TODO dynamically find an open port
  const BP_PORT = 4111;

  beforeEach(() => {
    bp = new BlockingProxy('http://localhost:3111');
    bp.listen(BP_PORT);
    client = new BPClient(`http://localhost:${BP_PORT}`);
  });

  it('should set synchronization', (done) => {
    expect(bp.stabilityEnabled).toBe(true);

    client.setSynchronization(false).then(() => {
      expect(bp.stabilityEnabled).toBe(false);
      done();
    });
  });
});