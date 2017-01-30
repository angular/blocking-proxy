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

  it('can make getLocation calls', async() => {
    const elementId = '0';
    const fakeLoc = {x: 10, y: 10};

    let scope = nock(seleniumAddress)
                    .get(`/session/${sessionId}/element/${elementId}/location`)
                    .reply(200, {state: 'success', value: fakeLoc});

    const rect = await client.getLocation(sessionId, elementId);
    scope.done();
    expect(rect).toEqual(fakeLoc);
  });
});
