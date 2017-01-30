import {SimpleWebDriverClient} from './simple_webdriver_client';
import {CommandName, WebDriverCommand} from './webdriver_commands';
import {WebDriverBarrier} from './webdriver_proxy';

const HIGHLIGHT_COMMAND =
    [CommandName.ElementClick, CommandName.ElementSendKeys, CommandName.ElementClear];

let clientScripts = require('./client_scripts/highlight.js');


/**
 * A barrier that delays forwarding WebDriver commands that can affect the app (ie, clicks or
 * sending text) for a fixed amount of time. During the delay, the element that's the target
 * of the command will be highlighted by drawing a transparent div on top of it.
 */
export class HighlightDelayBarrier implements WebDriverBarrier {
  constructor(private client: SimpleWebDriverClient, public delay: number) {}

  private isHighlightCommand(command: WebDriverCommand) {
    return HIGHLIGHT_COMMAND.indexOf(command.commandName) !== -1;
  }

  private highlightData(top, left, width, height) {
    return JSON.stringify({
      script: 'return (' + clientScripts.HIGHLIGHT_FN + ').apply(null, arguments);',
      args: [top, left, width, height]
    });
  }

  private removeHighlightData() {
    return JSON.stringify({
      script: 'return (' + clientScripts.REMOVE_HIGHLIGHT_FN + ').apply(null, arguments);',
      args: []
    });
  }

  // Simple promise-based sleep so we can use async/await
  private sleep(delay: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, delay);
    });
  }

  async onCommand(command: WebDriverCommand) {
    if (!this.isHighlightCommand(command) || !this.delay) {
      return;
    }
    const sessId = command.sessionId;
    const el = command.getParam('elementId');

    // The W3C spec does have a 'getRect', but the standalone server doesn't support it yet.
    const loc = await this.client.getLocation(sessId, el);
    const size = await this.client.getSize(sessId, el);

    // Set the highlight
    await this.client.execute(
        sessId, this.highlightData(loc['y'], loc['x'], size['width'], size['height']));

    // Wait
    await this.sleep(this.delay);

    // Clear the highlight
    await this.client.execute(sessId, this.removeHighlightData());
  }
}
