/*

  Copyright (c) 2021 Cisco and/or its affiliates.

  Licensed under the Apache License, Version 2.0 (the "License"); you may not
  use this file except in compliance with the License. You may obtain a copy of
  the License at:

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,WITHOUT
  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
  License for the specific language governing permissions and limitations
  under the License.

  ----------------------------------------------------------------------------

  The shared logging module used by bit-broker components. Facilitates
  consistency in log line presentation, folder and file naming and file
  rotation handling.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const winston = require('winston');
const rotate = require('winston-daily-rotate-file');
const winexp = require('express-winston');
const status = require('./status.js')

// --- constants - not deployment configurable

const LOG_DIR = 'logs'; // without trailing slash
const SEPARATOR = ' | ';

// --- custom output formatter for 'stdout' and 'stderr'

const formatter = {
    transform(info) {
        let args = info[Symbol.for('splat')] || [];

        args.unshift(info['message']); // order of unshifting is important
        args.unshift(info[Symbol.for('level')]);
        args.unshift(info['timestamp']);
        args = args.map(item => (item === Object(item) ? JSON.stringify(item) : item)); // json stringify the objects

        info[Symbol.for('message')] = args.join(SEPARATOR);

        return info;
    }
};

// --- setup formatters

const fmtout = winston.format.combine(winston.format.timestamp(), formatter);
const fmtweb = winston.format.combine(winston.format.timestamp(), winston.format.json());

// --- setup transports - see winston-daily-rotate-file documentation for default settings like max files and max file sizes

const stdout = new winston.transports.DailyRotateFile({ filename: `${ LOG_DIR }/out-%DATE%.log`, level: 'info' });
const stderr = new winston.transports.DailyRotateFile({ filename: `${ LOG_DIR }/err-%DATE%.log`, level: 'error' });
const stdweb = new winston.transports.DailyRotateFile({ filename: `${ LOG_DIR }/web-%DATE%.log` });

// --- make the loggers

const logger = winston.createLogger({
    level: 'info',
    transports: [stdout, stderr],
    format: fmtout
});

const weblog = winexp.logger({
    meta: true,
    transports: [stdweb],
    format: fmtweb,
    msg: 'HTTP {{req.method}} {{req.url}}'
});

// --- development only - add logging to the console too

if (status.IS_LIVE != true) {
    logger.add(new winston.transports.Console());
    logger.level = 'debug';
}

// --- exports

module.exports = {
    Logger: logger,
    WebLog: weblog
};
