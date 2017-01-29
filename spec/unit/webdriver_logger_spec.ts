import {Server} from 'selenium-mock';
import * as webdriver from 'selenium-webdriver';
import * as stream from 'stream';

import {BlockingProxy} from '../../lib/blockingproxy';
import {parseWebDriverCommand} from '../../lib/webdriver_commands';
import {WebDriverLogger} from '../../lib/webdriver_logger';
import {getMockSelenium, Session} from '../helpers/mock_selenium';

const capabilities = webdriver.Capabilities.chrome();

/**
 * For testing purposes, create a logger that logs to an in-memory buffer, instead of to disk.
 */
class InMemoryLogger extends WebDriverLogger {
  logs: string[];

  constructor() {
    super();
    this.logs = [];
  }

  public setLogDir(logDir: string) {
    let self = this;
    this.logStream = new stream.Writable({
      write(chunk, enc, next) {
        self.logs.push(chunk.toString());
        next();
      }
    });
  }

  public reset() {
    this.logs = [];
  }

  public getLog() {
    return this.logs;
  }
}

describe('WebDriver logger', () => {
  let mockServer: Server<Session>;
  let driver: webdriver.WebDriver;
  let logger = new InMemoryLogger();
  let proxy: BlockingProxy;
  let bpPort: number;
  let start = new Date('2017-01-26 22:05:34.000');

  beforeAll(() => {
    mockServer = getMockSelenium();
    mockServer.start();
    let mockPort = mockServer.handle.address().port;

    proxy = new BlockingProxy(`http://localhost:${mockPort}/wd/hub`);
    proxy.waitBarrier.enabled = false;
    bpPort = proxy.listen(0);
    logger.setLogDir('.');
    proxy.setLogger(logger);
  });

  afterAll(() => {
    mockServer.stop();
  });

  beforeEach(async() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(start);

    driver = new webdriver.Builder()
                 .usingServer(`http://localhost:${bpPort}`)
                 .withCapabilities(capabilities)
                 .build();

    // Ensure WebDriver client has created a session by waiting on a command.
    await driver.get('http://example.com');
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    logger.reset();
  });

  it('creates logfiles with unique names', () => {
    let otherLogger = new InMemoryLogger();

    expect(logger.logName).not.toEqual(otherLogger.logName);
  });

  it('logs session commands', async() => {
    let session = await driver.getSession();
    let shortSession = session.getId().slice(0, 6);
    await driver.quit();

    let log = logger.getLog();
    expect(log[0]).toContain('NewSession');
    expect(log[0]).toContain(shortSession);
    expect(log[3]).toContain('DeleteSession');
    expect(log[3]).toContain(shortSession);
  });

  it('logs url commands', async() => {
    await driver.getCurrentUrl();

    let log = logger.getLog();
    expect(log[0]).toContain('NewSession');
    expect(log[1]).toContain('chrome');
    expect(log[2]).toContain('Go http://example.com');
  });

  it('parses commands that affect elements', async() => {
    let session = await driver.getSession();
    let shortSession = session.getId().slice(0, 6);
    logger.reset();

    let el = driver.findElement(webdriver.By.css('.test'));
    await el.click();
    await el.clear();
    await el.sendKeys('test string');

    let inner = el.findElement(webdriver.By.css('.inner_thing'));
    await inner.click();

    await driver.findElements(webdriver.By.id('thing'));
    await el.findElements(webdriver.By.css('.inner_thing'));

    let log = logger.getLog();
    let expectedLog = [
      `22:05:34.000 |      0ms | ${shortSession} | FindElement\n`,
      `    Using css selector '.test'\n`,
      `    Elements: 0\n`,
      `22:05:34.000 |      0ms | ${shortSession} | ElementClick (0)\n`,
      `22:05:34.000 |      0ms | ${shortSession} | ElementClear (0)\n`,
      `22:05:34.000 |      0ms | ${shortSession} | ElementSendKeys (0)\n`,
      `    Send: test string\n`,
      `22:05:34.000 |      0ms | ${shortSession} | FindElementFromElement (0)\n`,
      `    Using css selector '.inner_thing'\n`,
      `    Elements: 0\n`,
      `22:05:34.000 |      0ms | ${shortSession} | ElementClick (0)\n`,
      `22:05:34.000 |      0ms | ${shortSession} | FindElements\n`,
      `    Using css selector '*[id=\"thing\"]'\n`,
      `    Elements: 0,1\n`,
      `22:05:34.000 |      0ms | ${shortSession} | FindElementsFromElement (0)\n`,
      `    Using css selector '.inner_thing'\n`,
      `    Elements: 0,1\n`,
    ];
    for (let line in expectedLog) {
      expect(log[line]).toEqual(expectedLog[line], `Expected line: ${line} to match`);
    }
  });

  it('parses commands that read elements', async() => {
    logger.reset();
    let session = await driver.getSession();
    let shortSession = session.getId().slice(0, 6);

    let el = driver.findElement(webdriver.By.css('.test'));
    await el.getCssValue('color');
    await el.getAttribute('id');
    await el.getTagName();
    await el.getText();
    await el.getSize();

    let log = logger.getLog();

    let expectedLog = [
      `22:05:34.000 |      0ms | ${shortSession} | FindElement\n`,
      `    Using css selector '.test'\n`,
      `    Elements: 0\n`,
      `22:05:34.000 |      0ms | ${shortSession} | GetElementCSSValue (0)\n`,
      `    white\n`,
      `22:05:34.000 |      0ms | ${shortSession} | GetElementAttribute (0)\n`,
      `    null\n`,
      `22:05:34.000 |      0ms | ${shortSession} | GetElementTagName (0)\n`,
      `    button\n`,
      `22:05:34.000 |      0ms | ${shortSession} | GetElementText (0)\n`,
      `    some text\n`,
      `22:05:34.000 |      0ms | ${shortSession} | GetElementRect (0)\n`,
      `    {"width":88,"hCode":88,"class":"org.openqa.selenium.Dimension","height":20}\n`,
    ];
    for (let line in expectedLog) {
      expect(log[line]).toEqual(expectedLog[line], `Expected line: ${line} to match`);
    }
  });

  it('logs response errors', () => {
    let cmd = parseWebDriverCommand('/session/abcdef/url', 'GET');

    logger.logWebDriverCommand(cmd);
    cmd.handleResponse(500, {'state': 'Selenium Error'});

    let log = logger.getLog();
    expect(log[4]).toContain('ERROR: Selenium Error');
  });

  it('shows how long commands take', async() => {
    let cmd = parseWebDriverCommand('/session/abcdef/url', 'GET');
    logger.logWebDriverCommand(cmd);

    let delay = new Promise((res) => setTimeout(() => {
                              cmd.handleResponse(200, {});
                              res();
                            }, 1234));

    jasmine.clock().tick(2000);
    await delay;

    let log = logger.getLog();
    expect(log[3]).toContain('22:05:34.000 |   1234ms | abcdef | GetCurrentURL');
  });

  it('handles unknown commands', async() => {
    let session = await driver.getSession();
    let shortSession = session.getId().slice(0, 6);

    let cmd = parseWebDriverCommand('/session/abcdef/not_a_command', 'GET');
    logger.logWebDriverCommand(cmd);
    cmd.handleResponse(200, {});

    let log = logger.getLog();
    let expectedLog = [
      `22:05:34.000 |      0ms | ${shortSession} | NewSession\n`, `    {"browserName":"chrome"}\n`,
      `22:05:34.000 |      0ms | ${shortSession} | Go http://example.com\n`,
      `22:05:34.000 |      0ms | /session/abcdef/not_a_command\n`
    ];
    for (let line in expectedLog) {
      expect(log[line]).toEqual(expectedLog[line], `Expected line: ${line} to match`);
    }
  });
});
