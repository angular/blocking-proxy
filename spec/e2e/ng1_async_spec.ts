import * as webdriver from 'selenium-webdriver';
import {getTestEnv} from './environment';

describe('ng1 synchronizing with slow pages', function() {
  let driver: webdriver.WebDriver;

  beforeAll(() => {
    ({driver} = getTestEnv());
  });

  beforeEach((done) => {
    driver.get('http://localhost:8081/ng1/#/async').then(done);
  });

  function expectText(selector, expectedText) {
    return driver.findElement(webdriver.By.css(selector)).getText().then((text) => {
      expect(text).toEqual(expectedText);
    });
  }

  function clickElement(selector) {
    return driver.findElement(webdriver.By.css(selector)).click();
  }

  it('waits for http calls', (done) => {
    expectText('[ng-bind="slowHttpStatus"]', 'not started');

    clickElement('[ng-click="slowHttp()"]');

    expectText('[ng-bind="slowHttpStatus"]', 'done').then(done).thenCatch(done.fail);
  }, 10000);

  it('waits for long javascript execution', (done) => {
    expectText('[ng-bind="slowFunctionStatus"]', 'not started');

    clickElement('[ng-click="slowFunction()"]');

    expectText('[ng-bind="slowFunctionStatus"]', 'done').then(done).thenCatch(done.fail);
  }, 10000);

  it('DOES NOT wait for timeout', (done) => {
    expectText('[ng-bind="slowTimeoutStatus"]', 'not started');

    clickElement('[ng-click="slowTimeout()"]');

    expectText('[ng-bind="slowTimeoutStatus"]', 'pending...').then(done).thenCatch(done.fail);
  }, 10000);

  it('waits for $timeout', (done) => {
    expectText('[ng-bind="slowAngularTimeoutStatus"]', 'not started');

    clickElement('[ng-click="slowAngularTimeout()"]');

    expectText('[ng-bind="slowAngularTimeoutStatus"]', 'done').then(done).thenCatch(done.fail);
  }, 10000);

  it('waits for $timeout then a promise', (done) => {
    expectText('[ng-bind="slowAngularTimeoutPromiseStatus"]', 'not started');

    clickElement('[ng-click="slowAngularTimeoutPromise()"]');

    expectText('[ng-bind="slowAngularTimeoutPromiseStatus"]', 'done')
        .then(done)
        .thenCatch(done.fail);
  }, 10000);

  it('waits for long http call then a promise', (done) => {
    expectText('[ng-bind="slowHttpPromiseStatus"]', 'not started');

    clickElement('[ng-click="slowHttpPromise()"]');

    expectText('[ng-bind="slowHttpPromiseStatus"]', 'done').then(done).thenCatch(done.fail);
  }, 10000);

  it('waits for slow routing changes', (done) => {
    expectText('[ng-bind="routingChangeStatus"]', 'not started');

    clickElement('[ng-click="routingChange()"]');

    driver.getPageSource()
        .then((source) => {
          expect(source).toMatch('polling mechanism')
          done();
        })
        .thenCatch(done.fail);
  }, 10000);

  it('waits for slow ng-include templates to load', (done) => {
    expectText('.included', 'fast template contents');

    clickElement('[ng-click="changeTemplateUrl()"]');

    expectText('.included', 'slow template contents').then(done).thenCatch(done.fail);
  }, 10000);
});
