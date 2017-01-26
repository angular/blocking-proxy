/**
 * Utilities for parsing WebDriver commands from HTTP Requests.
 */
import * as events from 'events';

type HttpMethod = 'GET'|'POST'|'DELETE';
export type paramKey = 'sessionId' | 'elementId' | 'name' | 'propertyName';

export enum CommandName {
  NewSession,
  DeleteSession,
  Status,
  GetTimeouts,
  SetTimeouts,
  Go,
  GetCurrentURL,
  Back,
  Forward,
  Refresh,
  GetTitle,
  FindElement,
  FindElements,
  FindElementFromElement,
  FindElementsFromElement,
  IsElementSelected,
  GetElementAttribute,
  GetElementProperty,
  GetElementCSSValue,
  GetElementText,
  GetElementTagName,
  GetElementRect,
  IsElementEnabled,
  ElementClick,
  ElementClear,
  ElementSendKeys,
  WireMoveTo,
  WireButtonDown,
  WireButtonUp,
  GetAlertText,
  AcceptAlert,
  DismissAlert,
  UNKNOWN
}

/**
 * Represents an endpoint in the WebDriver spec. Endpoints are defined by
 * the CommandName enum and the url pattern that they match.
 *
 * For example, the pattern
 *     /session/:sessionId/element/:elementId/click
 * will match urls such as
 *     /session/d9e52b96-9b6a-4cb3-b017-76e8b4236646/element/1c2855ba-213d-4466-ba16-b14a7e6c3699/click
 *
 * @param pattern The url pattern
 * @param method The HTTP method, ie GET, POST, DELETE
 * @param name The CommandName of this endpoint.
 */
class Endpoint {
  constructor(private pattern: string, private method: HttpMethod, public name: CommandName) {}

