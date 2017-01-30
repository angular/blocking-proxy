import * as http from 'http';
import * as url from 'url';

/**
 * Super dumb and simple WebDriver client. Works with selenium standalone, may or may not work yet
 * directly with other drivers.
 */
export class SimpleWebDriverClient {
  seleniumAddress: string;

  constructor(seleniumAddress: string) {
    this.seleniumAddress = seleniumAddress;
  }

  /**
   * Send an execute script command.
   *
   * @param sessionId
   * @param data A JSON blob with the script and arguments to execute.
   */
  public execute(sessionId: string, data: string) {
    const url = ['session', sessionId, 'execute'].join('/');
    return this.createSeleniumRequest('POST', url, data);
  }

  /**
   * Send an execute async script command.
   *
   * @param sessionId
   * @param data A JSON blob with the script and arguments to execute.
   */
  public executeAsync(sessionId: string, data: string) {
    const url = ['session', sessionId, 'execute_async'].join('/');
    return this.createSeleniumRequest('POST', url, data);
  }

  /**
   * Get the location of an element.
   *
   * @param sessionId
   * @param elementId
   * @returns Promise<{}> A promise that resolves with the x and y coordinates of the element.
   */
  public getLocation(sessionId: string, elementId: string) {
    const url = ['session', sessionId, 'element', elementId, 'location'].join('/');
    return this.createSeleniumRequest('GET', url);
  }

  /**
   * Get the size of an element.
   *
   * @param sessionId
   * @param elementId
   * @returns Promise<{}> A promise that resolves with the height and width of the element.
   */
  public getSize(sessionId: string, elementId: string) {
    const url = ['session', sessionId, 'element', elementId, 'size'].join('/');
    return this.createSeleniumRequest('GET', url);
  }

  private createSeleniumRequest(method, messageUrl, data?) {
    let parsedUrl = url.parse(this.seleniumAddress);
    let options: http.RequestOptions = {};
    options['method'] = method;
    options['path'] = parsedUrl.path + '/' + messageUrl;
    options['hostname'] = parsedUrl.hostname;
    options['port'] = parseInt(parsedUrl.port);

    let request = http.request(options);

    return new Promise<void>((resolve, reject) => {
      if (data) {
        request.write(data);
      }
      request.end();

      request.on('response', (resp) => {
        let respData = '';
        resp.on('data', (d) => {
          respData += d;
        });
        resp.on('error', (err) => {
          reject(err);
        });
        resp.on('end', () => {
          let response = JSON.parse(respData);
          if (response.state !== 'success') {
            reject(response.value);
          }
          resolve(response.value);
        });
      });
    });
  };
}
