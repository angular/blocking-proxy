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
  let port: number;

  beforeEach(async() => {
    mockServer = getMockSelenium();
    mockServer.start();
    let mockPort = mockServer.handle.address().port;

    proxy = new WebDriverProxy(`http://localhost:${mockPort}/wd/hub`);
    testBarrier = new TestBarrier;
    proxy.addBarrier(testBarrier);
    server = http.createServer(proxy.handleRequest.bind(proxy));
    server.listen(0);
    port = server.address().port;

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

    let recentCommands = testBarrier.getCommands();
    expect(recentCommands.length).toBe(3);
    expect(recentCommands).toEqual([
      CommandName.NewSession, CommandName.Go, CommandName.DeleteSession
    ]);
    expect(testBarrier.commands[1].sessionId).toEqual(sessionId);
  });

  it('parses url commands', async() => {
    await driver.getCurrentUrl();
    await driver.navigate().back();
    await driver.navigate().forward();
    await driver.navigate().refresh();
    await driver.getTitle();

    let recentCommands = testBarrier.getCommands();
    expect(recentCommands.length).toBe(7);
    expect(recentCommands).toEqual([
      CommandName.NewSession, CommandName.Go, CommandName.GetCurrentURL, CommandName.Back,
      CommandName.Forward, CommandName.Refresh, CommandName.GetTitle
    ]);
  });

  it('parses timeout commands', async() => {
    await driver.manage().timeouts().setScriptTimeout(2468);

    let recentCommands = testBarrier.getCommands();
    expect(recentCommands[2]).toEqual(CommandName.SetTimeouts);
    let timeoutData = testBarrier.commands[2].data;
    expect(timeoutData['ms']).toEqual(2468);
  });

  it('parses element commands', async() => {
    let el = driver.findElement(webdriver.By.css('.test'));
    await el.click();
    await el.getCssValue('fake-color');
    await el.getAttribute('fake-attr');
    await el.getTagName();
    await el.getText();
    await el.getSize();
    await el.clear();
    await el.sendKeys('test string');

    let inner = el.findElement(webdriver.By.css('.inner_thing'));
    await inner.click();

    await driver.findElements(webdriver.By.id('thing'));
    await el.findElements(webdriver.By.css('.inner_thing'));

    // let find = testBarrier.commands[2];
    expect(testBarrier.getCommands()).toEqual([
      CommandName.NewSession,
      CommandName.Go,
      CommandName.FindElement,
      CommandName.ElementClick,
      CommandName.GetElementCSSValue,
      CommandName.GetElementAttribute,
      CommandName.GetElementTagName,
      CommandName.GetElementText,
      CommandName.GetElementRect,
      CommandName.ElementClear,
      CommandName.ElementSendKeys,
      CommandName.FindElementFromElement,
      CommandName.ElementClick,
      CommandName.FindElements,
      CommandName.FindElementsFromElement,
    ]);
  });

  it('parses actions', async() => {
    let el = driver.findElement(webdriver.By.css('.test'));

    await driver.actions().mouseMove({x: 10, y: 10}).dragAndDrop(el, {x: 20, y: 20}).perform();

    expect(testBarrier.getCommands()).toEqual([
      CommandName.NewSession, CommandName.Go, CommandName.FindElement, CommandName.WireMoveTo,
      CommandName.WireMoveTo, CommandName.WireButtonDown, CommandName.WireMoveTo,
      CommandName.WireButtonUp
    ]);
    expect(testBarrier.commands[3].data).toEqual({xoffset: 10, yoffset: 10});
  });

  it('parses alert commands', async() => {
    await driver.switchTo().alert().dismiss();
    await driver.switchTo().alert().accept();

    expect(testBarrier.getCommands()).toEqual([
      CommandName.NewSession, CommandName.Go, CommandName.GetAlertText, CommandName.DismissAlert,
      CommandName.GetAlertText, CommandName.AcceptAlert
    ]);
  });

  it('saves url and method for unknown commands', (done) => {
    const fakeUrl = '/session/abcdef/unknown';
    let options:
        http.RequestOptions = {port: port, path: fakeUrl, hostname: 'localhost', method: 'GET'};

    let req = http.request(options);
    req.end();

    req.on('response', () => {
      let lastCommand = testBarrier.commands[2];
      expect(lastCommand.commandName).toBe(CommandName.UNKNOWN);
      expect(lastCommand.url).toEqual(fakeUrl);
      expect(lastCommand.method).toEqual('GET');
      done();
    });
    req.on('error', done.fail);
  });

  afterEach(() => {
    server.close();
    mockServer.stop();
  });
});
