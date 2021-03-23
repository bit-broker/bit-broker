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
  consistency in handling of server logging, cors, headers, tags, etc.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const http = require('http-status-codes');
const errors = require('http-errors');
const express = require('express');
const parser = require('body-parser');
const cors = require('cors');
const url = require('url');
const logger = require('./logger.js');
const status = require('./status.js')
const locales = require('./locales.js');

// --- constants - not deployment configurable

const MAX_POST = '100mb'; // see body-parser documentation

// --- running contexts

var log = logger.Logger;
var weblog = logger.WebLog;

// --- server class

module.exports = class Server {

    static KNOWN_ERRORS = [ // add to this as required
        http.BAD_REQUEST,
        http.UNAUTHORIZED,
        http.FORBIDDEN,
        http.NOT_FOUND,
        http.CONFLICT,
        http.INTERNAL_SERVER_ERROR,
        http.NOT_IMPLEMENTED
    ];

    // --- returns the full host info

    host(req) {
        return url.format({
            protocol: req.protocol,
            host: req.get('host'),
            pathname: this.version
        });
    }

    // --- returns the full request url

    url(req) {
        return url.format({
            protocol: req.protocol,
            host: req.get('host'),
            pathname: req.originalUrl
        });
    }

    // --- generic error handler

    error(res, error) {

        if (Server.KNOWN_ERRORS.includes(error.status)) { // object from http-errors - preferred

            res.status(error.status).send(http.getStatusText(error.status) + (error.message ? ': ' + error.message : ''));

        } else if (Server.KNOWN_ERRORS.includes(error)) { // just a bare http response number

            res.status(error).send(http.getStatusText(error));

        } else { // some more complex error object

            let short = error.message || error;
            let full = error.stack || short;
            let shown = status.IS_LIVE ? '' : `Error: ${ short }`; // we *dont* send the internal error text back with the response when in production mode

            if (error instanceof SyntaxError) {
                res.status(http.BAD_REQUEST).send(shown); // can only be a body parser error for bad JSON at this point
            } else {
                res.status(http.INTERNAL_SERVER_ERROR).send(shown);
                log.error(full);
            }
        }
    }

    // --- constructor

    constructor(name, version, announce = true) {

        // --- set class properties

        this.app = express();
        this.router = express.Router();
        this.name = name;
        this.version = version;

        // --- server context

        this.app.use(weblog); // sets up std web logging - do this first
        this.app.use(parser.json({ limit: MAX_POST }));
        this.app.use(cors()); // TODO review CORS settings
        this.app.use(locales.init); // defaults to EN
        this.app.use(`/${ this.version }/`, this.router);
        this.app.options('*', cors()); // enable pre-flight on all routes
        this.app.disable('x-powered-by'); // removes the 'express advert' header value
        this.app.enable('etag'); // use strong etags

        // --- catch all HTTP/404 for unhandled routes

        this.app.use((req, res, next) => {
            this.error(res, http.NOT_FOUND);
        });

        // --- catch all HTTP/500 for uncaught exceptions

        this.app.use((err, req, res, next) => {
            this.error(res, err);
        });

        // --- announce presence on base route

        if (announce) {
            this.router.get('/', (req, res) => {
                res.send([this.name, this.version, new Date().toISOString()].join(' - '));
            });
        }
    }

    // --- starts the server

    listen(port) {
        log.info(`${this.name} started`);
        this.app.listen(port, () => {
            log.info(`${this.name} (version ${this.version}) listening on port ${port}`);
        });
    }
}
