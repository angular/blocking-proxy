import * as http from 'http';
import * as url from 'url';

import {WebDriverCommand} from './webdriver_commands';
import {WebDriverLogger} from './webdriver_logger';
import {WebDriverBarrier, WebDriverProxy} from './webdriver_proxy';

let angularWaits = require('./angular/wait.js');
export const BP_PREFIX = 'bpproxy';

/**
 * The stability proxy is an http server responsible for intercepting
 * JSON webdriver commands. It keeps track of whether the page under test
 * needs to wait for page stability, and initiates a wait if so.
 */
export class BlockingProxy implements WebDriverBarrier {
  seleniumAddress: string;

  // The ng-app root to use when waiting on the client.
  rootSelector = '';
  waitEnabled: boolean;
  server: http.Server;
  logger: WebDriverLogger;
  private proxy: WebDriverProxy;

  constructor(seleniumAddress) {
    this.seleniumAddress = seleniumAddress;
    this.rootSelector = '';
    this.waitEnabled = true;
    this.server = http.createServer(this.requestListener.bind(this));
    this.proxy = new WebDriverProxy(seleniumAddress);
    this.proxy.addBarrier(this);
  }

  waitForAngularData() {
    return JSON.stringify({
      script: 'return (' + angularWaits.NG_WAIT_FN + ').apply(null, arguments);',
      args: [this.rootSelector]
    });
  }

  /**
   * This command is for the proxy server, not to be forwarded to Selenium.
   */
  static isProxyCommand(commandPath: string) {
    return (commandPath.split('/')[1] === BP_PREFIX);
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
   * Change the parameters used by the wait function.
   */
  setWaitParams(rootEl) {
    this.rootSelector = rootEl;
  }

  /**
   * Return true if the requested method should trigger a stabilize first.
   *
   * @param {string} commandPath Original request url.
   */
  shouldStabilize(commandPath) {
    if (!this.waitEnabled) {
      return false;
    }

    if (BlockingProxy.isProxyCommand(commandPath)) {
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
  createSeleniumRequest(method, messageUrl, callback) {
    let parsedUrl = url.parse(this.seleniumAddress);
    let options = {};
    options['method'] = method;
    options['path'] = parsedUrl.path + messageUrl;
    options['hostname'] = parsedUrl.hostname;
    options['port'] = parsedUrl.port;

    let request = http.request(options, callback);

    return request;
  };

  handleProxyCommand(message, data, response) {
    let command = message.url.split('/')[2];
    switch (command) {
      case 'waitEnabled':
        if (message.method === 'GET') {
          response.writeHead(200);
          response.write(JSON.stringify({value: this.waitEnabled}));
          response.end();
        } else if (message.method === 'POST') {
          response.writeHead(200);
          this.waitEnabled = JSON.parse(data).value;
          response.end();
        } else {
          response.writeHead(405);
          response.write('Invalid method');
          response.end();
        }
        break;
      case 'waitParams':
        if (message.method === 'GET') {
          response.writeHead(200);
          response.write(JSON.stringify({rootSelector: this.rootSelector}));
          response.end();
        } else if (message.method === 'POST') {
          response.writeHead(200);
          this.rootSelector = JSON.parse(data).rootSelector;
          response.end();
        } else {
          response.writeHead(405);
          response.write('Invalid method');
          response.end();
        }
        break;
      case 'selenium_address':
        if (message.method === 'GET') {
          response.writeHead(200);
          response.write(JSON.stringify({value: this.seleniumAddress}));
          response.end();
        } else if (message.method === 'POST') {
          response.writeHead(200);
          this.seleniumAddress = JSON.parse(data).value;
          response.end();
        } else {
          response.writeHead(405);
          response.write('Invalid method');
          response.end();
        }
        break;
      default:
        response.writeHead(404);
        response.write('Unknown stabilizer proxy command');
        response.end();
    }
  }

  sendRequestToStabilize(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let stabilityRequest = this.createSeleniumRequest(
          'POST', BlockingProxy.executeAsyncUrl(url), function(stabilityResponse) {
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

  requestListener(originalRequest: http.IncomingMessage, response: http.ServerResponse) {
    if (BlockingProxy.isProxyCommand(originalRequest.url)) {
      let commandData = '';
      originalRequest.on('data', (d) => {
        commandData += d;
      });
      originalRequest.on('end', () => {
        this.handleProxyCommand(originalRequest, commandData, response);
      });
      return;
    }

    // OK to ignore the promise returned by this.
    this.proxy.handleRequest(originalRequest, response);
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

  listen(port: number) {
    this.server.listen(port);
    let actualPort = this.server.address().port;
    return actualPort;
  }

  quit() {
    return new Promise((resolve) => {
      this.server.close(resolve);
    });
  }
}
