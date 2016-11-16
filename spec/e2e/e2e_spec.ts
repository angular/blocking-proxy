import {getTestEnv} from './environment';

describe('blocking proxy', function() {
  let driver: webdriver.WebDriver;

  beforeAll(() => {
    ({driver} = getTestEnv());
  });

  it('should fail when angular is not available', function(done) {
    driver.manage().timeouts().setScriptTimeout(20000);
    driver.get('about:blank');
    driver.executeScript('var x = 20')
        .then(
            function() {
              done.fail('expected driver.execute to fail, but it did not');
            },
            function(err) {
              expect(err).toMatch('window.angular is undefined');
              done();
            });
  }, 10000);
});
