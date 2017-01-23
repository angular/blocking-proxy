import {Server} from 'selenium-mock';
import * as webdriver from 'selenium-webdriver';
import * as stream from 'stream';

import {BlockingProxy} from '../../lib/blockingproxy';
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

  beforeAll(() => {
    mockServer = getMockSelenium();
    mockServer.start();
    let mockPort = mockServer.handle.address().port;

    proxy = new BlockingProxy(`http://localhost:${mockPort}/wd/hub`);
    bpPort = proxy.listen(0);
    logger.setLogDir('.');
    proxy.setLogger(logger);
  });

  beforeEach(async() => {
    driver = new webdriver.Builder()
                 .usingServer(`http://localhost:${bpPort}`)
                 .withCapabilities(capabilities)
                 .build();

    // Ensure WebDriver client has created a session by waiting on a command.
    await driver.get('http://example.com');
  });

  afterEach(() => {
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
    expect(log[0]).toContain('Getting new "chrome" session');
    expect(log[2]).toContain(`Deleting session ${shortSession}`);
  });

  it('logs url commands', async() => {
    await driver.getCurrentUrl();

    let log = logger.getLog();
    expect(log[1]).toContain('Navigating to http://example.com');
    expect(log[2]).toContain('Getting current URL');
  });

  it('logs the session ID', async() => {
    let session = await driver.getSession();
    let shortSession = session.getId().slice(0, 6);

    let log = logger.getLog();
    expect(log[1]).toContain(shortSession);
  });

  afterAll(() => {
    mockServer.stop();
  });
});
