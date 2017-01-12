import {Command, Server, Session as BasicSession} from 'selenium-mock';

export interface Session extends BasicSession { url: string; }

// Support for webdriver.WebDriver.prototype.get
let setUrl = new Command<Session>('POST', 'url', (session, params) => {
  session.url = params['url'];
});

// Support for webdriver.WebDriver.prototype.getCurrentUrl
let getUrl = new Command<Session>('GET', 'url', (session, params) => {
  return session.url;
});

export function getMockSelenium() {
  let server = new Server<Session>(0);
  server.addCommand(setUrl);
  server.addCommand(getUrl);
  return server;
}
