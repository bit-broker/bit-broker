/**
 * Copyright 2021 Cisco and its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/*
The shared web server module used by bit-broker components. Facilitates
consistency in handling of server logging, cors, headers, tags, errors, etc.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const failure = require('./errors.js');
const express = require('express');
const promBundle = require('express-prom-bundle')
const parser = require('body-parser');
const cors = require('cors');
const logger = require('./logger.js');
const status = require('./status.js')
const locales = require('./locales.js');
const os = require('os');

// --- constants - not deployment configurable

const MAX_POST_SIZE = '100mb'; // see body-parser documentation
const DEFAULT_PORT = 80;
const DEFAULT_PROTOCOL = 'http'; // used only when no request headers are present

// --- running contexts

var log = logger.Logger;
var weblog = logger.WebLog;

// --- server class (exported)

module.exports = class Server {

    // --- generic error handler

    error(res, error) {
        let code = HTTP.INTERNAL_SERVER_ERROR;
        let text = '';

        if (error instanceof failure) {
            code = error.status;
            text = error.details;

        } else if (error instanceof SyntaxError) { // a body-parser error for bad user JSON
            code = HTTP.BAD_REQUEST;
            text = [ failure.response('syntax', error.message) ]; // bad_request always returns an array

        } else { // some other kind of error
            let reason = error.message || error.toString();

            code = HTTP.INTERNAL_SERVER_ERROR;
            text = status.IS_LIVE ? '' : reason; // we *dont* send the internal error text back with the response when in production mode;

            log.error(reason);
            log.error('stack', error.stack || 'no stack trace');
        }

        let response = { error: { code: code, status: HTTP.getReasonPhrase(code), message: text || '' }};
        res.status(code).json(response);
    }

    // --- returns the ip address of the host machince

    ip_address(family = 'IPv4', missing = '<not found>') {
        let nets = os.networkInterfaces();
        let eth0 = (nets.eth0 || nets.en0) || [];
        let ip = eth0.find(i => i.family === family);
        return ip && ip.address ? ip.address : missing;
    }

    // --- constructor

    constructor(name, port, base, announce = true) {

        // --- set class properties

        this.app = express();
        this.router = express.Router();

        this.name = name;
        this.port = port || DEFAULT_PORT;
        this.base = base ? base.replace(/^\/*|\/*$/g, '') : ''; // we store without leading or trailing slashes

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

        // --- the original client route, before load balancers and ingress controllers got in the way

        this.app.use((req, res, next) => {
            let proto = req.header('x-forwarded-scheme') || req.header('x-forwarded-proto') || DEFAULT_PROTOCOL;
            let host = req.header('host');
            let base = this.base.length ? `/${ this.base }` : '';
            req.originalRoute = `${ proto }://${ host }${ base }`;
            next();
        });

        // --- api version management

        if (this.base.length) {
            this.app.use(`/${ this.base }/`, this.router);
        } else {
            this.app.use(this.router);
        }

        // --- global settings

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

        // --- error testing route

        this.router.get('/error/test', (req, res) => {
            throw 'test error message - please ignore'; // used to ensure that development errors are not sent to clients in production
        });

        // --- announce presence on base route

        if (announce) {
            this.router.get('/', (req, res) => {
                res.json({
                    now: new Date().toISOString(),
                    name: this.name,
                    base: req.originalRoute,
                    status: status.IS_LIVE ? 'production' : 'development'
                });
            });
        }
    }

    // --- starts the server

    listen(cb = null) {
        log.info(this.name, 'started');
        this.app.listen(this.port, () => {
            log.info('name', this.name, 'base', this.base ? this.base : '[none]', 'port', this.port, 'ip address', this.ip_address(), 'metrics', status.USE_SERVER_METRICS ? 'on' : 'off');
            if (cb) cb();
        });
    }
}
