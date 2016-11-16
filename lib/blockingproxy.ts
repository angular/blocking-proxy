import {Promise} from 'es6-promise';
import * as http from 'http';
import * as url from 'url';

var angularWaits = require('./angular/wait.js');

/**
 * The stability proxy is an http server responsible for intercepting
 * JSON webdriver commands. It keeps track of whether the page under test
 * needs to wait for page stability, and initiates a wait if so.
 */
export class BlockingProxy {
  seleniumAddress: string;

  // The ng-app root to use when waiting on the client.
  rootElement = '';
  ng12hybrid = false;
  stabilityEnabled: boolean;
  server: http.Server;

  constructor(seleniumAddress, rootElement?) {
    this.seleniumAddress = seleniumAddress;
    this.rootElement = rootElement || 'body';
    this.stabilityEnabled = true;
    this.server = http.createServer(this.requestListener.bind(this));
  }

  waitForAngularData() {
    return JSON.stringify({
      script: 'return (' + angularWaits.NG_WAIT_FN + ').apply(null, arguments);',
      args: [this.rootElement, this.ng12hybrid]
    });
  }

  /**
   * This command is for the proxy server, not to be forwarded to Selenium.
   */
  static isProxyCommand(commandPath: string) {
    return (commandPath.split('/')[1] === 'stabilize_proxy');
  }

  /**
   * Create the WebDriver protocol URL for the executeAsync command.
   *
   * @param {string} originalUrl The URL from the incoming command.
   */
  static executeAsyncUrl(originalUrl: string) {
    var parts = originalUrl.split('/');
    return [parts[0], parts[1], parts[2], 'execute_async'].join('/');
  }

  /**
   * Return true if the requested method should trigger a stabilize first.
   *
   * @param {string} commandPath Original request url.
   */
  shouldStabilize(commandPath) {
    if (!this.stabilityEnabled) {
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
    var parts = commandPath.split('/');
    if (parts.length < 4) {
      return false;
    }

    var commandsToWaitFor = [
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
    var parsedUrl = url.parse(this.seleniumAddress);
    var options = {};
    options['method'] = method;
    options['path'] = parsedUrl.path + messageUrl;
    options['hostname'] = parsedUrl.hostname;
    options['port'] = parsedUrl.port;

    var request = http.request(options, callback);

    return request;
  };

  handleProxyCommand(message, data, response) {
    console.log('Got message: ' + message.url);
    var command = message.url.split('/')[2];
    switch (command) {
      case 'enabled':
        if (message.method === 'GET') {
          response.writeHead(200);
          response.write(JSON.stringify({value: this.stabilityEnabled}));
          response.end();
        } else if (message.method === 'POST') {
          response.writeHead(200);
          this.stabilityEnabled = JSON.parse(data).value;
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

  sendRequestToStabilize(originalRequest) {
    var self = this;
    console.log('Waiting for stability...', originalRequest.url);
    var deferred = new Promise((resolve, reject) => {
      var stabilityRequest = self.createSeleniumRequest(
          'POST', BlockingProxy.executeAsyncUrl(originalRequest.url), function(stabilityResponse) {
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
              var value = JSON.parse(stabilityData).value;
              if (value) {
                // waitForAngular only returns a value if there was an error
                // in the browser.
                // TODO(heathkit): Extract more useful information from
                // webdriver errors.
                console.log(
                    'Error while waiting for page to stabilize: ', value['localizedMessage']);
                reject(value);
                return;
              }
              console.log('Stabilized');
              resolve();
            });
          });
      stabilityRequest.write(this.waitForAngularData());
      stabilityRequest.end();
    });

    return deferred;
  }

  requestListener(originalRequest: http.IncomingMessage, response: http.ServerResponse) {
    var self = this;
    var stabilized = Promise.resolve(null);

    if (BlockingProxy.isProxyCommand(originalRequest.url)) {
      let commandData = '';
      originalRequest.on('data', (d) => {
        commandData += d;
      });
      originalRequest.on('end', () => {
        self.handleProxyCommand(originalRequest, commandData, response);
      });
      return;
    }

    // If the command is not a proxy command, it's a regular webdriver command.
    console.log('Req: ' + originalRequest.url);

    if (self.shouldStabilize(originalRequest.url)) {
      stabilized = self.sendRequestToStabilize(originalRequest);
    }

    stabilized.then(
        () => {
          var seleniumRequest = self.createSeleniumRequest(
              originalRequest.method, originalRequest.url, function(seleniumResponse) {
                response.writeHead(seleniumResponse.statusCode, seleniumResponse.headers);
                seleniumResponse.pipe(response);
              });
          originalRequest.pipe(seleniumRequest);
        },
        (err) => {
          response.writeHead(500);
          response.write(err);
          response.end();
        });
  }

  listen(port: number) {
    console.log('Blocking proxy listening on port ' + port);
    this.server.listen(port);
  }

  quit() {
    return new Promise((resolve) => {
      this.server.close(resolve);
    });
  }
}