  /**
   * Tests whether a given url from a request matches this endpoint.
   *
   * @param url A url from a request to test against the endpoint.
   * @param method The HTTP method.
   * @returns {boolean} Whether the endpoint matches.
   */
  matches(url, method) {
    let urlParts = url.split('/');
    let patternParts = this.pattern.split('/');

    if (method != this.method || urlParts.length != patternParts.length) {
      return false;
    }
    // TODO: Replace this naive search with better parsing.
    for (let idx in patternParts) {
      if (!patternParts[idx].startsWith(':') && patternParts[idx] != urlParts[idx]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Given a url from a http request, create an object containing parameters from the URL.
   *
   * Parameters are the parts of the endpoint's pattern that start with ':'. The ':' is dropped
   * from the parameter key.
   *
   * @param url The url from the request.
   * @returns An object mapping parameter keys to values from the url.
   */
  getParams(url) {
    let urlParts = url.split('/');
    let patternParts = this.pattern.split('/');

    let params = {};
    for (let idx in patternParts) {
      if (patternParts[idx].startsWith(':')) {
        let paramName = patternParts[idx].slice(1);
        params[paramName] = urlParts[idx];
      }
    }
    return params;
  }
}

/**
 * An instance of a WebDriver command, containing the params and data for that request.
 *
 * @param commandName The enum identifying the command.
 * @param params Parameters for the command taken from the request's url.
 * @param data Optional data included with the command, taken from the body of the request.
 */
export class WebDriverCommand extends events.EventEmitter {
  private params: {[key: string]: string};
  data: any;
  responseStatus: number;
  responseData: any;

  // All WebDriver commands have a session Id, except for two.
  // NewSession will have a session Id in the data
  // Status just doesn't
  get sessionId(): string {
    return this.getParam('sessionId');
  }

  constructor(
      public commandName: CommandName, public readonly url: string,
      public readonly method: HttpMethod, params?) {
    super();
    this.params = params;
  }

  public getParam(key: paramKey) {
    return this.params[key];
  }

  public handleData(data?: any) {
    try {
      this.data = JSON.parse(data);
    } catch (err) {
      this.data = data;
    }
    this.emit('data');
  }

  public handleResponse(statusCode: number, data?: any) {
    this.responseStatus = statusCode;
    try {
      this.responseData = JSON.parse(data);
    } catch (err) {
      this.responseData = data;
    }
    this.emit('response');
  }
}


/**
 * The set of known endpoints.
 */
let endpoints: Endpoint[] = [];

function addWebDriverCommand(command: CommandName, method: HttpMethod, pattern: string) {
  endpoints.push(new Endpoint(pattern, method, command));
}

/**
 * Returns a new WebdriverCommand object for the resource at the given URL.
 */
export function parseWebDriverCommand(url, method) {
  for (let endpoint of endpoints) {
    if (endpoint.matches(url, method)) {
      let params = endpoint.getParams(url);
      return new WebDriverCommand(endpoint.name, url, method, params);
    }
  }

  return new WebDriverCommand(CommandName.UNKNOWN, url, method, {});
}

let sessionPrefix = '/session/:sessionId';
addWebDriverCommand(CommandName.NewSession, 'POST', '/session');
addWebDriverCommand(CommandName.DeleteSession, 'DELETE', '/session/:sessionId');
addWebDriverCommand(CommandName.Status, 'GET', '/status');
addWebDriverCommand(CommandName.GetTimeouts, 'GET', sessionPrefix + '/timeouts');
addWebDriverCommand(CommandName.SetTimeouts, 'POST', sessionPrefix + '/timeouts');
addWebDriverCommand(CommandName.Go, 'POST', sessionPrefix + '/url');
addWebDriverCommand(CommandName.GetCurrentURL, 'GET', sessionPrefix + '/url');
addWebDriverCommand(CommandName.Back, 'POST', sessionPrefix + '/back');
addWebDriverCommand(CommandName.Forward, 'POST', sessionPrefix + '/forward');
addWebDriverCommand(CommandName.Refresh, 'POST', sessionPrefix + '/refresh');
addWebDriverCommand(CommandName.GetTitle, 'GET', sessionPrefix + '/title');
addWebDriverCommand(CommandName.FindElement, 'POST', sessionPrefix + '/element');
addWebDriverCommand(CommandName.FindElements, 'POST', sessionPrefix + '/elements');
addWebDriverCommand(
    CommandName.FindElementFromElement, 'POST', sessionPrefix + '/element/:elementId/element');
addWebDriverCommand(
    CommandName.FindElementsFromElement, 'POST', sessionPrefix + '/element/:elementId/elements');
addWebDriverCommand(
    CommandName.IsElementSelected, 'POST', sessionPrefix + '/element/:elementId/selected');
addWebDriverCommand(
    CommandName.GetElementAttribute, 'GET',
    sessionPrefix + '/element/:elementId/attribute/:attributeName');
addWebDriverCommand(
    CommandName.GetElementProperty, 'GET',
    sessionPrefix + '/element/:elementId/property/:propertyName');
addWebDriverCommand(
    CommandName.GetElementCSSValue, 'GET',
    sessionPrefix + '/element/:elementId/css/:cssPropertyName');
addWebDriverCommand(CommandName.GetElementText, 'GET', sessionPrefix + '/element/:elementId/text');
addWebDriverCommand(
    CommandName.GetElementTagName, 'GET', sessionPrefix + '/element/:elementId/name');
addWebDriverCommand(CommandName.GetElementRect, 'GET', sessionPrefix + '/element/:elementId/rect');
addWebDriverCommand(CommandName.GetElementRect, 'GET', sessionPrefix + '/element/:elementId/size');
addWebDriverCommand(
    CommandName.IsElementEnabled, 'GET', sessionPrefix + '/element/:elementId/enabled');
addWebDriverCommand(CommandName.ElementClick, 'POST', sessionPrefix + '/element/:elementId/click');
addWebDriverCommand(CommandName.ElementClear, 'POST', sessionPrefix + '/element/:elementId/clear');
addWebDriverCommand(
    CommandName.ElementSendKeys, 'POST', sessionPrefix + '/element/:elementId/value');

addWebDriverCommand(CommandName.GetAlertText, 'GET', sessionPrefix + '/alert_text');
addWebDriverCommand(CommandName.GetAlertText, 'GET', sessionPrefix + '/alert/text');
addWebDriverCommand(CommandName.AcceptAlert, 'POST', sessionPrefix + '/alert/accept');
addWebDriverCommand(CommandName.AcceptAlert, 'POST', sessionPrefix + '/accept_alert');
addWebDriverCommand(CommandName.DismissAlert, 'POST', sessionPrefix + '/alert/dismiss');
addWebDriverCommand(CommandName.DismissAlert, 'POST', sessionPrefix + '/dismiss_alert');

// These commands are part of the JSON protocol, and were replaced by Perform Actions in the W3C
// spec
addWebDriverCommand(CommandName.WireMoveTo, 'POST', sessionPrefix + '/moveto');
addWebDriverCommand(CommandName.WireButtonDown, 'POST', sessionPrefix + '/buttondown');
addWebDriverCommand(CommandName.WireButtonUp, 'POST', sessionPrefix + '/buttonup');
