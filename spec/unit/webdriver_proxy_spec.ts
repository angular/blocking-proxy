import * as nock from 'nock';

import {WebDriverCommand} from '../../lib/webdriver_commands';
import {WebDriverProxy} from '../../lib/webdriver_proxy';

import {InMemoryReader, InMemoryWriter, TestBarrier} from './util';

describe('WebDriver Proxy', () => {
  let proxy: WebDriverProxy;

  beforeEach(() => {
    proxy = new WebDriverProxy('http://test_webdriver_url/wd/hub');
  });

  it('proxies to WebDriver', (done) => {
    let req = new InMemoryReader() as any;
    let resp = new InMemoryWriter() as any;
    resp.writeHead = jasmine.createSpy('spy');
    req.url = '/session/sessionId/get';
    req.method = 'GET';
    const responseData = {value: 'selenium response'};

    let scope = nock(proxy.seleniumAddress).get('/session/sessionId/get').reply(200, responseData);

    proxy.handleRequest(req, resp);

    resp.onEnd((data) => {
      // Verify that all nock endpoints were called.
      expect(resp.writeHead.calls.first().args[0]).toBe(200);
      expect(data).toEqual(JSON.stringify(responseData));
      scope.done();
      done();
    });
  });

  it('waits for barriers', (done) => {
    const WD_URL = '/session/sessionId/url';

    let req = new InMemoryReader() as any;
    let resp = new InMemoryWriter() as any;
    resp.writeHead = jasmine.createSpy('spy');
    req.url = WD_URL;
    req.method = 'POST';

    let barrier = new TestBarrier();
    let barrierDone = false;
    barrier.onCommand = (): Promise<void> => {
      return new Promise<void>((res) => {
        setTimeout(() => {
          barrierDone = true;
          res();
        }, 250);
      });
    };

    let scope = nock(proxy.seleniumAddress).post(WD_URL).reply(() => {
      // Shouldn't see the command until the barrier is done.
      expect(barrierDone).toBeTruthy();
      return [200];
    });

    proxy.addBarrier(barrier);
    proxy.handleRequest(req, resp);

    resp.onEnd(() => {
      expect(barrierDone).toBeTruthy();
      scope.done();
      done();
    });
  });

  it('waits for multiple barriers in order', (done) => {
    const WD_URL = '/session/sessionId/url';

    let req = new InMemoryReader() as any;
    let resp = new InMemoryWriter() as any;
    resp.writeHead = jasmine.createSpy('spy');
    req.url = WD_URL;
    req.method = 'POST';

    let barrier1 = new TestBarrier();
    let barrier1Done = false;
    barrier1.onCommand = (): Promise<void> => {
      return new Promise<void>((res) => {
        setTimeout(() => {
          expect(barrier2Done).toBeFalsy();
          barrier1Done = true;
          res();
        }, 150);
      });
    };
    let barrier2 = new TestBarrier();
    let barrier2Done = false;
    barrier2.onCommand = (): Promise<void> => {
      return new Promise<void>((res) => {
        setTimeout(() => {
          expect(barrier1Done).toBeTruthy();
          barrier2Done = true;
          res();
        }, 50);
      });
    };

    let scope = nock(proxy.seleniumAddress).post(WD_URL).reply(200);

    proxy.addBarrier(barrier1);
    proxy.addBarrier(barrier2);
    proxy.handleRequest(req, resp);

    resp.onEnd(() => {
      expect(barrier2Done).toBeTruthy();
      scope.done();
      done();
    });
  });

  it('returns an error if a barrier fails', (done) => {
    const WD_URL = '/session/sessionId/url';

    let req = new InMemoryReader() as any;
    let resp = new InMemoryWriter() as any;
    resp.writeHead = jasmine.createSpy('spy');
    req.url = WD_URL;
    req.method = 'GET';

    let barrier = new TestBarrier();
    barrier.onCommand = (): Promise<void> => {
      return new Promise<void>((res, rej) => {
        rej('Barrier failed');
      });
    };

    let scope = nock(proxy.seleniumAddress).get(WD_URL).reply(200);

    proxy.addBarrier(barrier);
    proxy.handleRequest(req, resp);

    resp.onEnd((respData) => {
      expect(resp.writeHead.calls.first().args[0]).toBe(500);
      expect(respData).toEqual('Barrier failed');

      // Should not call the selenium server.
      expect(scope.isDone()).toBeFalsy();
      nock.cleanAll();
      done();
    });
  });

  it('barriers get selenium responses', (done) => {
    const WD_URL = '/session/sessionId/url';
    const RESPONSE = {url: 'http://example.com'};

    let req = new InMemoryReader() as any;
    let resp = new InMemoryWriter() as any;
    resp.writeHead = jasmine.createSpy('spy');
    req.url = WD_URL;
    req.method = 'GET';

    let scope = nock(proxy.seleniumAddress).get(WD_URL).reply(200, RESPONSE);

    let barrier = new TestBarrier();
    barrier.onCommand = (command: WebDriverCommand): Promise<void> => {
      command.on('response', () => {
        expect(command.responseData['url']).toEqual(RESPONSE.url);
        scope.done();
        done();
      });
      return undefined;
    };
    proxy.addBarrier(barrier);
    proxy.handleRequest(req, resp);
  });

  it('propagates http errors', (done) => {
    const WD_URL = '/session/';
    const ERR = new Error('HTTP error');

    let req = new InMemoryReader() as any;
    let resp = new InMemoryWriter() as any;
    resp.writeHead = jasmine.createSpy('spy');
    req.url = WD_URL;
    req.method = 'POST';

    let scope = nock(proxy.seleniumAddress).post(WD_URL).replyWithError(ERR);

    proxy.handleRequest(req, resp);

    resp.onEnd((data) => {
      expect(resp.writeHead.calls.first().args[0]).toBe(500);
      expect(data).toEqual(ERR.toString());
      scope.done();
      done();
    });
  });
});
