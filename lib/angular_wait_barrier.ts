import * as http from 'http';
import * as url from 'url';

import {WebDriverCommand} from './webdriver_commands';
import {WebDriverLogger} from './webdriver_logger';
import {WebDriverBarrier} from './webdriver_proxy';

let angularWaits = require('./angular/wait.js');

export class AngularWaitBarrer implements WebDriverBarrier {
  // The ng-app root to use when waiting on the client.
  rootSelector: string;
  enabled: boolean;
  seleniumAddress: string;
  logger: WebDriverLogger;

  constructor(seleniumAddress: string) {
    this.enabled = true;
    this.rootSelector = '';
    this.seleniumAddress = seleniumAddress;
  }

  /**
   * Create the WebDriver protocol URL for the executeAsync command.
   *
   * @param {string} originalUrl The URL from the incoming command.
   */
  static executeAsyncUrl(originalUrl: string) {
    let parts = originalUrl.split('/');
    return [parts[0], parts[1], parts[2], 'execute_async'].join('/');
  }

  setRootSelector(selector: string) {
    this.rootSelector = selector;
  }

  private waitForAngularData() {
    return JSON.stringify({
      script: 'return (' + angularWaits.NG_WAIT_FN + ').apply(null, arguments);',
      args: [this.rootSelector]
    });
  }

  /**
   * Turn on WebDriver logging.
   *
   * @param logDir The directory to create logs in.
   */
  enableLogging(logDir: string) {
    if (!this.logger) {
      this.logger = new WebDriverLogger();
    }
    this.logger.setLogDir(logDir);
  }

  /**
   * Override the logger instance. Only used for testing.
   */
  setLogger(logger: WebDriverLogger) {
    this.logger = logger;
  }

  /**
   * Creates a request to forward to the Selenium server. The request stream
   * will not be ended - the user will need to write any data and then call
   * `.end`.
   *
   * @param {string} method
   * @param {string} messageUrl
   * @param {function(http.IncomingMessage)} callback
   *
   * @return {http.ClientRequest}
   */
  private createSeleniumRequest(method, messageUrl, callback) {
    let parsedUrl = url.parse(this.seleniumAddress);
    let options = {};
    options['method'] = method;
    options['path'] = parsedUrl.path + messageUrl;
    options['hostname'] = parsedUrl.hostname;
    options['port'] = parsedUrl.port;

    let request = http.request(options, callback);

    return request;
  };

  private sendRequestToStabilize(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let stabilityRequest = this.createSeleniumRequest(
          'POST', AngularWaitBarrer.executeAsyncUrl(url), function(stabilityResponse) {
            // TODO - If the response is that angular is not available on the
            // page, should we just go ahead and continue?
            let stabilityData = '';
            stabilityResponse.on('data', (data) => {
              stabilityData += data;
            });

            stabilityResponse.on('error', (err) => {
              console.log(err);
              reject(err);
            });

            stabilityResponse.on('end', () => {
              let value = JSON.parse(stabilityData).value;
              if (value) {
                // waitForAngular only returns a value if there was an error
                // in the browser.
                // TODO(heathkit): Extract more useful information from
                // webdriver errors.
                console.log('Error while waiting for page to stabilize: ' + value);
                reject(value);
              }
              resolve();
            });
          });
      stabilityRequest.write(this.waitForAngularData());
      stabilityRequest.end();
    });
  }


  /**
   * Return true if the requested method should trigger a stabilize first.
   *
   * @param {string} commandPath Original request url.
   */
  private shouldStabilize(commandPath) {
    if (!this.enabled) {
      return false;
    }

    // TODO - should this implement some state, and be smart about whether
    // stabilization is necessary or not? Would that be as simple as GET/POST?
    // e.g. two gets in a row don't require a wait btwn.
    //
    // See https://code.google.com/p/selenium/wiki/JsonWireProtocol for
    // descriptions of the paths.
    // We shouldn't stabilize if we haven't loaded the page yet.
    let parts = commandPath.split('/');
    if (parts.length < 4) {
      return false;
    }

    let commandsToWaitFor = [
      'executeScript', 'screenshot', 'source', 'title', 'element', 'elements', 'execute', 'keys',
      'moveto', 'click', 'buttondown', 'buttonup', 'doubleclick', 'touch', 'get'
    ];

    if (commandsToWaitFor.indexOf(parts[3]) != -1) {
      return true;
    }
    return false;
  }

  onCommand(command: WebDriverCommand): Promise<void> {
    if (this.logger) {
      command.on('data', () => {
        this.logger.logWebDriverCommand(command);
      });
    }

    if (this.shouldStabilize(command.url)) {
      return this.sendRequestToStabilize(command.url);
    }
    return Promise.resolve(null);
  }
}