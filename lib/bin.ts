#!/usr/bin/env node

import {BlockingProxy} from './blockingproxy';
import {processArgs, printHelp} from './config';

/**
 * Starts up a proxy server which modifies calls between the test process
 * and the selenium server.
 */

const argv = processArgs(process.argv.slice(2));

if (argv.help) {
  printHelp();
  process.exit(0);
}

const proxy = new BlockingProxy(argv.seleniumAddress, argv.rootElement);
proxy.listen(argv.port);
