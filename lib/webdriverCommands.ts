/**
 * Utilities for parsing WebDriver commands from HTTP Requests.
 */

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
export class WebDriverCommand {
  private params: {[key: string]: string};

  constructor(public commandName: CommandName, params?, public data?: any) {
    this.params = params;
  }

  public getParam(key: paramKey) {
    return this.params[key];
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
export function parseWebDriverCommand(url, method, data: string) {
  let parsedData = {};
  if (data) {
    parsedData = JSON.parse(data);
  }

  for (let endpoint of endpoints) {
    if (endpoint.matches(url, method)) {
      let params = endpoint.getParams(url);
      return new WebDriverCommand(endpoint.name, params, parsedData);
    }
  }

  return new WebDriverCommand(CommandName.UNKNOWN, {}, {'url': url});
}

let sessionPrefix = '/session/:sessionId';
addWebDriverCommand(CommandName.NewSession, 'POST', '/session');
addWebDriverCommand(CommandName.DeleteSession, 'DELETE', '/session/:sessionId');
addWebDriverCommand(CommandName.Status, 'GET', sessionPrefix + '/status');
addWebDriverCommand(CommandName.GetTimeouts, 'GET', sessionPrefix + '/timeouts');
addWebDriverCommand(CommandName.SetTimeouts, 'POST', sessionPrefix + '/timeouts');
addWebDriverCommand(CommandName.Go, 'POST', sessionPrefix + '/url');
addWebDriverCommand(CommandName.GetCurrentURL, 'GET', sessionPrefix + '/url');
