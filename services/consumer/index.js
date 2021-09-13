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

  The bit-broker consumer server - offering controlled access to the catalog,
  entities and timeseries.

*/

'use strict'; // code assumes ECMAScript 6

// --- load paths - can be overridden with environment variables

const PATH_LIB = process.env.PATH_LIB || '../lib';
const PATH_CFG = process.env.PATH_CFG || '../..';

// --- load configuration - do this first

require('dotenv').config({ path: `${ PATH_CFG }/.env` });
process.env.APP_DATABASE = process.env.APP_DATABASE.replace('CREDENTIALS', process.env.CONSUMER_USER);

// --- dependancies

const Server = require(`${ PATH_LIB }/server.js`);
const controller = require(`${ PATH_LIB }/controller/index.js`);
const log = require(`${ PATH_LIB }/logger.js`).Logger;

// --- running contexts

var api = new Server('bit-broker consumer service', process.env.CONSUMER_BASE);

// --- endpoints

api.router.get ('/catalog', controller.consumer.catalog);
api.router.get ('/entity', controller.consumer.types);
api.router.get ('/entity/:type', controller.consumer.list);
api.router.get ('/entity/:type/:id', controller.consumer.get);
api.router.get ('/entity/:type/:id/timeseries', controller.consumer.timeseries.list);
api.router.get ('/entity/:type/:id/timeseries/:tsid', controller.consumer.timeseries.get);

// --- start the server

api.listen(() => {
    log.info('app mode', process.env.APP_MODE);
});
