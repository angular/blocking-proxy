import * as nock from 'nock';

import {SimpleWebDriverClient} from '../../lib/simple_webdriver_client';

describe('Simple WebDriver Client', () => {
  let client: SimpleWebDriverClient;
  let seleniumAddress = 'http://fake-address.com:4444/wd/hub';
  const sessionId = 'abcde-fghij';
  const fakeScript = 'function fakeScript() {}';

  beforeEach(() => {
    client = new SimpleWebDriverClient(seleniumAddress);
  });

  it('can make executeAsync calls', async() => {
    let scope =
        nock(seleniumAddress).post(`/session/${sessionId}/execute_async`, fakeScript).reply(200, {
          state: 'success',
          value: ''
        });

    await client.executeAsync(sessionId, fakeScript);
    scope.done();
  });

  it('can make getRect calls', async() => {
    const elementId = '0';
    const fakeRect = {x: 10, y: 10, width: 20, height: 20};

    let scope =
        nock(seleniumAddress).get(`/session/${sessionId}/element/${elementId}/rect`).reply(200, {
          state: 'success',
          value: fakeRect
        });

    const rect = await client.getRect(sessionId, elementId);
    scope.done();
    expect(rect).toEqual(fakeRect);
  });
});
