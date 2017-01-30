#!/usr/bin/env node

import * as minimist from 'minimist';

export interface Config {
  help?: boolean;
  fork?: boolean;
  highlightDelay?: string;
  seleniumAddress?: string;
  logDir?: string;
  port?: number;
}

const opts: minimist.Opts = {
  boolean: ['help', 'fork'],
  string: ['port', 'seleniumAddress', 'highlightDelay', 'logDir'],
  alias: {
    help: ['h'],
    port: ['p'],
    seleniumAddress: ['s'],
  },
  default: {
    port: process.env.BP_PORT || 0,
    seleniumAddress: process.env.BP_SELENIUM_ADDRESS || 'http://localhost:4444/wd/hub',
  }
};

export function processArgs(argv: string[]) {
  return minimist(argv, opts) as Config;
}

export function printHelp() {
  console.log(`
Usage: blocking-proxy <options>

Options:
    --help, -h              Show help.
    --port, -p              The port to listen on. If unset, will choose a random free port.
    --fork                  Start in fork mode. BlockingProxy will use process.send() to communicate
                                with the parent process.
    --selenumAddress, -s    The address of the selenium remote server to proxy.
    --highlightDelay        If specified, will highlight elements before interacting with them and 
                                wait the specified amount of time (in ms) before allowing WebDriver
                                to continue.
    --logDir                If specified, will create a log of WebDriver commands in this directory.
    --rootElement           Element housing ng-app, if not html or body.
`);
}