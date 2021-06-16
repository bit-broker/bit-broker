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

  The bit-broker coordinator server - offering services to add, remove and
  update entity types and their associated connectors.

*/

'use strict'; // code assumes ECMAScript 6

// --- load paths - can be overridden with environment variables

const PATH_LIB = process.env.PATH_LIB || '../lib';
const PATH_CFG = process.env.PATH_CFG || '../..';

// --- load configuration - do this first

require('dotenv').config({ path: `${ PATH_CFG }/.env` });
process.env.DATABASE = process.env.DATABASE.replace('CREDENTIALS', process.env.COORDINATOR_USER);

// --- dependancies

const Server = require(`${ PATH_LIB }/server.js`);
const controller = require(`${ PATH_LIB }/controller/index.js`);
const log = require(`${ PATH_LIB }/logger.js`).Logger;

// --- running contexts

var api = new Server(process.env.COORDINATOR_NAME, process.env.COORDINATOR_BASE);

// --- entity endpoints

api.router.get('/entity', controller.entity.list);
api.router.get('/entity/:eid', controller.entity.get);
api.router.post('/entity/:eid', controller.entity.insert);
api.router.put('/entity/:eid', controller.entity.update);
api.router.delete('/entity/:eid', controller.entity.delete);

// --- connector endpoints

api.router.get('/entity/:eid/connector', controller.connector.list);
api.router.get('/entity/:eid/connector/:cid', controller.connector.get);
api.router.post('/entity/:eid/connector/:cid', controller.connector.insert);
api.router.put('/entity/:eid/connector/:cid', controller.connector.update);
api.router.delete('/entity/:eid/connector/:cid', controller.connector.delete);

// --- policy endpoints

api.router.get('/policy', controller.policy.list);
api.router.get('/policy/:pid', controller.policy.get);
api.router.get('/policy/:pid/access_control', controller.policy.get_access_control);
api.router.post('/policy/:pid', controller.policy.insert);
api.router.put('/policy/:pid', controller.policy.update);
api.router.delete('/policy/:pid', controller.policy.delete);

// --- start the server

api.listen(() => {
    log.info('app mode', process.env.APP_MODE);
});
