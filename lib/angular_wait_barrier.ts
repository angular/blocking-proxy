import {SimpleWebDriverClient} from './simple_webdriver_client';
import {WebDriverCommand} from './webdriver_commands';
import {WebDriverLogger} from './webdriver_logger';
import {WebDriverBarrier} from './webdriver_proxy';

const angularWaits = require('./client_scripts/wait.js');

/**
 * A barrier that uses Angular's Testability API to block commands until the application is stable.
 */
export class AngularWaitBarrier implements WebDriverBarrier {
  // The ng-app root to use when waiting on the client.
  rootSelector: string;
  enabled: boolean;
  logger: WebDriverLogger;

  constructor(private client: SimpleWebDriverClient) {
    this.enabled = true;
    this.rootSelector = '';
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
  setRootSelector(selector: string) {
    this.rootSelector = selector;
  }

  private waitForAngularData() {
    return JSON.stringify({
      script: 'return (' + angularWaits.NG_WAIT_FN + ').apply(null, arguments);',
      args: [this.rootSelector]
    });
  }

  /**
   * Turn on WebDriver logging.
   *
   * @param logDir The directory to create logs in.
   */
  enableLogging(logDir: string) {
    if (!this.logger) {
      this.logger = new WebDriverLogger();
    }
    this.logger.setLogDir(logDir);
  }

  /**
   * Override the logger instance. Only used for testing.
   */
  setLogger(logger: WebDriverLogger) {
    this.logger = logger;
  }

  private sendRequestToStabilize(command: WebDriverCommand): Promise<void> {
    return this.client.executeAsync(command.sessionId, this.waitForAngularData()).then((value) => {
      // waitForAngular only returns a value if there was an error
      // in the browser.
      if (value) {
        throw new Error('Error from waitForAngular: ' + value);
      }
    });
  }

  private shouldStabilize(command: WebDriverCommand) {
    const url = command.url;
    if (!this.enabled) {
      return false;
    }

    // TODO - should this implement some state, and be smart about whether
    // stabilization is necessary or not? Would that be as simple as GET/POST?
    // e.g. two gets in a row don't require a wait btwn.
    //
    // See https://code.google.com/p/selenium/wiki/JsonWireProtocol for
    // descriptions of the paths.
    // We shouldn't stabilize if we haven't loaded the page yet.
    const parts = url.split('/');
    if (parts.length < 4) {
      return false;
    }

    const commandsToWaitFor = [
      'executeScript', 'screenshot', 'source', 'title', 'element', 'elements', 'execute', 'keys',
      'moveto', 'click', 'buttondown', 'buttonup', 'doubleclick', 'touch', 'get'
    ];

    if (commandsToWaitFor.indexOf(parts[3]) != -1) {
      return true;
    }
    return false;
  }

  onCommand(command: WebDriverCommand): Promise<void> {
    if (this.logger) {
      command.on('data', () => {
        this.logger.logWebDriverCommand(command);
      });
    }

    if (this.shouldStabilize(command)) {
      const started = Date.now();
      return this.sendRequestToStabilize(command).then(() => {
        const ended = Date.now();
        if (this.logger) {
          this.logger.logEvent('Waiting for Angular', command.sessionId, (ended - started));
        }
      });
    }
    return Promise.resolve(null);
  }
}
