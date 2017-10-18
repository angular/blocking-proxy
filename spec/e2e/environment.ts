import * as webdriver from 'selenium-webdriver';

import {BlockingProxy, BPClient} from '../../lib';

export const BP_PORT = 8111;
export const BP_URL = `http://localhost:${BP_PORT}`;
export const WD_URL = 'http://localhost:4444/wd/hub';

let driver: webdriver.WebDriver;
let bp: BlockingProxy;
let client: BPClient;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;

export function getTestEnv() {
  return {driver, bp, client};
}

beforeAll(async () => {
  bp = new BlockingProxy(WD_URL, 250);
  bp.listen(BP_PORT);

  let capabilities = webdriver.Capabilities.chrome();
  driver = new webdriver.Builder().usingServer(BP_URL).withCapabilities(capabilities).build();
  await driver.manage().timeouts().setScriptTimeout(12000);

  client = new BPClient(BP_URL);
});

afterAll((done) => {
  driver.quit().then(done, done.fail);
});
