import * as webdriver from 'selenium-webdriver';

import {BlockingProxy} from '../../lib/blockingproxy';

import {getTestEnv} from './environment';

const By = webdriver.By;

describe('disabling waiting as needed', function() {
  let driver: webdriver.WebDriver;
  let bp: BlockingProxy;

  beforeAll(() => {
    ({driver, bp} = getTestEnv());
  });

  beforeEach(async() => {
    await driver.get('http://localhost:8081/ng1/#/polling');
  });

  it('avoids timeouts', async() => {
    bp.waitEnabled = true;

    let startButton = await driver.findElement(By.id('pollstarter'));

    let count = await driver.findElement(By.id('count'));
    expect(await count.getText()).toEqual('0');

    await startButton.click();

    bp.waitEnabled = false;

    expect(await count.getText()).toBeGreaterThan(-1);

    await driver.sleep(2000);

    expect(await count.getText()).toBeGreaterThan(1);
  });
});
