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

  The shared web server module used by bit-broker components. Facilitates
  consistency in handling of server logging, cors, headers, tags, errors, etc.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const failure = require('http-errors');
const express = require('express');
const promBundle = require('express-prom-bundle')
const parser = require('body-parser');
const cors = require('cors');
const logger = require('./logger.js');
const status = require('./status.js')
const locales = require('./locales.js');
const url = require('url');
const os = require('os');

// --- constants - not deployment configurable

const MAX_POST_SIZE = '100mb'; // see body-parser documentation
const DEFAULT_PORT = 80;

// --- running contexts

var log = logger.Logger;
var weblog = logger.WebLog;

// --- server class (exported)

module.exports = class Server {

    // --- generic error handler

    error(res, error) {
        if (error instanceof failure.HttpError) { // an http-error object
            res.status(error.status).send(error.message || '');

        } else if (error instanceof SyntaxError) { // a body-parser error for bad user JSON
            res.status(HTTP.BAD_REQUEST).send(error.message || '');

        } else { // some other kind of error
            let text = error.message || error.toString();
            let show = status.IS_LIVE ? '' : text; // we *dont* send the internal error text back with the response when in production mode

            res.status(HTTP.INTERNAL_SERVER_ERROR).send(show);
            log.error(text);
            log.error(error.stack || 'no stack trace');
        }
    }

    // --- returns the ip address of the host machince

    ip_address(family = 'IPv4', missing = '<not found>') {
        let nets = os.networkInterfaces();
        let eth0 = (nets.eth0 || nets.en0) || [];
        let ip = eth0.find(i => i.family === family);
        return ip && ip.address ? ip.address : missing;
    }

    // --- constructor

    constructor(name, base, announce = true) {

        // --- set class properties

        this.app = express();
        this.router = express.Router();

        let parts = url.parse(base);
        this.name = name;
        this.base = base.replace(/\/$/g, ''); // we store without trailing slashes
        this.port = parts.port || DEFAULT_PORT;
        this.version = parts.path.replace(/^\/|\/$/g, ''); // strips all slashes

        // --- server logging

        if (status.USE_SERVER_LOGGING) {
            this.app.use(weblog); // sets up std web logging - do this first
        }

        // --- server context

        this.app.use(parser.json({ limit: MAX_POST_SIZE }));
        this.app.use(cors()); // TODO review CORS settings
        this.app.use(locales.init); // defaults to EN

        // --- setup metrics if enabled

        if (status.USE_SERVER_METRICS) {
            const metricsMiddleware = promBundle({ includeMethod: true })
            this.app.use(metricsMiddleware)
        }

        if (this.version.length) {
            this.app.use(`/${ this.version }/`, this.router);
        }

        this.app.options('*', cors()); // enable pre-flight on all routes
        this.app.disable('x-powered-by'); // removes the 'express advert' header value
        this.app.enable('etag'); // use strong etags

        // --- catch all HTTP/404 for unhandled routes

        this.app.use((req, res, next) => {
            throw new failure(HTTP.NOT_FOUND);
        });

        // --- catch all HTTP/500 for uncaught exceptions

        this.app.use((err, req, res, next) => {
            this.error(res, err);
        });

        // --- announce presence on base route

        if (announce) {
            this.router.get('/', (req, res) => {
                res.json({
                    now: new Date().toISOString(),
                    name: this.name,
                    version: this.version,
                    status: status.IS_LIVE ? 'production' : 'development'
                });
            });
        }
    }

    // --- starts the server

    listen(cb = null) {
        log.info(this.name, 'started');
        this.app.listen(this.port, () => {
            log.info('name', this.name, 'base', this.base, 'version', this.version, 'port', this.port, 'ip address', this.ip_address(), 'metrics', status.USE_SERVER_METRICS ? 'on' : 'off');
            if (cb) cb();
        });
    }
}
