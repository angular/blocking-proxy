import * as http from 'http';
import {Server} from 'selenium-mock';
import * as webdriver from 'selenium-webdriver';

import {CommandName} from '../../lib/webdriver_commands';
import {WebDriverProxy} from '../../lib/webdriver_proxy';
import {getMockSelenium, Session} from '../helpers/mock_selenium';
import {TestBarrier} from './util';

describe('WebDriver command parser', () => {
  let mockServer: Server<Session>;
  let driver: webdriver.WebDriver;
  let proxy: WebDriverProxy;
  let server: http.Server;
  let testBarrier: TestBarrier;

  beforeEach(async() => {
    mockServer = getMockSelenium();
    mockServer.start();
    let mockPort = mockServer.handle.address().port;

    proxy = new WebDriverProxy(`http://localhost:${mockPort}/wd/hub`);
    testBarrier = new TestBarrier;
    proxy.addBarrier(testBarrier);
    server = http.createServer(proxy.handleRequest.bind(proxy));
    server.listen(0);
    let port = server.address().port;

    driver = new webdriver.Builder()
                 .usingServer(`http://localhost:${port}`)
                 .withCapabilities(webdriver.Capabilities.chrome())
                 .build();

    // Ensure WebDriver client has created a session by waiting on a command.
    await driver.get('http://example.com');
  });

  it('parses session commands', async() => {
    let session = await driver.getSession();
    let sessionId = session.getId();
    await driver.quit();

    let recentCommands = testBarrier.getCommandNames();
    expect(recentCommands.length).toBe(3);
    expect(recentCommands).toEqual([
      CommandName.NewSession, CommandName.Go, CommandName.DeleteSession
    ]);
    expect(testBarrier.commands[1].sessionId).toEqual(sessionId);
  });

  it('parses url commands', async() => {
    await driver.getCurrentUrl();

    let recentCommands = testBarrier.getCommandNames();
    expect(recentCommands.length).toBe(3);
    expect(recentCommands).toEqual([
      CommandName.NewSession, CommandName.Go, CommandName.GetCurrentURL
    ]);
  });

  afterEach(() => {
    server.close();
    mockServer.stop();
  });
});
