import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as rimraf from 'rimraf';
import * as webdriver from 'selenium-webdriver';

import {BlockingProxy} from '../../lib/blockingproxy';

import {BP_URL, getTestEnv} from './environment';

/*
Example log of a test session:

[12:51:30] Getting new "chrome" session
[12:51:33] [abcdef] [0.5s] Navigating to 'http://localhost/stuff'
[12:51:35] [abcdef] [0.3s] Wait for Angular
[12:51:36] [abcdef] [0.01s] Click on css '.test_element'
[12:51:36] [abcdef] Move mouse by (0,50)
[12:51:37] [abcdef] Click on binding 'thinger'
 */


describe('Logger', () => {
  let driver: webdriver.WebDriver;
  let bp: BlockingProxy;
  let logDir: string;

  function logPath() {
    let logName = bp.logger.logName;
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
    expect(logLines[1])
        .toContain(`[${sessionId1}] Navigating to http://localhost:8081/ng1/#/interaction`);
    expect(logLines[2])
        .toContain(`[${sessionId2}] Navigating to http://localhost:8081/ng1/#/async`);

    await otherDriver.quit();
  });
});
