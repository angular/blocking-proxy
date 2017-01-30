import * as http from 'http';
import * as url from 'url';

export class SimpleWebDriverClient {
  seleniumAddress: string;

  constructor(seleniumAddress: string) {
    this.seleniumAddress = seleniumAddress;
  }

  public executeAsync(sessionId: string, data: string) {
    const url = ['session', sessionId, 'execute_async'].join('/');
    return this.createSeleniumRequest('POST', url, data);
  }

  public getRect(sessionId: string, elementId: string) {
    const url = ['session', sessionId, 'element', elementId, 'rect'].join('/');
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