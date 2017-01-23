import * as http from 'http';
import * as url from 'url';

import {parseWebDriverCommand, WebDriverCommand} from './webdriver_commands';

/**
 * A proxy that understands WebDriver commands. Users can add barriers (similar to middleware in
 * express) that will be called before forwarding the request to WebDriver. The proxy will wait for
 * each barrier to finish, calling them in the order in which they were added.
 */
export class WebDriverProxy {
  barriers: WebDriverBarrier[];
  seleniumAddress: string;

  constructor(seleniumAddress: string) {
    this.barriers = [];
    this.seleniumAddress = seleniumAddress;
  }

  addBarrier(barrier: WebDriverBarrier) {
    this.barriers.push(barrier);
  }

  async handleRequest(originalRequest: http.IncomingMessage, response: http.ServerResponse) {
    let command = parseWebDriverCommand(originalRequest.url, originalRequest.method);

    let replyWithError = (err) => {
      response.writeHead(500);
      response.write(err.toString());
      response.end();
    };

    // Process barriers in order, one at a time.
    try {
      for (let barrier of this.barriers) {
        await barrier.onCommand(command);
      }
    } catch (err) {
      replyWithError(err);
      // Don't call through if a barrier fails.
      return;
    }

    let parsedUrl = url.parse(this.seleniumAddress);
    let options: http.RequestOptions = {};
    options.method = originalRequest.method;
    options.path = parsedUrl.path + originalRequest.url;
    options.hostname = parsedUrl.hostname;
    options.port = parseInt(parsedUrl.port);
    options.headers = originalRequest.headers;

    let forwardedRequest = http.request(options);

    // clang-format off
    let reqData = '';
    originalRequest.on('data', (d) => {
      reqData += d;
      forwardedRequest.write(d);
    }).on('end', () => {
      command.handleData(reqData);
      forwardedRequest.end();
    }).on('error', replyWithError);

    forwardedRequest.on('response', (seleniumResponse) => {
      response.writeHead(seleniumResponse.statusCode, seleniumResponse.headers);

      let respData = '';
      seleniumResponse.on('data', (d) => {
        respData += d;
        response.write(d);
      }).on('end', () => {
        command.handleResponse(seleniumResponse.statusCode, respData);
        response.end();
      }).on('error', replyWithError);

    }).on('error', replyWithError);
    // clang-format on
  }
}

/**
 * When the proxy receives a WebDriver command, it will call onCommand() for each of it's barriers.
 * Barriers may return a promise for the proxy to wait for before proceeding. If the promise is
 * rejected, the proxy will reply with an error code and the result of the promise and the command
 * will not be forwarded to Selenium.
 */
export interface WebDriverBarrier { onCommand(command: WebDriverCommand): Promise<void>; }
