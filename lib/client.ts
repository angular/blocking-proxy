import * as http from 'http';
import * as url from 'url';
import {BP_PREFIX} from './blockingproxy';

export class BPClient {
  hostname: string;
  port: number;

  constructor(bpUrlValue: string) {
    let bpUrl = url.parse(bpUrlValue);
    this.hostname = bpUrl.hostname;
    this.port = parseInt(bpUrl.port);
  }

  /**
   * Toggle whether waiting for Angular is enabled.
   *
   * @param enabled Whether or not to enable waiting for angular.
   * @returns {Promise<T>}
   */
  setWaitEnabled(enabled: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      let options =
          {host: this.hostname, port: this.port, method: 'POST', path: `/${BP_PREFIX}/waitEnabled`};

      let request = http.request(options, (response) => {
        response.on('data', () => {});
        response.on('error', (err) => reject(err));
        response.on('end', () => {
          resolve();
        });
      });
      request.write(JSON.stringify({value: enabled}));
      request.end();
    });
  }

  /**
   * A CSS Selector for a DOM element within your Angular application.
   * BlockingProxy will attempt to automatically find your application, but it is
   * necessary to set rootElement in certain cases.
   *
   * In Angular 1, BlockingProxy will use the element your app bootstrapped to by
   * default.  If that doesn't work, it will then search for hooks in `body` or
   * `ng-app` elements (details here: https://git.io/v1b2r).
   *
   * In later versions of Angular, BlockingProxy will try to hook into all angular
   * apps on the page. Use rootElement to limit the scope of which apps
   * BlockingProxy waits for and searches within.
   *
   * @param rootSelector A selector for the root element of the Angular app.
   */
  setWaitParams(rootSelector: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let options =
          {host: this.hostname, port: this.port, method: 'POST', path: `/${BP_PREFIX}/waitParams`};

      let request = http.request(options, (response) => {
        response.on('data', () => {});
        response.on('error', (err) => reject(err));
        response.on('end', () => {
          resolve();
        });
      });
      request.write(JSON.stringify({rootSelector: rootSelector}));
      request.end();
    });
  }

  isWaitEnabled() {
    return new Promise((res) => {
      let options = {host: this.hostname, port: this.port, path: `/${BP_PREFIX}/waitEnabled`};

      http.get(options, (response) => {
        let body = '';
        response.on('data', (data) => {
          body += data;
        });
        response.on('end', () => {
          res(JSON.parse(body).value);
        });
      });
    });
  }
}