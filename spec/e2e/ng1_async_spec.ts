import * as webdriver from 'selenium-webdriver';
import {getTestEnv} from './environment';

describe('ng1 synchronizing with slow pages', () => {
  let driver: webdriver.WebDriver;

  beforeAll(() => {
    ({driver} = getTestEnv());
  });

  beforeEach((done) => {
    driver.get('http://localhost:8081/ng1/#/async').then(done);
  });

  async function expectText(selector, expectedText) {
    let text = await driver.findElement(webdriver.By.css(selector)).getText();
    expect(text).toEqual(expectedText);
  }

  async function clickElement(selector) {
    let el = await driver.findElement(webdriver.By.css(selector));
    await el.click();
  }

  it('waits for http calls', async() => {
    await expectText('[ng-bind="slowHttpStatus"]', 'not started');

    await clickElement('[ng-click="slowHttp()"]');

    await expectText('[ng-bind="slowHttpStatus"]', 'done');
  }, 10000);

  it('waits for long javascript execution', async() => {
    await expectText('[ng-bind="slowFunctionStatus"]', 'not started');

    await clickElement('[ng-click="slowFunction()"]');

    await expectText('[ng-bind="slowFunctionStatus"]', 'done');
  }, 10000);

  it('DOES NOT wait for timeout', async() => {
    await expectText('[ng-bind="slowTimeoutStatus"]', 'not started');

    await clickElement('[ng-click="slowTimeout()"]');

    await expectText('[ng-bind="slowTimeoutStatus"]', 'pending...');
  }, 10000);

  it('waits for $timeout', async() => {
    await expectText('[ng-bind="slowAngularTimeoutStatus"]', 'not started');

    await clickElement('[ng-click="slowAngularTimeout()"]');

    await expectText('[ng-bind="slowAngularTimeoutStatus"]', 'done');
  }, 10000);

  it('waits for $timeout then a promise', async() => {
    await expectText('[ng-bind="slowAngularTimeoutPromiseStatus"]', 'not started');

    await clickElement('[ng-click="slowAngularTimeoutPromise()"]');

    await expectText('[ng-bind="slowAngularTimeoutPromiseStatus"]', 'done');
  }, 10000);

  it('waits for long http call then a promise', async() => {
    await expectText('[ng-bind="slowHttpPromiseStatus"]', 'not started');

    await clickElement('[ng-click="slowHttpPromise()"]');

    await expectText('[ng-bind="slowHttpPromiseStatus"]', 'done');
  }, 10000);

  it('waits for slow routing changes', async() => {
    await expectText('[ng-bind="routingChangeStatus"]', 'not started');

    await clickElement('[ng-click="routingChange()"]');

    let source = await driver.getPageSource();
    expect(source).toMatch('polling mechanism');
  }, 10000);

  it('waits for slow ng-include templates to load', async() => {
    await expectText('.included', 'fast template contents');

    await clickElement('[ng-click="changeTemplateUrl()"]');

    await expectText('.included', 'slow template contents');
  }, 10000);
});
