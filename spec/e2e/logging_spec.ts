import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as rimraf from 'rimraf';
import * as webdriver from 'selenium-webdriver';

import {BlockingProxy} from '../../lib/blockingproxy';

import {BP_URL, getTestEnv} from './environment';

/*
Example log of a test session

20:08:14.830 |    834ms | 37f13c | NewSession',
    {"browserName":"chrome"}',
20:08:15.674 |      4ms | 37f13c | SetTimeouts',
20:08:15.681 |    578ms | 37f13c | Go http://localhost:8081/ng1/#/interaction',
20:08:16.300 |    438ms | 37f13c | FindElement',
    Using css selector \'.none\'',
    ERROR: no such element'
 */


describe('Logger', () => {
  let driver: webdriver.WebDriver;
  let bp: BlockingProxy;
  let logDir: string;

  function logPath() {
    let logName = bp.waitBarrier.logger.logName;
    return path.join(logDir, logName);
  }

  function readLog(): Promise<string[]> {
    const rl = readline.createInterface({input: fs.createReadStream(logPath())});
    let lines = [];
    rl.on('line', (line) => {
      lines.push(line);
    });
    return new Promise((resolve) => {
      rl.on('close', () => {
        resolve(lines);
      });
    });
  }

  beforeEach(() => {
    ({driver, bp} = getTestEnv());
    logDir = fs.mkdtempSync('./tmp-');
    bp.waitBarrier.enabled = false;
    bp.enableLogging(logDir);
  });

  afterEach((done) => {
    rimraf(logDir, done);
  });

  it('creates a log file', async() => {
    await driver.get('http://localhost:8081/ng1/#/async');
    let session = await driver.getSession();

    expect(session).not.toBeNull();
    expect(fs.existsSync(logPath())).toBeTruthy();
  });

  it('logs multiple sessions to the same file', async() => {
    let capabilities = webdriver.Capabilities.chrome();
    let otherDriver =
        new webdriver.Builder().usingServer(BP_URL).withCapabilities(capabilities).build();

    await driver.get('http://localhost:8081/ng1/#/interaction');
    await otherDriver.get('http://localhost:8081/ng1/#/async');

    let session1 = await driver.getSession();
    let session2 = await otherDriver.getSession();
    expect(session1).not.toBeNull();
    expect(session2).not.toBeNull();

    let logLines = await readLog();
    let sessionId1 = session1.getId().slice(0, 6);
    let sessionId2 = session2.getId().slice(0, 6);
    expect(logLines[2]).toContain(`Go http://localhost:8081/ng1/#/interaction`);
    expect(logLines[2]).toContain(sessionId1);
    expect(logLines[3]).toContain(`Go http://localhost:8081/ng1/#/async`);
    expect(logLines[3]).toContain(sessionId2);

    await otherDriver.quit();
  });

  it('logs information about element finders', async() => {
    await driver.get('http://localhost:8081/ng1/#/interaction');
    let el = driver.findElement(webdriver.By.id('flux'));
    await el.click();

    await el.getCssValue('fake-color');
    await el.getAttribute('fake-attr');
    await el.getTagName();
    await el.getText();
    await el.getSize();

    let logLines = await readLog();
    let expectedLog = [
      'Go http://localhost:8081/ng1/#/interaction', 'FindElement',
      'Using css selector \'*[id="flux"]\'', 'Elements: 0', 'ElementClick (0)',
      'GetElementCSSValue (0)', 'GetElementAttribute (0)', '    null', 'GetElementTagName (0)',
      '    button', 'GetElementText (0)', '    Status: fluxing', 'GetElementRect (0)'
    ];
    for (let line in expectedLog) {
      expect(logLines[line]).toContain(expectedLog[line], `Expected line: ${line} to match`);
    }
  });

  it('handles selenium errors', async() => {
    await driver.get('http://localhost:8081/ng1/#/interaction');
    try {
      let el = driver.findElement(webdriver.By.css('.none'));
      await el.click();
    } catch (e) {
      // Nothing to do.
    }

    let logLines = await readLog();
    expect(logLines[3]).toContain('ERROR: no such element');
  });

  it('logs when waiting for Angular', async() => {
    bp.waitBarrier.enabled = true;

    await driver.get('http://localhost:8081/ng1/#/interaction');
    let el = driver.findElement(webdriver.By.id('flux'));
    await el.click();

    let logLines = await readLog();
    let expectedLog = [
      'Go http://localhost:8081/ng1/#/interaction', 'Waiting for Angular', 'FindElement',
      'Using css selector \'*[id="flux"]\'', 'Elements: 1', 'Waiting for Angular',
      'ElementClick (1)'
    ];
    for (let line in expectedLog) {
      expect(logLines[line]).toContain(expectedLog[line], `Expected line: ${line} to match`);
    }
  });
});
