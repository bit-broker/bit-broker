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

  The bit-broker register server, offering services to manipulate the entity
  register.

*/

'use strict'; // code assumes ECMAScript 6

// --- load paths

const PATH_UTILS = process.env.PATH_UTILS || '../utils/';
const PATH_CONFIG = process.env.PATH_CONFIG || '..';

// --- load configuration

require('dotenv').config({ path: `${ PATH_CONFIG }/.env` });

// --- dependancies

const Server = require(`${ PATH_UTILS }/server.js`);
const Model = require(`${ PATH_UTILS }/model.js`);
const View = require(`${ PATH_UTILS }/view.js`);
const logger = require(`${ PATH_UTILS }/logger.js`);
const http = require('http-status-codes');
const failure = require('http-errors');

// --- running contexts

var rest = new Server(process.env.REGISTER_SERVER_NAME, process.env.REGISTER_SERVER_VERSION);
var model = new Model();
var view = new View();
var log = logger.Logger;

// --- lists all entity type names in the register

rest.router.get('/register', (req, res) => {

    model.entities()

    .then((items) => {
        res.json(view.entities(items));
    })

    .catch((error) => {
        rest.error(res, error);
    });
});

// --- a test error endpoint - TODO obs remove after the initial test :)

rest.router.get('/error/:msg', (req, res) => {

    throw failure(http.NOT_IMPLEMENTED, `Failed with "${ req.params.msg }"`);

});

// --- a test error endpoint - TODO obs remove after the initial test :)

rest.router.get('/crash/:msg', (req, res) => {

    throw `Crashed with "${ req.params.msg }"`;

});

// --- main entry point

rest.listen(process.argv.length > 2 ? process.argv[2] : process.env.REGISTER_SERVER_PORT);
