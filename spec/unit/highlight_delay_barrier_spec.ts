import {HighlightDelayBarrier} from '../../lib/highlight_delay_barrier';
import {parseWebDriverCommand} from '../../lib/webdriver_commands';

describe('highlight delay barrier', () => {
  let highlight: HighlightDelayBarrier;
  let client: any;

  beforeEach(() => {
    client = jasmine.createSpyObj('client', ['getLocation', 'getSize', 'execute']);
    client.getLocation.and.returnValue(Promise.resolve({x: 10, y: 10}));
    client.getSize.and.returnValue(Promise.resolve({width: 20, height: 20}));
    client.execute.and.returnValue(Promise.resolve());

    highlight = new HighlightDelayBarrier(client, 0);
  });

  it('blocks for the set amount of time', async() => {
    highlight.delay = 200;
    let cmd = parseWebDriverCommand('/session/abcdef/element/0/click', 'POST');

    // TODO Figure out how to use Jasmine's clock here.
    let start = Date.now();
    await highlight.onCommand(cmd);
    let elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(200);
    expect(client.getLocation).toHaveBeenCalled();
    expect(client.getSize).toHaveBeenCalled();
    expect(client.execute).toHaveBeenCalled();
  });

  it('doesn\'t do anything if delay isn\'t set', async() => {
    highlight.delay = 0;
    let cmd = parseWebDriverCommand('/session/abcdef/element/0/click', 'POST');

    // TODO Figure out how to use Jasmine's clock here.
    let start = Date.now();
    await highlight.onCommand(cmd);
    let elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
    expect(client.getLocation).not.toHaveBeenCalled();
    expect(client.getSize).not.toHaveBeenCalled();
    expect(client.execute).not.toHaveBeenCalled();

  });
});
