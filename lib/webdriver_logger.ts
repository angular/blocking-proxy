import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';

import {CommandName, WebDriverCommand} from './webdriver_commands';

// Generate a random 8 character ID to avoid collisions.
function getLogId() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36).slice(0, 8);
}

// Super proprietary left pad implementation. Do not copy plzkthx.
function leftPad(field: string): string {
  const fieldWidth = 6;
  let padding = fieldWidth - field.length;
  if (padding > 0) {
    return ' '.repeat(padding) + field;
  }
  return field;
}


const FINDERS = [
  CommandName.FindElement, CommandName.FindElementFromElement, CommandName.FindElements,
  CommandName.FindElementsFromElement
];
const READERS = [
  CommandName.GetElementTagName, CommandName.GetElementText, CommandName.GetElementAttribute,
  CommandName.GetElementProperty, CommandName.GetElementCSSValue, CommandName.GetElementRect
];
const PAD = '    ';

/**
 * Logs WebDriver commands, transforming the command into a user-friendly description.
 */
export class WebDriverLogger {
  logStream: stream.Writable;
  readonly logName: string;

  constructor() {
    this.logName = `webdriver_log_${getLogId()}.txt`;
  }

  /**
   * Start logging to the specified directory. Will create a file named
   * 'webdriver_log_<process id>.txt'
   *
   * @param logDir The directory to create log files in.
   */
  public setLogDir(logDir: string) {
    this.logStream = fs.createWriteStream(path.join(logDir, this.logName), {flags: 'a'});
  }

  /**
   * Logs a webdriver command to the log file.
   *
   * @param command The command to log.
   */
  public logWebDriverCommand(command: WebDriverCommand) {
    if (!this.logStream) {
      return;
    }

    let logLine: string;
    logLine = `${this.timestamp()} `;

    let started = Date.now();
    command.on('response', () => {
      let done = Date.now();
      let elapsed = leftPad((done - started) + '');
      logLine += `| ${elapsed}ms `;

      if (command.getParam('sessionId')) {
        let session = command.getParam('sessionId').slice(0, 6);
        logLine += `| ${session} `;
      } else if (command.commandName == CommandName.NewSession) {
        // Only for new session commands, the sessionId is in the response.
        let session = command.responseData['sessionId'].slice(0, 6);
        logLine += `| ${session} `;
      }

      if (command.commandName == CommandName.UNKNOWN) {
        logLine += `| ${command.url}`;
      } else {
        logLine += `| ${CommandName[command.commandName]}`;
      }

      if (command.commandName == CommandName.Go) {
        logLine += ' ' + command.data['url'];
      } else if (command.getParam('elementId')) {
        logLine += ` (${command.getParam('elementId')})`;
      }
      logLine += '\n';

      this.logStream.write(logLine);
      this.renderData(command);
      this.renderResponse(command);
    });
  }

  /**
   * Log an arbitrary event to the log file.
   *
   * @param msg The message to log.
   * @param sessionId The session id associated with the event.
   * @param elapsedMs How long the event took, in ms.
   */
  public logEvent(msg: string, sessionId: string, elapsedMs: number) {
    let elapsed = leftPad(elapsedMs.toString());
    let logLine = `${this.timestamp()} | ${elapsed}ms | ${sessionId.slice(0, 6)} | ${msg}\n`;
    this.logStream.write(logLine);
  }

  private renderData(command: WebDriverCommand) {
    let dataLine = '';
    if (command.commandName === CommandName.NewSession) {
      dataLine = JSON.stringify(command.data['desiredCapabilities']);

    } else if (command.commandName === CommandName.ElementSendKeys) {
      let value = command.data['value'].join('');
      dataLine = `Send: ${value}`;

    } else if (FINDERS.indexOf(command.commandName) !== -1) {
      const using = command.data['using'];
      const value = command.data['value'];
      dataLine = `Using ${using} '${value}'`;
    }
    if (dataLine) {
      this.logStream.write(PAD + dataLine + '\n');
    }
  }

  private renderResponse(command: WebDriverCommand) {
    let respLine = '';
    if (command.responseStatus != 200) {
      respLine = `ERROR: ${command.responseData['state']}`;
    } else if (FINDERS.indexOf(command.commandName) !== -1) {
      let els = command.responseData['value'];
      if (!Array.isArray(els)) {
        els = [els];
      }
      els = els.map((e) => e['ELEMENT']);
      respLine = 'Elements: ' + els;
    } else if (READERS.indexOf(command.commandName) !== -1) {
      respLine = command.responseData['value'];
      if (typeof respLine == 'object') {
        respLine = JSON.stringify(respLine);
      }
    }
    if (respLine) {
      this.logStream.write(PAD + respLine + '\n');
    }
  }

  timestamp(): string {
    let d = new Date();
    let hours = d.getHours() < 10 ? '0' + d.getHours() : d.getHours();
    let minutes = d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes();
    let seconds = d.getSeconds() < 10 ? '0' + d.getSeconds() : d.getSeconds();
    let millis = d.getMilliseconds().toString();
    millis = '000'.slice(0, 3 - millis.length) + millis;
    return `${hours}:${minutes}:${seconds}.${millis}`;
  }
}
