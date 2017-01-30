import * as http from 'http';

import {AngularWaitBarrier} from './angular_wait_barrier';
import {HighlightDelayBarrier} from './highlight_delay_barrier';
import {SimpleWebDriverClient} from './simple_webdriver_client';
import {WebDriverLogger} from './webdriver_logger';
import {WebDriverProxy} from './webdriver_proxy';

export const BP_PREFIX = 'bpproxy';

/**
 * The stability proxy is an http server responsible for intercepting
 * JSON webdriver commands. It keeps track of whether the page under test
 * needs to wait for page stability, and initiates a wait if so.
 */
export class BlockingProxy {
  server: http.Server;
  logger: WebDriverLogger;
  waitBarrier: AngularWaitBarrier;
  highlightBarrier: HighlightDelayBarrier;
  private proxy: WebDriverProxy;

  constructor(seleniumAddress: string, highlightDelay: number = null) {
    this.server = http.createServer(this.requestListener.bind(this));
    this.proxy = new WebDriverProxy(seleniumAddress);

    let client = new SimpleWebDriverClient(seleniumAddress);
    this.waitBarrier = new AngularWaitBarrier(client);
    this.highlightBarrier = new HighlightDelayBarrier(client, highlightDelay);
    this.proxy.addBarrier(this.waitBarrier);
    this.proxy.addBarrier(this.highlightBarrier);
  }

  /**
   * This command is for the proxy server, not to be forwarded to Selenium.
   */
  static isProxyCommand(commandPath: string) {
    return (commandPath.split('/')[1] === BP_PREFIX);
  }

  /**
   * Turn on WebDriver logging.
   *
   * @param logDir The directory to create logs in.
   */
  enableLogging(logDir: string) {
    this.waitBarrier.enableLogging(logDir);
  }

  /**
   * Override the logger instance. Only used for testing.
   */
  setLogger(logger: WebDriverLogger) {
    this.waitBarrier.setLogger(logger);
  }

  /**
   * Change the parameters used by the wait function.
   */
  setWaitParams(rootEl) {
    this.waitBarrier.setRootSelector(rootEl);
  }

  handleProxyCommand(message, data, response) {
    let command = message.url.split('/')[2];
    switch (command) {
      case 'waitEnabled':
        if (message.method === 'GET') {
          response.writeHead(200);
          response.write(JSON.stringify({value: this.waitBarrier.enabled}));
          response.end();
        } else if (message.method === 'POST') {
          response.writeHead(200);
          this.waitBarrier.enabled = JSON.parse(data).value;
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
          response.write(JSON.stringify({rootSelector: this.waitBarrier.rootSelector}));
          response.end();
        } else if (message.method === 'POST') {
          response.writeHead(200);
          this.waitBarrier.rootSelector = JSON.parse(data).rootSelector;
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
