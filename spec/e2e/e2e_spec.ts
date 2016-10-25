import * as webdriver from 'selenium-webdriver';
// Assumes that:
// - a blocking proxy is running at port 8111
// - a selenium standalone is running at port 4444
// - the test application is running at port 8081

var driver = new webdriver.Builder()
    .usingServer('http://localhost:8111')
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

describe('blocking proxy', function() {

  beforeAll(() => {
    driver.get('http://localhost:8081/ng1/index.html#/async');
  })

  afterAll(function(done) { driver.quit().then(done, done.fail); });

  it('should get a page with Angular and wait for a slow action',
     function(done) {
       driver.manage().timeouts().setScriptTimeout(20000);
       driver.findElement(webdriver.By.css('[ng-bind="slowHttpStatus"]'))
           .getText()
           .then(function(text) { expect(text).toEqual('not started'); });
       driver.findElement(webdriver.By.css('[ng-click="slowHttp()"]')).click();
       driver.findElement(webdriver.By.css('[ng-bind="slowHttpStatus"]'))
           .getText()
           .then(function(text) {
             expect(text).toEqual('done');
             done();
           })
           .thenCatch(done.fail);

     },
     10000);

  it('should fail when angular is not available', function(done) {
    driver.manage().timeouts().setScriptTimeout(20000);
    driver.get('about:blank');
    driver.executeScript('var x = 20')
        .then(
            function() {
              done.fail('expected driver.execute to fail, but it did not');
            },
            function(err) {
              expect(err).toMatch('angular could not be found on the window');
              done();
            });
  }, 10000);
});
