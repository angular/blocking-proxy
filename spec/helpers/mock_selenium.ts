import {Command, Server, Session as BasicSession} from 'selenium-mock';

export interface Session extends BasicSession { url: string; }

// Set Timeout
let setTimeouts = new Command<Session>('POST', 'timeouts', (session, params) => {});

// Go
let setUrl = new Command<Session>('POST', 'url', (session, params) => {
  session.url = params['url'];
});

// Get Current URL
let getUrl = new Command<Session>('GET', 'url', (session, params) => {
  return session.url;
});

// Back
let forward = new Command<Session>('POST', 'back', (session, params) => {});

// Back
let back = new Command<Session>('POST', 'forward', (session, params) => {});

// refresh
let refresh = new Command<Session>('POST', 'refresh', (session, params) => {});

// refresh
let title = new Command<Session>('GET', 'title', (session, params) => {});

// GetWindowHandle
let getWindowHandle = new Command<Session>('GET', 'window_handle', (session, params) => {
  return 'main';
});

// Find Element
let findElement = new Command<Session>('POST', 'element', (session, params) => {
  return {'ELEMENT': '0'};
});

// Find Elements
let findElements = new Command<Session>('POST', 'elements', (session, params) => {
  return [{'ELEMENT': '0'}];
});

// Find Element From Element
let findElementFromElement =
    new Command<Session>('POST', 'element/:elementId/element', (session, params) => {
      return {'ELEMENT': '0'};
    });

// Find Elements From Element
let findElementsFromElement =
    new Command<Session>('POST', 'element/:elementId/elements', (session, params) => {
      return [{'ELEMENT': '0'}];
    });

// Is Element Selected
let isElementSelected =
    new Command<Session>('POST', 'element/:elementId/selected', (session, params) => {});

// Get Element Attribute
let getElementAttribute = new Command<Session>(
    'GET', 'element/:elementId/attribute/:attributeName', (session, params) => {});

// Get Element Property
let getElementProperty = new Command<Session>(
    'GET', 'element/:elementId/property/:propertyName', (session, params) => {});

// Get Element CSS Value
let getElementCSSValue =
    new Command<Session>('GET', 'element/:elementId/css/:cssPropertyName', (session, params) => {});

// Get Element Text
let getElementText =
    new Command<Session>('GET', 'element/:elementId/text', (session, params) => {});

// Get Element Tag Name
let getElementTagName =
    new Command<Session>('GET', 'element/:elementId/name', (session, params) => {});

// Get Element Rect
let getElementRect =
    new Command<Session>('GET', 'element/:elementId/rect', (session, params) => {});

// Get Element Rect from JSON Wire protocol (not W3C spec)
let getElementRectWire =
    new Command<Session>('GET', 'element/:elementId/size', (session, params) => {});

// Is Element Enabled
let isElementEnabled =
    new Command<Session>('GET', 'element/:elementId/enabled', (session, params) => {});

// Element Click
let elementClick =
    new Command<Session>('POST', 'element/:elementId/click', (session, params) => {});

// Element Clear
let elementClear =
    new Command<Session>('POST', 'element/:elementId/clear', (session, params) => {});

// Element Send Keys
let elementSendKeys =
    new Command<Session>('POST', 'element/:elementId/value', (session, params) => {});

// Get Alert Text
let alertText = new Command<Session>('GET', 'alert_text', (session, params) => {});

// Accept Alert
let acceptAlert = new Command<Session>('POST', 'accept_alert', (session, params) => {});

// Dismiss Alert
let dismissAlert = new Command<Session>('POST', 'dismiss_alert', (session, params) => {});

// Actions
let moveTo = new Command<Session>('POST', 'moveto', (session, params) => {});

// Button Down
let buttonDown = new Command<Session>('POST', 'buttondown', (session, params) => {});

// Button Up
let buttonUp = new Command<Session>('POST', 'buttonup', (session, params) => {});

export function getMockSelenium() {
  let server = new Server<Session>(0);
  server.addCommand(setTimeouts);
  server.addCommand(setUrl);
  server.addCommand(getUrl);
  server.addCommand(back);
  server.addCommand(forward);
  server.addCommand(refresh);
  server.addCommand(title);
  server.addCommand(getWindowHandle);
  server.addCommand(findElement);
  server.addCommand(findElements);
  server.addCommand(findElementFromElement);
  server.addCommand(findElementsFromElement);
  server.addCommand(isElementSelected);
  server.addCommand(getElementAttribute);
  server.addCommand(getElementProperty);
  server.addCommand(getElementCSSValue);
  server.addCommand(getElementText);
  server.addCommand(getElementTagName);
  server.addCommand(getElementRect);
  server.addCommand(getElementRectWire);
  server.addCommand(isElementEnabled);
  server.addCommand(elementClick);
  server.addCommand(elementClear);
  server.addCommand(elementSendKeys);
  server.addCommand(alertText);
  server.addCommand(acceptAlert);
  server.addCommand(dismissAlert);
  server.addCommand(moveTo);
  server.addCommand(buttonDown);
  server.addCommand(buttonUp);
  return server;
}
